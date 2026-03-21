#!/bin/bash
set -euo pipefail

BASE="http://localhost:${DEPLOY_TEST_PORT:-5000}"
PASS=0
FAIL=0
TOTAL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1))
    printf "  [PASS] %s (got %s)\n" "$label" "$actual"
  else
    FAIL=$((FAIL + 1))
    printf "  [FAIL] %s (expected %s, got %s)\n" "$label" "$expected" "$actual"
  fi
}

status() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

body_field() {
  local url="$1"
  shift
  curl -s "$@" "$url" | node -e "process.stdin.on('data',d=>{try{const j=JSON.parse(d);process.stdout.write(String(j.$1 ?? 'MISSING'))}catch{process.stdout.write('PARSE_ERROR')}})"
}

echo ""
echo "=== SECURITY REGRESSION CHECKLIST ==="
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

echo "--- 1. Protected writes return 401 without auth ---"
check "POST /api/notes" "401" "$(status -X POST "$BASE/api/notes" -H 'Content-Type: application/json' -d '{}')"
check "POST /api/highlights" "401" "$(status -X POST "$BASE/api/highlights" -H 'Content-Type: application/json' -d '{}')"
check "POST /api/bookmarks" "401" "$(status -X POST "$BASE/api/bookmarks" -H 'Content-Type: application/json' -d '{}')"
check "POST /api/prayers" "401" "$(status -X POST "$BASE/api/prayers" -H 'Content-Type: application/json' -d '{}')"
check "POST /api/user/donate" "401" "$(status -X POST "$BASE/api/user/donate" -H 'Content-Type: application/json' -d '{}')"
check "POST /api/user/start-trial" "401" "$(status -X POST "$BASE/api/user/start-trial" -H 'Content-Type: application/json')"
check "POST /api/user/dismiss-mission-invite" "401" "$(status -X POST "$BASE/api/user/dismiss-mission-invite" -H 'Content-Type: application/json')"
check "POST /api/auth/delete-account" "401" "$(status -X POST "$BASE/api/auth/delete-account" -H 'Content-Type: application/json')"

echo ""
echo "--- 2. Invalid bearer token returns 401 on protected writes ---"
check "POST /api/notes (bogus token)" "401" "$(status -X POST "$BASE/api/notes" -H 'Content-Type: application/json' -H 'Authorization: Bearer fake123' -d '{}')"
check "POST /api/auth/delete-account (bogus token)" "401" "$(status -X POST "$BASE/api/auth/delete-account" -H 'Content-Type: application/json' -H 'Authorization: Bearer fake123')"

echo ""
echo "--- 3. Pro-only endpoints return 401 without auth ---"
check "GET /api/chapter-context/1/1" "401" "$(status "$BASE/api/chapter-context/1/1")"
check "GET /api/family/stats" "401" "$(status "$BASE/api/family/stats")"
check "GET /api/family/children" "401" "$(status "$BASE/api/family/children")"
check "GET /api/family/heatmap" "401" "$(status "$BASE/api/family/heatmap")"
check "GET /api/family/prayers" "401" "$(status "$BASE/api/family/prayers")"
check "POST /api/family/prayers" "401" "$(status -X POST "$BASE/api/family/prayers" -H 'Content-Type: application/json' -d '{}')"
check "GET /api/family/dinner-topics" "401" "$(status "$BASE/api/family/dinner-topics")"

echo ""
echo "--- 4. Spoofed userId ignored on protected reads ---"
check "GET /api/notes/fakeuser?userId=fakeuser returns []" "[]" "$(curl -s "$BASE/api/notes/fakeuser?userId=fakeuser")"
check "GET /api/highlights/fakeuser?userId=fakeuser returns []" "[]" "$(curl -s "$BASE/api/highlights/fakeuser?userId=fakeuser")"
check "GET /api/bookmarks/fakeuser?userId=fakeuser returns []" "[]" "$(curl -s "$BASE/api/bookmarks/fakeuser?userId=fakeuser")"
check "GET /api/prayers?userId=fakeuser returns []" "[]" "$(curl -s "$BASE/api/prayers?userId=fakeuser")"

echo ""
echo "--- 5. Spoofed userId on pro-status returns guest defaults ---"
PRO_RESP=$(curl -s "$BASE/api/user/pro-status?userId=fakeuser")
PRO_IS=$(echo "$PRO_RESP" | node -e "process.stdin.on('data',d=>{try{process.stdout.write(String(JSON.parse(d).isPro))}catch{process.stdout.write('ERR')}})")
check "GET /api/user/pro-status?userId=fakeuser isPro=false" "false" "$PRO_IS"

echo ""
echo "--- 6. Spoofed userId on chapter-context still 401 ---"
check "GET /api/chapter-context/1/1?userId=fakeuser" "401" "$(status "$BASE/api/chapter-context/1/1?userId=fakeuser")"

