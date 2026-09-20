// Vercel Function tunggal untuk seluruh API.
//
// Sumbernya di-bundle lebih dulu oleh `npm run build:api` (esbuild) ke
// ./_generated/app.mjs. Impor TypeScript lintas-direktori (../apps/api/src/app)
// TIDAK dipakai karena file-tracer Vercel tidak mengikutinya — function
// ter-deploy tanpa source-nya dan gagal ERR_MODULE_NOT_FOUND.
//
// `vercel.json` me-rewrite /api/(.*) ke sini; rewrite Vercel mempertahankan URL
// asli, jadi Elysia tetap melihat path lengkap seperti /api/v1/expenses.
// Runtime Node Vercel mendeteksi `.fetch` pada default export dan memanggilnya
// dengan Request/Response Web Standard — Elysia jalan tanpa adapter tambahan.
import app from './_generated/app.mjs';

export default app;
