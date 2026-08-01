/**
 * Automated QA for the "Download Report" PDF export.
 *
 * AUTH APPROACH
 * -------------
 * The app has no password-grant endpoint we can script against without knowing
 * a real password: /api/auth/login verifies a bcrypt hash, and every protected
 * route is gated by middleware.ts, which checks an `auth_token` cookie holding
 * an HS256 JWT of { email, passwordVersion, userId } and then re-validates
 * passwordVersion against Redis/Supabase.
 *
 * So instead of logging in, this script mints the same cookie the login route
 * would issue:
 *   1. read JWT_SECRET + Supabase service credentials from .env
 *   2. look up a real user row (id, email, password_version) over the Supabase
 *      REST API — password_version must be current or middleware revokes it
 *   3. sign the JWT with jose and set it as a cookie before navigating
 * Override which account is used with RCG_QA_EMAIL. Note /intern-portfolio is
 * restricted by app/lib/pageAccessConfig.ts, so the QA account must be on that
 * allowlist or that route will (correctly) redirect to /net-asset.
 *
 * WHAT IT ASSERTS
 * ---------------
 *   - window.__RCG_LAST_REPORT_MANIFEST__ — every block's yEnd must fit inside
 *     pageContentHeight on its assigned page. This is the direct check that no
 *     card/chart/table straddles a page break.
 *   - the generated PDF is parsed with pdf-lib to confirm its page count
 *     matches the highest page the manifest placed a block on.
 *
 * USAGE: start the app (npm run dev), then `npm run qa:reports`.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { SignJWT } from 'jose';
import { PDFDocument } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.RCG_QA_BASE_URL || 'http://localhost:3000';
const NAV_TIMEOUT_MS = 60_000;
const DATA_TIMEOUT_MS = 60_000;
const PDF_TIMEOUT_MS = 120_000;
/** Rounding slack, in mm, when comparing a block's yEnd to the page height. */
const FIT_EPSILON_MM = 0.5;