echo ""
echo "--- 7. Disabled password reset returns 501 ---"
check "POST /api/auth/reset-password" "501" "$(status -X POST "$BASE/api/auth/reset-password" -H 'Content-Type: application/json' -d '{"email":"x@x.com","newPassword":"test1234"}')"

echo ""
echo "--- 8. Guest /api/auth/me returns null user ---"
ME_RESP=$(curl -s "$BASE/api/auth/me")
ME_GUEST=$(echo "$ME_RESP" | node -e "process.stdin.on('data',d=>{try{const j=JSON.parse(d);process.stdout.write(String(j.isGuest))}catch{process.stdout.write('ERR')}})")
ME_USER=$(echo "$ME_RESP" | node -e "process.stdin.on('data',d=>{try{const j=JSON.parse(d);process.stdout.write(String(j.user))}catch{process.stdout.write('ERR')}})")
check "GET /api/auth/me isGuest=true" "true" "$ME_GUEST"
check "GET /api/auth/me user=null" "null" "$ME_USER"

echo ""
echo "--- 9. Public reads still return 200 ---"
check "GET /api/health" "200" "$(status "$BASE/api/health")"
HEALTH_BODY=$(curl -s "$BASE/api/health")
HEALTH_DB=$(echo "$HEALTH_BODY" | node -e "process.stdin.on('data',d=>{try{process.stdout.write(JSON.parse(d).database)}catch{process.stdout.write('ERR')}})")
check "GET /api/health database=ok" "ok" "$HEALTH_DB"
HEALTH_AI=$(echo "$HEALTH_BODY" | node -e "process.stdin.on('data',d=>{try{const j=JSON.parse(d);process.stdout.write(typeof j.ai?.maxConcurrent==='number'?'ok':'ERR')}catch{process.stdout.write('ERR')}})")
check "GET /api/health ai stats present" "ok" "$HEALTH_AI"
HEALTH_CACHE=$(echo "$HEALTH_BODY" | node -e "process.stdin.on('data',d=>{try{const j=JSON.parse(d);process.stdout.write(typeof j.cache?.hitRate==='number'?'ok':'ERR')}catch{process.stdout.write('ERR')}})")
check "GET /api/health cache stats present" "ok" "$HEALTH_CACHE"
HEALTH_RES=$(echo "$HEALTH_BODY" | node -e "process.stdin.on('data',d=>{try{const j=JSON.parse(d);process.stdout.write(typeof j.resources?.published==='number'?'ok':'ERR')}catch{process.stdout.write('ERR')}})")
check "GET /api/health resources stats present" "ok" "$HEALTH_RES"
check "GET /api/tracks" "200" "$(status "$BASE/api/tracks")"
check "GET /api/streams/active" "200" "$(status "$BASE/api/streams/active")"
check "GET /api/sabbath-school/current" "200" "$(status "$BASE/api/sabbath-school/current")"
check "GET /api/devotionals/plans" "200" "$(status "$BASE/api/devotionals/plans")"
check "GET /api/kids/collections" "200" "$(status "$BASE/api/kids/collections")"
check "GET /api/churches" "200" "$(status "$BASE/api/churches")"
check "GET /api/resources" "200" "$(status "$BASE/api/resources")"
check "POST /api/feedback (guest)" "200" "$(status -X POST "$BASE/api/feedback" -H 'Content-Type: application/json' -d '{"topic":"Bug Report","message":"regression test"}')"

echo ""
echo "--- 10. Community writes require auth ---"
check "POST /api/family/create" "401" "$(status -X POST "$BASE/api/family/create" -H 'Content-Type: application/json' -d '{"name":"test"}')"
check "POST /api/groups/create" "401" "$(status -X POST "$BASE/api/groups/create" -H 'Content-Type: application/json' -d '{"name":"test"}')"

echo "--- 11. Organization endpoints require auth ---"
check "POST /api/organizations (no auth)" "401" "$(status -X POST "$BASE/api/organizations" -H 'Content-Type: application/json' -d '{"name":"test","type":"church"}')"
check "POST /api/organizations/join (no auth)" "401" "$(status -X POST "$BASE/api/organizations/join" -H 'Content-Type: application/json' -d '{"joinCode":"TESTCODE"}')"
check "GET /api/organizations/fake-id (no auth)" "401" "$(status "$BASE/api/organizations/fake-id")"
check "GET /api/organizations/fake-id/members (no auth)" "401" "$(status "$BASE/api/organizations/fake-id/members")"

echo ""
echo "========================================="
printf "  TOTAL: %d  |  PASS: %d  |  FAIL: %d\n" "$TOTAL" "$PASS" "$FAIL"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo "  STATUS: FAILED"
  exit 1
else
  echo "  STATUS: ALL PASSED"
  exit 0
fi
