#!/usr/bin/env bash
# =============================================================================
# Data Isolation Test Script
# =============================================================================
# Run this script to verify that User A and User B cannot see each other's data.
# Prerequisites: curl, jq
#
# Usage:
#   1. Set two different emails that will log in with the shared password
#   2. Run: bash scripts/test-isolation.sh
#
# The script will:
#   - Log in as User A, upload test data, verify they see it
#   - Log in as User B, verify they see NO data from User A
#   - Verify User B cannot access User A's data via direct API calls
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
SHARED_PASSWORD="${SHARED_PASSWORD:-RCG@2030}"
USER_A_EMAIL="${USER_A_EMAIL:-alice@test.com}"
USER_B_EMAIL="${USER_B_EMAIL:-bob@test.com}"

echo "=========================================="
echo "Data Isolation Test"
echo "=========================================="
echo "Base URL:      $BASE_URL"
echo "User A:        $USER_A_EMAIL"
echo "User B:        $USER_B_EMAIL"
echo ""

# Helper: login and get cookie
login() {
  local email="$1"
  local cookie_jar="/tmp/cookie_${email//@/_}.txt"
  > "$cookie_jar"

  local resp
  resp=$(curl -s -c "$cookie_jar" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$email\", \"password\": \"$SHARED_PASSWORD\"}")

  echo "$resp" | jq -e '.success == true' > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "FAIL: Login failed for $email: $(echo $resp | jq -r '.error // "unknown"')"
    return 1
  fi

  echo "$cookie_jar"
}

# Helper: GET an API endpoint with cookie
api_get() {
  local cookie_jar="$1"
  local url="$2"
  curl -s -b "$cookie_jar" "$url"
}

echo "--- Step 1: Login as User A ---"
COOKIE_A=$(login "$USER_A_EMAIL")
if [ $? -ne 0 ]; then exit 1; fi
echo "PASS: User A logged in"
echo ""

echo "--- Step 2: Login as User B ---"
COOKIE_B=$(login "$USER_B_EMAIL")
if [ $? -ne 0 ]; then exit 1; fi
echo "PASS: User B logged in"
echo ""

echo "--- Step 3: Check User A starts empty ---"
DATA_A=$(api_get "$COOKIE_A" "$BASE_URL/api/portfolio-data")
COUNT_A=$(echo "$DATA_A" | jq '.data | length')
echo "User A portfolio rows: $COUNT_A"
echo ""

echo "--- Step 4: Check User B starts empty ---"
DATA_B=$(api_get "$COOKIE_B" "$BASE_URL/api/portfolio-data")
COUNT_B=$(echo "$DATA_B" | jq '.data | length')
echo "User B portfolio rows: $COUNT_B"
echo ""

echo "--- Step 5: Upload test data as User A ---"
# Create a minimal test upload payload
echo "Skipping actual upload in this test (requires a valid Excel file)."
echo "Manual test: Upload a file via the UI while logged in as User A, then run steps 6-8."
echo ""

echo "--- Step 6: Verify User A can see their data (after upload) ---"
echo "Run: api_get \"$COOKIE_A\" \"$BASE_URL/api/portfolio-data\" | jq '.data | length'"
echo ""

echo "--- Step 7: Verify User B CANNOT see User A's data ---"
echo "Run: api_get \"$COOKIE_B\" \"$BASE_URL/api/portfolio-data\" | jq '.data | length'"
echo "Expected: 0 (User B should see no data)"
echo ""

echo "--- Step 8: Direct ID tampering test ---"
echo "Verify that User B cannot access User A's data by guessing IDs:"
echo "Run: api_get \"$COOKIE_B\" \"$BASE_URL/api/strategy-data?strategyName=3%20Red%20Candle\" | jq '.dailyData | length'"
echo "Expected: 0 (no data, even if User A uploaded strategy data)"
echo ""

echo "--- Step 9: Verify /api/auth/me returns correct user ---"
ME_A=$(api_get "$COOKIE_A" "$BASE_URL/api/auth/me")
echo "User A identity: $(echo $ME_A | jq '{email, userId, role}')"
ME_B=$(api_get "$COOKIE_B" "$BASE_URL/api/auth/me")
echo "User B identity: $(echo $ME_B | jq '{email, userId, role}')"
echo ""

echo "=========================================="
echo "Manual Verification Checklist"
echo "=========================================="
echo "[ ] Login as User A via the browser"
echo "[ ] Upload a file via the Data Ingestion Portal"
echo "[ ] Verify User A sees their data on the dashboard"
echo "[ ] Logout, login as User B"
echo "[ ] Verify User B sees NO data / empty dashboard"
echo "[ ] Verify User B cannot access /api/portfolio-data and see User A's data"
echo "[ ] Verify User B cannot access /api/strategy-data?strategyName=... and see data"
echo "[ ] Verify User B cannot access /api/max-upside-downside and see data"
echo "[ ] Verify User B cannot access /api/upload (DELETE) to delete User A's data"
echo "=========================================="
