# Catat Uang Hemat — Web (SvelteKit)

Frontend mobile-first untuk pencatatan pengeluaran (PRD `../../prd_catat_uang_hemat.md`).

## Mode

| Mode | Cara | Data |
|---|---|---|
| Dummy (tanpa backend) | `VITE_API_URL` kosong | localStorage + seed 6 bulan |
| Backend | `VITE_API_URL=http://localhost:3001` (lihat `.env.example`) | Elysia API + SQLite |

Mode aktif otomatis terdeteksi via `apiMode` (`src/lib/api/client.ts`).
Seluruh halaman membaca Svelte stores — di mode backend, stores diisi dari
server saat login (`syncFromBackend`) dan setiap mutasi (tambah/ubah/hapus/
budget/catatan) memanggil API dulu lalu update store. Tidak ada perubahan
logika halaman antar mode.

## Jalankan (mode backend)

```bash
# Opsi A — satu service (disarankan): dari apps/api
PORT=3001 bun run serve   # build web + serve API & UI di :3001
```

```bash
# Opsi B — dev terpisah (HMR):
# terminal 1: apps/api  -> PORT=3001 bun run dev
# terminal 2: di sini   -> bun install && bun run dev --open
```

`.env` sudah berisi `VITE_API_URL=http://localhost:3001`.
Build produksi memakai `adapter-static` (SPA, `build/` + fallback
`index.html`) karena Web UI diserve langsung oleh Elysia.

Daftar akun baru di `/register` — 9 kategori + preferensi reminder otomatis
di-seed oleh backend. Data mulai kosong (empty state teruji).

## Struktur penting

- `src/lib/api/client.ts` — fetch wrapper `{success,data}` + `ApiError` + token JWT (`cuh.token`)
- `src/lib/api/mockClient.ts` — agregasi baca dari stores (dashboard/trend/review)
- `src/lib/dummy/store.ts` — stores + mutasi dual-mode + `syncFromBackend` + `restoreSession`
- `src/lib/dummy/seed.ts` — seed mode dummy (deterministik)
- `src/lib/utils/analytics.ts` — agregasi + insight rule-based (mirror backend)
- `src/lib/components/` — `AppIcon` (Lucide), `CurrencyInput` (Rp live-format), `ThemeToggle`, charts SVG murni

## Verifikasi

```bash
bun run check   # svelte-check, 0 errors
bun run build   # production build
```
