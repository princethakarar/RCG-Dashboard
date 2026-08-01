/**
 * Report capture + pagination engine.
 *
 * Replaces the previous html2pdf.js `pagebreak` reliance. html2pdf's legacy
 * mode only tries to protect an element when it overflows by <= 1 page, and it
 * does so by inserting a spacer <div> before it — which becomes an extra grid
 * cell (not vertical space) when the element is a CSS grid item, so KPI cards
 * were sliced anyway. Here we drive html2canvas + jsPDF directly and place one
 * captured canvas per block, so a block is never cut.
 *
 * Layout is preserved by keeping each block's position/width relative to the
 * report root: blocks that sit side by side on screen (grid rows) are grouped
 * into a "band" and placed together, so a 2-up KPI row still reads as a 2-up
 * row in the PDF rather than two full-width images.
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2; // 190
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2; // 277

/** A4 usable content width in CSS px (~718px) — see forceReportWidth below. */
export const A4_CONTENT_WIDTH_PX = Math.round(CONTENT_WIDTH_MM * (96 / 25.4));

/** Recharts needs a beat to re-measure after the width change. */
const RESIZE_SETTLE_MS = 500;

/** Cap on waiting for a single image; a stalled asset must not block export. */
const IMAGE_WAIT_MS = 5000;

/** A block taller than a page is scaled to fit, but never below this. */
const MIN_BLOCK_SCALE = 0.5;

/** Sub-pixel slack when deciding whether two blocks share a row. */
const OVERLAP_EPSILON_PX = 2;

export const BLOCK_SELECTOR = '[data-report-block]';

export interface ReportManifestEntry {
  blockIndex: number;
  page: number;
  yStart: number;
  yEnd: number;
  pageContentHeight: number;
}

declare global {
  interface Window {
    __RCG_REPORT_DEBUG__?: boolean;
    __RCG_LAST_REPORT_MANIFEST__?: ReportManifestEntry[];
  }
}

interface BlockGeometry {
  el: HTMLElement;
  index: number;
  /** px, relative to the report root */
  top: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
  keepWithNext: boolean;
  isTable: boolean;
}

interface Band {
  blocks: BlockGeometry[];
  top: number;
  bottom: number;
}

/**
 * Blocks nested inside another block are ignored — only the outermost
 * self-contained unit is captured, so content is never emitted twice.
 */
function collectBlocks(root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  return all.filter(el => !all.some(other => other !== el && other.contains(el)));
}

function measure(root: HTMLElement, blocks: HTMLElement[]): BlockGeometry[] {
  const rootRect = root.getBoundingClientRect();
  return blocks.map((el, index) => {
    const rect = el.getBoundingClientRect();
    return {
      el,
      index,
      top: rect.top - rootRect.top,
      bottom: rect.bottom - rootRect.top,
      left: rect.left - rootRect.left,
      width: rect.width,
      height: rect.height,
      keepWithNext: el.dataset.reportKeepWithNext === 'true',
      isTable: el.dataset.reportTable === 'true',
    };
  }).filter(b => b.width > 0 && b.height > 0);
}

/**
 * Group blocks that overlap vertically (grid rows) into bands. A band is the
 * unit of pagination: it moves to the next page as a whole, which is what
 * keeps an individual card from being cut. `data-report-keep-with-next` glues
 * a heading to the block that follows it.
 */
function buildBands(blocks: BlockGeometry[]): Band[] {
  const bands: Band[] = [];
  let current: Band | null = null;
  let glueToNext = false;

  for (const block of blocks) {
    const overlaps = current !== null && block.top < current.bottom - OVERLAP_EPSILON_PX;

    if (current && (overlaps || glueToNext)) {
      current.blocks.push(block);
      current.top = Math.min(current.top, block.top);
      current.bottom = Math.max(current.bottom, block.bottom);
    } else {
      current = { blocks: [block], top: block.top, bottom: block.bottom };
      bands.push(current);
    }

    glueToNext = block.keepWithNext;
  }

  return bands;
}

type Jspdf = import('jspdf').jsPDF;

