#!/usr/bin/env bash
# E2E regression vs PRD §26 acceptance scenarios. Requires API running.
# Usage: BASE=http://localhost:3001 ./scripts/e2e.sh
set -u
BASE="${BASE:-http://localhost:3001}"
PASS=0; FAIL=0
TS=$(date +%s)
ok()   { PASS=$((PASS+1)); echo "PASS $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL $1 -- $2"; }
J()    { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }

# 1. Register
REG=$(curl -s -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"Tester\",\"email\":\"tester_${TS}@e2e.id\",\"password\":\"pass1234\"}")
[ "$(echo "$REG" | J "['success']")" = "True" ] && ok "register" || bad "register" "$REG"
TOKEN=$(echo "$REG" | J "['data']['token']")
A="Authorization: Bearer $TOKEN"

# 2. Duplicate email -> 409
DUP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"X Dupe\",\"email\":\"tester_${TS}@e2e.id\",\"password\":\"pass1234\"}")
[ "$DUP" = "409" ] && ok "duplicate 409" || bad "duplicate" "$DUP"

# 3. Login salah -> 401, login benar -> 200
C401=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"tester_${TS}@e2e.id\",\"password\":\"salah\"}")
[ "$C401" = "401" ] && ok "login salah 401" || bad "login salah" "$C401"

# 4. Tanpa token -> 401
U401=$(curl -s "$BASE/api/v1/categories" | J "['error']['code']")
[ "$U401" = "UNAUTHORIZED" ] && ok "guard 401" || bad "guard" "$U401"

# 5. Kategori seed = 9
CATS=$(curl -s "$BASE/api/v1/categories" -H "$A")
[ "$(echo "$CATS" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']))")" = "9" ] && ok "9 kategori" || bad "kategori" "$(echo "$CATS" | head -c 200)"
MAK=$(echo "$CATS" | python3 -c "import sys,json;print([c['id'] for c in json.load(sys.stdin)['data'] if c['name'].startswith('Makanan')][0])")
HIB=$(echo "$CATS" | python3 -c "import sys,json;print([c['id'] for c in json.load(sys.stdin)['data'] if c['name']=='Hiburan'][0])")

# 6. Amount invalid -> 400
INV=$(curl -s -X POST "$BASE/api/v1/expenses" -H "$A" -H 'Content-Type: application/json' -d '{"amount":0,"category_id":"x","description":"x","transaction_date":"2026-09-20"}' | J "['error']['code']")
[ "$INV" = "EXPENSE_AMOUNT_INVALID" ] && ok "amount 0 ditolak" || bad "amount" "$INV"

# 7. Scenario 1: catat Kopi 25000
TODAY=$(date +%F)
EXP=$(curl -s -X POST "$BASE/api/v1/expenses" -H "$A" -H 'Content-Type: application/json' -d "{\"amount\":25000,\"category_id\":\"$MAK\",\"description\":\"Kopi\",\"transaction_date\":\"$TODAY\",\"payment_method\":\"QRIS\"}")
EID=$(echo "$EXP" | J "['data']['id']")
DASH=$(curl -s "$BASE/api/v1/dashboard/summary?today=$TODAY" -H "$A")
[ "$(echo "$DASH" | J "['data']['today_total']")" = "25000" ] && ok "scenario1 today=25000" || bad "scenario1" "$DASH"

# 8. Scenario 2: edit 25000 -> 35000 (+10000)
curl -s -X PATCH "$BASE/api/v1/expenses/$EID" -H "$A" -H 'Content-Type: application/json' -d '{"amount":35000}' > /dev/null
DASH2=$(curl -s "$BASE/api/v1/dashboard/summary?today=$TODAY" -H "$A")
[ "$(echo "$DASH2" | J "['data']['today_total']")" = "35000" ] && ok "scenario2 +10000" || bad "scenario2" "$DASH2"

# 9. Budget: total 5jt, makanan 1jt
curl -s -X POST "$BASE/api/v1/budgets" -H "$A" -H 'Content-Type: application/json' -d "{\"month\":\"2026-09\",\"total_amount\":5000000,\"items\":[{\"category_id\":\"$MAK\",\"amount\":1000000}]}" > /dev/null
curl -s -X POST "$BASE/api/v1/expenses" -H "$A" -H 'Content-Type: application/json' -d "{\"amount\":885000,\"category_id\":\"$MAK\",\"description\":\"Makan besar\",\"transaction_date\":\"$TODAY\"}" > /dev/null
U1=$(curl -s "$BASE/api/v1/budgets/2026-09/usage" -H "$A")
# makanan: 35000+885000=920000 -> 92% critical (scenario 3)
[ "$(echo "$U1" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print([c['status'] for c in d['perCategory'] if c['limit']==1000000][0])")" = "critical" ] && ok "scenario3 critical 92%" || bad "scenario3" "$U1"

