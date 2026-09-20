# Catat Uang Hemat — API (ElysiaJS + Bun + SQLite + Drizzle)

Backend REST `/api/v1` sesuai PRD §13–14 (envelope `{success,data,meta}` /
`{success:false,error:{code,message,fields}}`).

## Jalankan

**Satu service (disarankan)** — build frontend + serve API + Web UI di satu
proses Bun, satu port:

```bash
bun install
PORT=3001 bun run serve   # = build:web && start
```

Buka `http://localhost:3001` → Web UI (SPA fallback), API di `/api/v1`,
health di `/health`. Web UI diserve dari `../web/build` (atau `STATIC_DIR`
custom); bila belum di-build, API tetap jalan mandiri.

**Dev terpisah** (HMR frontend):

```bash
PORT=3001 bun run dev          # API saja, watch mode
# + di terminal lain: apps/web `bun run dev` (Vite, proxy via VITE_API_URL)
```

- Health: `GET /health` → `{"status":"ok"}`
- Migrasi Drizzle otomatis saat boot (`./drizzle`, DB di `./data/app.db`)
- Generate ulang migrasi setelah ubah schema: `bun run db:generate`
- Typecheck: `bun run check`
- E2E (butuh server jalan): `BASE=http://localhost:3001 ./scripts/e2e.sh` — 21 asersi mencakup skenario terima PRD §26

> Catatan: port 3000 dipakai aplikasi lain di mesin ini — dev default memakai **3001**.
> Frontend (`apps/web/.env`) sudah mengarah ke `http://localhost:3001`.

## Auth

Email + password (`Bun.password` hash). JWT (`@elysiajs/jwt`, 30 hari) via
header `Authorization: Bearer …` atau cookie `cu_token`. Register otomatis
seed 9 kategori + preferensi reminder dalam satu transaksi DB. Semua query
di-scope `user_id` dari token (teruji isolasi antar user di e2e).

## Struktur

```text
src/
├── index.ts            # Elysia app, CORS, onError envelope, /health
├── db/
│   ├── schema.ts       # users, categories, expenses, monthly_budgets,
│   │                   # budget_categories, review_notes, reminder_preferences
│   └── client.ts       # bun:sqlite + drizzle (+ foreign_keys ON)
├── lib/
│   ├── http.ts         # envelope, uid, validasi tanggal/bulan, budgetStatus
│   ├── auth.ts         # jwtPlugin, getUserFromToken, authDerive (inline per router!)
│   ├── seed.ts         # seed kategori + reminder untuk user baru
│   ├── analytics.ts    # agregasi read-model (daily/monthly/kategori/usage)
│   └── insights.ts     # rule-based insights deterministik + evidence
└── routes/
    ├── auth.ts         # register/login/logout/me (+PATCH nama)
    ├── categories.ts   # GET /
    ├── expenses.ts     # CRUD + soft delete, filter from/to/category_id/q
    ├── dashboard.ts    # summary + trends (daily/monthly/categories)
    ├── budgets.ts      # list/get/upsert(PATCH)/usage
    ├── reviews.ts      # review + notes + insights (dihitung on-the-fly)
    └── misc.ts         # reminders CRUD + test + weekly-summary, export CSV
```

Catatan implementasi:

- **Elysia 1.4**: `error()` dihapus dari route context → pakai `status(code, body)`;
  tipe `derive` tidak terbawa lewat `.use(pluginInstance)` → guard dipakai
  inline per router (`.use(jwtPlugin).derive(authDerive())`), 401 via
  `UnauthorizedError` → `onError`.
- **SQLite**: `journal_mode=WAL` menyebabkan `SQLITE_IOERR_VNODE` bila data dir
  di filesystem tersinkron → dipakai `DELETE` (aman untuk skala MVP).
- **Insight** dihitung deterministik saat GET (bukan tabel) — selaras rule frontend.
- Validasi tanggal murni kalender (UTC) agar independen timezone server.