/**
 * Resolves once every image in the report has decoded.
 *
 * The branding header's logo is `display: none` until `.pdf-mode` reveals it,
 * so it can still be in flight when the settle timer expires — html2canvas
 * would then rasterise a blank or partial image. This is a no-op when the
 * images are already loaded, and it never blocks on a broken asset.
 */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(images.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    const settled = img.decode().catch(() => new Promise<void>(resolve => {
      // decode() rejects on some cross-origin/broken cases where the element
      // still fires load/error — fall back to those before giving up.
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    }));

    const timeout = new Promise<void>(resolve => setTimeout(resolve, IMAGE_WAIT_MS));
    return Promise.race([settled, timeout]);
  }));
}

async function capture(el: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;
  return html2canvas(el, { scale: 2, useCORS: true });
}

function toImage(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.98);
}

/**
 * Slices a captured table canvas at row boundaries. This is the one block
 * allowed to span pages — it may break between rows, never through one, and
 * the header row always ships with the first data row.
 */
function sliceTableAtRows(
  el: HTMLElement,
  canvas: HTMLCanvasElement,
  maxChunkCssPx: number
): { canvas: HTMLCanvasElement; cssHeight: number }[] {
  const elRect = el.getBoundingClientRect();
  const canvasPxPerCssPx = canvas.height / elRect.height;
  const rows = Array.from(el.querySelectorAll<HTMLElement>('tr'));

  // Boundaries (in CSS px from the block's top) we're allowed to cut at.
  const cuts: number[] = [];
  let firstBodyRowSeen = false;
  for (const row of rows) {
    const isHeaderRow = !!row.closest('thead');
    const bottom = row.getBoundingClientRect().bottom - elRect.top;
    // Never cut inside the header, nor between the header and its first row.
    if (isHeaderRow) continue;
    if (!firstBodyRowSeen) {
      firstBodyRowSeen = true;
    }
    cuts.push(bottom);
  }
  cuts.push(elRect.height);

  const chunks: { start: number; end: number }[] = [];
  let start = 0;
  while (start < elRect.height - 1) {
    const limit = start + maxChunkCssPx;
    // Largest row boundary that still fits in one page.
    const fitting = cuts.filter(c => c > start && c <= limit);
    let end: number;
    if (fitting.length > 0) {
      end = fitting[fitting.length - 1];
    } else {
      // A single row taller than a page — emit it whole rather than cutting it.
      const next = cuts.find(c => c > start);
      end = next === undefined ? elRect.height : next;
    }
    chunks.push({ start, end });
    start = end;
  }

  return chunks.map(({ start: s, end: e }) => {
    const sliceCanvas = document.createElement('canvas');
    const sy = Math.round(s * canvasPxPerCssPx);
    const sh = Math.round((e - s) * canvasPxPerCssPx);
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sh;
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
    }
    return { canvas: sliceCanvas, cssHeight: e - s };
  });
}

/**
 * Captures `root` and saves it as a paginated A4 PDF.
 *
 * The caller is responsible for nothing beyond passing the report root — the
 * `.pdf-mode` class, the A4 width lock and the Recharts settle are handled
 * here so every page gets identical treatment.
 */