# 10. +180000 -> 1100000 -> exceeded, over 100000 (scenario 4)
E3=$(curl -s -X POST "$BASE/api/v1/expenses" -H "$A" -H 'Content-Type: application/json' -d "{\"amount\":180000,\"category_id\":\"$MAK\",\"description\":\"Jajan\",\"transaction_date\":\"$TODAY\"}" | J "['data']['id']")
U2=$(curl -s "$BASE/api/v1/budgets/2026-09/usage" -H "$A")
ST=$(echo "$U2" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];c=[x for x in d['perCategory'] if x['limit']==1000000][0];print(c['status'],c['used']-c['limit'])")
[ "$ST" = "exceeded 100000" ] && ok "scenario4 exceeded +100rb" || bad "scenario4" "$ST"

# 11. Total budget kecil -> insight budget_exceeded; top kategori >30%
curl -s -X PATCH "$BASE/api/v1/budgets/$(echo "$U2" | python3 -c "import sys,json" 2>/dev/null)/x" > /dev/null 2>&1
BUD=$(curl -s "$BASE/api/v1/budgets/2026-09" -H "$A" | J "['data']['id']")
curl -s -X PATCH "$BASE/api/v1/budgets/$BUD" -H "$A" -H 'Content-Type: application/json' -d '{"total_amount":1000000}' > /dev/null
INS=$(curl -s "$BASE/api/v1/insights/2026-09" -H "$A")
echo "$INS" | grep -q "budget_exceeded" && ok "insight exceeded" || bad "insight exceeded" "$INS"
echo "$INS" | grep -q "top_category" && ok "insight top kategori" || bad "insight top" "$INS"

# 12. Scenario 5: review tanpa bulan lalu -> previous_total null
REV=$(curl -s "$BASE/api/v1/reviews/2026-09" -H "$A")
[ "$(echo "$REV" | J "['data']['previous_total']")" = "None" ] && ok "scenario5 prev null" || bad "scenario5" "$REV"
[ "$(echo "$REV" | J "['data']['current_total']")" = "1100000" ] && ok "review total 1,1jt" || bad "review total" "$REV"

# 13. Catatan evaluasi
curl -s -X PUT "$BASE/api/v1/reviews/2026-09/note" -H "$A" -H 'Content-Type: application/json' -d '{"note":"Transport naik dinas."}' > /dev/null
NOTES=$(curl -s "$BASE/api/v1/reviews/notes" -H "$A")
echo "$NOTES" | grep -q "dinas" && ok "review note" || bad "review note" "$NOTES"

# 14. Soft delete 180rb -> total 920rb,insight exceeded hilang
curl -s -X DELETE "$BASE/api/v1/expenses/$E3" -H "$A" > /dev/null
DASH3=$(curl -s "$BASE/api/v1/dashboard/summary?today=$TODAY" -H "$A")
[ "$(echo "$DASH3" | J "['data']['month_total']")" = "920000" ] && ok "soft delete excluded" || bad "soft delete" "$DASH3"

# 15. Trends + reminders + export
TR=$(curl -s "$BASE/api/v1/trends/monthly?month=2026-09&n=6" -H "$A" | J "['data'].__len__()")
[ "$TR" = "6" ] && ok "trend monthly" || bad "trend" "$TR"
RM=$(curl -s -X PUT "$BASE/api/v1/reminders" -H "$A" -H 'Content-Type: application/json' -d '{"daily_enabled":true,"daily_time":"21:00","weekly_enabled":false}' | J "['data']['daily_time']")
[ "$RM" = "21:00" ] && ok "reminders put" || bad "reminders" "$RM"
TST=$(curl -s -X POST "$BASE/api/v1/reminders/test" -H "$A" | J "['data']['sent']")
[ "$TST" = "True" ] && ok "reminder test" || bad "reminder test" "$TST"
CSV=$(curl -s -X POST "$BASE/api/v1/exports/expenses" -H "$A" -H 'Content-Type: application/json' -d '{}' | head -1)
[ "$CSV" = "transaction_id,date,description,category,amount,payment_method,created_at" ] && ok "export csv" || bad "export" "$CSV"

# 16. Isolasi user: user2 tidak lihat data user1
REG2=$(curl -s -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"U2\",\"email\":\"u2_${TS}@e2e.id\",\"password\":\"pass1234\"}")
T2=$(echo "$REG2" | J "['data']['token']")
C404=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/expenses/$EID" -H "Authorization: Bearer $T2")
L0=$(curl -s "$BASE/api/v1/expenses" -H "Authorization: Bearer $T2" | J "['meta']['count']")
[ "$C404" = "404" ] && [ "$L0" = "0" ] && ok "isolasi user" || bad "isolasi" "$C404/$L0"

echo "----"
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ]
