/**
 * Data Isolation Test Script (Node.js)
 *
 * Run: node scripts/test-isolation.mjs
 *
 * Tests that User A and User B cannot see each other's data.
 * Modify the variables below to match your setup.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = process.env.TEST_PASSWORD || 'RCG@2030';
const USER_A = process.env.USER_A || 'alice@test.com';
const USER_B = process.env.USER_B || 'bob@test.com';

let passCount = 0;
let failCount = 0;

async function login(email) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
    redirect: 'manual',
  });
  const body = await res.json();
  // Extract set-cookie header
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie || !body.success) {
    console.error(`  FAIL: Login failed for ${email}: ${body.error || 'no cookie'}`);
    return null;
  }
  // Parse the cookie value from the set-cookie header
  const match = setCookie.match(/auth_token=([^;]+)/);
  if (!match) {
    console.error(`  FAIL: Could not extract auth_token cookie for ${email}`);
    return null;
  }
  return match[1];
}

async function fetchWithCookie(url, token) {
  return fetch(url, {
    headers: { Cookie: `auth_token=${token}` },
  });
}

async function test(description, fn) {
  process.stdout.write(`  ${description}... `);
  try {
    const result = await fn();
    if (result) {
      console.log('PASS');
      passCount++;
    } else {
      console.log('FAIL');
      failCount++;
    }
  } catch (err) {
    console.log(`FAIL (${err.message})`);
    failCount++;
  }
}

async function run() {
  console.log('========================================');
  console.log('  Data Isolation Test Suite');
  console.log('========================================\n');

  // 1. Login both users
  console.log('[1] Authentication');
  const tokenA = await login(USER_A);
  test('User A login', () => Promise.resolve(!!tokenA));
  const tokenB = await login(USER_B);
  test('User B login', () => Promise.resolve(!!tokenB));

  if (!tokenA || !tokenB) {
    console.log('\n  ❌ Cannot continue - login failed. Check BASE_URL and credentials.');
    process.exit(1);
  }

  // 2. Check /api/auth/me returns correct identity
  console.log('\n[2] Identity verification');
  test('User A identity matches', async () => {
    const res = await fetchWithCookie(`${BASE_URL}/api/auth/me`, tokenA);
    const body = await res.json();
    return body.email === USER_A && !!body.userId;
  });
  test('User B identity matches', async () => {
    const res = await fetchWithCookie(`${BASE_URL}/api/auth/me`, tokenB);
    const body = await res.json();
    return body.email === USER_B && !!body.userId;
  });

  // 3. Check User IDs are different
  test('Users have different IDs', async () => {
    const [resA, resB] = await Promise.all([
      fetchWithCookie(`${BASE_URL}/api/auth/me`, tokenA),
      fetchWithCookie(`${BASE_URL}/api/auth/me`, tokenB),
    ]);
    const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);
    return bodyA.userId !== bodyB.userId;
  });

  // 4. Portfolio data isolation
  console.log('\n[3] Portfolio data isolation');
  test('User A can access portfolio-data endpoint', async () => {
    const res = await fetchWithCookie(`${BASE_URL}/api/portfolio-data?t=${Date.now()}`, tokenA);
    return res.ok;
  });
  test('User B can access portfolio-data endpoint', async () => {
    const res = await fetchWithCookie(`${BASE_URL}/api/portfolio-data?t=${Date.now()}`, tokenB);
    return res.ok;
  });

  // 5. Strategy data isolation
  console.log('\n[4] Strategy data isolation');
  test('User B cannot see User A strategy data', async () => {
    const res = await fetchWithCookie(
      `${BASE_URL}/api/strategy-data?strategyName=${encodeURIComponent('3 Red Candle')}&t=${Date.now()}`,
      tokenB
    );
    // Should succeed (valid auth) but return empty data
    const body = await res.json();
    return res.ok && (!body.dailyData || body.dailyData.length === 0);
  });

  // 6. Max upside/downside isolation
  console.log('\n[5] Max upside/downside isolation');
  test('User B cannot see User A max-upside-downside data', async () => {
    const res = await fetchWithCookie(`${BASE_URL}/api/max-upside-downside?t=${Date.now()}`, tokenB);
    const body = await res.json();
    return res.ok && (!body.data || body.data.length === 0);
  });

  // 7. Unauthenticated access should be rejected
  console.log('\n[6] Unauthenticated access rejection');
  test('Portfolio-data rejects unauthenticated requests', async () => {
    const res = await fetch(`${BASE_URL}/api/portfolio-data`, {
      headers: { Cookie: '' },
    });
    return res.status === 401;
  });

  console.log(`\n========================================`);
  console.log(`  Results: ${passCount} passed, ${failCount} failed`);
  console.log(`========================================`);

  if (failCount > 0) {
    console.log('\n  ❌ Some tests failed. Review the output above.');
    process.exit(1);
  } else {
    console.log('\n  ✅ All isolation tests passed!');
  }
}

run().catch(console.error);
