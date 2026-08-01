/**
 * Report filenames follow the convention the client report already used:
 * the page's own displayed title, spaces to underscores, suffixed `_Report.pdf`.
 *
 *   "Prince Thakarar" -> Prince_Thakarar_Report.pdf   (unchanged)
 *   "Net Asset"       -> Net_Asset_Report.pdf
 *   "Statistics"      -> Statistics_Report.pdf
 */
export function toReportFilename(title: string): string {
  const base = (title || 'Report').trim().replace(/\s+/g, '_');
  return `${base}_Report.pdf`;
}