export async function generateReport(root: HTMLElement, filename: string): Promise<void> {
  const debug = typeof window !== 'undefined' && window.__RCG_REPORT_DEBUG__ === true;
  const manifest: ReportManifestEntry[] = [];

  root.classList.add('pdf-mode');

  // html2canvas renders the element at the width it currently occupies, but the
  // PDF page is only ~718px wide. Recharts' ResponsiveContainer bakes its
  // measured pixel width into inline styles, so we lock the root to the PDF's
  // content width first and let it re-measure before capturing.
  const originalWidth = root.style.width;
  const originalMaxWidth = root.style.maxWidth;
  root.style.width = `${A4_CONTENT_WIDTH_PX}px`;
  root.style.maxWidth = `${A4_CONTENT_WIDTH_PX}px`;

  await new Promise(resolve => setTimeout(resolve, RESIZE_SETTLE_MS));
  await waitForImages(root);

  try {
    const { jsPDF } = await import('jspdf');
    const pdf: Jspdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const blocks = measure(root, collectBlocks(root));
    if (blocks.length === 0) {
      throw new Error('Nothing to export: no [data-report-block] elements found.');
    }

    const rootWidthPx = root.getBoundingClientRect().width;
    const mmPerPx = CONTENT_WIDTH_MM / rootWidthPx;
    const bands = buildBands(blocks);

    let page = 1;
    let cursorMm = 0;
    let prevBandBottomPx: number | null = null;

    const record = (block: BlockGeometry, yStart: number, height: number) => {
      if (!debug) return;
      manifest.push({
        blockIndex: block.index,
        page,
        yStart: Number(yStart.toFixed(3)),
        yEnd: Number((yStart + height).toFixed(3)),
        pageContentHeight: CONTENT_HEIGHT_MM,
      });
    };

    const placeBand = (band: Band, scale: number, xOffsetMm: number, canvases: HTMLCanvasElement[]) => {
      band.blocks.forEach((block, i) => {
        const xMm = MARGIN_MM + xOffsetMm + block.left * mmPerPx * scale;
        const yStartMm = cursorMm + (block.top - band.top) * mmPerPx * scale;
        const wMm = block.width * mmPerPx * scale;
        const hMm = block.height * mmPerPx * scale;
        pdf.addImage(toImage(canvases[i]), 'JPEG', xMm, MARGIN_MM + yStartMm, wMm, hMm);
        record(block, yStartMm, hMm);
      });
    };

    for (const band of bands) {
      const bandHeightMm = (band.bottom - band.top) * mmPerPx;
      const gapMm = prevBandBottomPx === null
        ? 0
        : Math.max(0, (band.top - prevBandBottomPx) * mmPerPx);

      const canvases = await Promise.all(band.blocks.map(b => capture(b.el)));

      if (cursorMm + gapMm + bandHeightMm <= CONTENT_HEIGHT_MM) {
        // Fits on the current page.
        cursorMm += gapMm;
        placeBand(band, 1, 0, canvases);
        cursorMm += bandHeightMm;
      } else if (bandHeightMm <= CONTENT_HEIGHT_MM) {
        // Doesn't fit here but fits on a fresh page — move the whole band.
        pdf.addPage();
        page += 1;
        cursorMm = 0;
        placeBand(band, 1, 0, canvases);
        cursorMm = bandHeightMm;
      } else if (band.blocks.length === 1 && band.blocks[0].isTable) {
        // The one block allowed to span pages: split it at row boundaries.
        const block = band.blocks[0];
        const maxChunkCssPx = CONTENT_HEIGHT_MM / mmPerPx;
        const slices = sliceTableAtRows(block.el, canvases[0], maxChunkCssPx);

        for (const slice of slices) {
          const sliceHeightMm = Math.min(slice.cssHeight * mmPerPx, CONTENT_HEIGHT_MM);
          if (cursorMm > 0 && cursorMm + gapMm + sliceHeightMm > CONTENT_HEIGHT_MM) {
            pdf.addPage();
            page += 1;
            cursorMm = 0;
          } else if (cursorMm > 0) {
            cursorMm += gapMm;
          }
          const xMm = MARGIN_MM + block.left * mmPerPx;
          const wMm = block.width * mmPerPx;
          pdf.addImage(toImage(slice.canvas), 'JPEG', xMm, MARGIN_MM + cursorMm, wMm, sliceHeightMm);
          record(block, cursorMm, sliceHeightMm);
          cursorMm += sliceHeightMm;
        }
      } else {
        // Taller than a full page: scale down (never below MIN_BLOCK_SCALE),
        // centre it and give it a page of its own rather than slicing it.
        const scale = Math.max(MIN_BLOCK_SCALE, CONTENT_HEIGHT_MM / bandHeightMm);
        const xOffsetMm = (CONTENT_WIDTH_MM - CONTENT_WIDTH_MM * scale) / 2;
        if (cursorMm > 0) {
          pdf.addPage();
          page += 1;
        }
        cursorMm = 0;
        placeBand(band, scale, xOffsetMm, canvases);
        cursorMm = Math.min(bandHeightMm * scale, CONTENT_HEIGHT_MM);
      }

      prevBandBottomPx = band.bottom;
    }

    if (debug && typeof window !== 'undefined') {
      window.__RCG_LAST_REPORT_MANIFEST__ = manifest;
    }

    pdf.save(filename);
  } finally {
    root.classList.remove('pdf-mode');
    root.style.width = originalWidth;
    root.style.maxWidth = originalMaxWidth;
  }
}