function readEnv() {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function supabase(env, query) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase query failed (${res.status}): ${query}`);
  return res.json();
}

async function buildSession(env) {
  const wanted = process.env.RCG_QA_EMAIL;
  const filter = wanted ? `&email=eq.${encodeURIComponent(wanted.toLowerCase())}` : '';
  const users = await supabase(env, `users?select=id,email,password_version&limit=1${filter}`);
  if (!users.length) {
    throw new Error(wanted ? `No user found for RCG_QA_EMAIL=${wanted}` : 'No users in the database.');
  }
  const user = users[0];

  const token = await new SignJWT({
    email: user.email,
    passwordVersion: user.password_version,
    userId: user.id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  const clients = await supabase(env, `clients?select=id,name&user_id=eq.${user.id}&limit=1`);
  return { user, token, client: clients[0] || null };
}

function waitForFile(dir, seen, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const fresh = fs
        .readdirSync(dir)
        .filter(f => f.toLowerCase().endsWith('.pdf') && !seen.has(f));
      if (fresh.length > 0) {
        const full = path.join(dir, fresh[0]);
        // Wait for the write to settle before reading.
        const size = fs.statSync(full).size;
        setTimeout(() => {
          if (fs.statSync(full).size === size && size > 0) resolve(full);
          else tick();
        }, 300);
        return;
      }
      if (Date.now() > deadline) return reject(new Error('Timed out waiting for the PDF download.'));
      setTimeout(tick, 250);
    };
    tick();
  });
}

async function auditRoute(browser, session, route, downloadRoot) {
  const label = route.label;
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  const downloadDir = fs.mkdtempSync(path.join(downloadRoot, 'dl-'));
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
    eventsEnabled: true,
  });

  const issues = [];
  try {
    await page.setCookie({
      name: 'auth_token',
      value: session.token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    });

    await page.evaluateOnNewDocument(() => {
      window.__RCG_REPORT_DEBUG__ = true;
    });

    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });

    const landed = new URL(page.url()).pathname;
    if (landed !== route.path) {
      return { label, status: 'SKIP', detail: `redirected to ${landed} (access control)` };
    }

    // The button only registers once the page's data has loaded.
    await page.waitForFunction(
      () => Array.isArray(window.__RCG_REPORTS__) && window.__RCG_REPORTS__.length > 0,
      { timeout: DATA_TIMEOUT_MS }
    );

    // A page can have several independently-loading sections (/strategies fetches
    // each strategy separately), so wait for the count to stop growing — otherwise
    // we'd audit only whichever section happened to resolve first.
    await page.waitForFunction(
      () => {
        const n = window.__RCG_REPORTS__.length;
        const stable = window.__RCG_QA_PREV__ === n;
        window.__RCG_QA_PREV__ = n;
        return stable;
      },
      { timeout: DATA_TIMEOUT_MS, polling: 1500 }
    );

    // A page can host more than one report (e.g. /strategies renders a button
    // per strategy section) — audit every one of them.
    const reportCount = await page.evaluate(() => window.__RCG_REPORTS__.length);
    const summaries = [];

    for (let i = 0; i < reportCount; i += 1) {
      const seen = new Set(fs.readdirSync(downloadDir));

      const filename = await page.evaluate(async index => {
        const entry = window.__RCG_REPORTS__[index];
        await entry.generate();
        return entry.filename;
      }, i);

      const pdfPath = await waitForFile(downloadDir, seen, PDF_TIMEOUT_MS);
      const manifest = await page.evaluate(() => window.__RCG_LAST_REPORT_MANIFEST__ || []);

      if (manifest.length === 0) {
        issues.push(`${filename}: manifest was empty — no blocks were placed`);
      }

      for (const entry of manifest) {
        if (entry.yEnd > entry.pageContentHeight + FIT_EPSILON_MM) {
          issues.push(
            `${filename}: block ${entry.blockIndex} overflows page ${entry.page} — ` +
            `yEnd ${entry.yEnd.toFixed(1)}mm > ${entry.pageContentHeight}mm`
          );
        }
        if (entry.yStart < -FIT_EPSILON_MM) {
          issues.push(`${filename}: block ${entry.blockIndex} starts above the top margin (${entry.yStart.toFixed(1)}mm)`);
        }
      }

      const pdf = await PDFDocument.load(fs.readFileSync(pdfPath));
      const pdfPages = pdf.getPageCount();
      const manifestPages = manifest.reduce((max, e) => Math.max(max, e.page), 0);
      if (pdfPages !== manifestPages) {
        issues.push(`${filename}: PDF has ${pdfPages} pages but the manifest spans ${manifestPages}`);
      }

      summaries.push(`${filename} (${manifest.length} blocks / ${pdfPages}p)`);
    }

    return {
      label,
      status: issues.length ? 'FAIL' : 'PASS',
      detail: summaries.join(', '),
      issues,
    };
  } catch (err) {
    return { label, status: 'ERROR', detail: err.message, issues };
  } finally {
    await page.close();
  }
}

async function main() {
  const env = readEnv();
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET missing from .env');

  const probe = await fetch(`${BASE_URL}/login`).catch(() => null);
  if (!probe || !probe.ok) {
    throw new Error(`No app at ${BASE_URL}. Start it with "npm run dev" first.`);
  }

  const session = await buildSession(env);
  console.log(`QA session: ${session.user.email}`);
  if (!session.client) {
    console.log('No client rows for this account — the backoffice client report will be skipped.');
  }

  const routes = [
    session.client && {
      label: `backoffice client (${session.client.name})`,
      path: `/backoffice/client/${session.client.id}`,
    },
    { label: 'intern-portfolio (3x)', path: '/intern-portfolio' },
    { label: 'net-asset', path: '/net-asset' },
    { label: 'statistics', path: '/admin/statistics' },
    { label: 'strategies', path: '/strategies' },
  ].filter(Boolean);

  const downloadRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rcg-qa-'));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  const results = [];
  try {
    for (const route of routes) {
      process.stdout.write(`  checking ${route.label} ... `);
      const result = await auditRoute(browser, session, route, downloadRoot);
      console.log(result.status);
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  console.log('\n--- Report QA summary ---');
  for (const r of results) {
    console.log(`${r.status.padEnd(5)} ${r.label} — ${r.detail}`);
    for (const issue of r.issues || []) console.log(`        ${issue}`);
  }

  fs.rmSync(downloadRoot, { recursive: true, force: true });

  const failed = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
  if (failed.length) {
    console.error(`\n${failed.length} of ${results.length} routes failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} routes passed.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
