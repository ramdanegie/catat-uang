// Vercel Function tunggal untuk seluruh API.
//
// `vercel.json` me-rewrite /api/(.*) ke sini; rewrite Vercel mempertahankan URL
// asli, jadi Elysia tetap melihat path lengkap seperti /api/v1/expenses.
// Catch-all berbasis nama file (`[...path].ts`) sengaja TIDAK dipakai: di
// direktori `api/` bare, Vercel memperlakukannya sebagai satu segmen saja.
//
// Runtime Node Vercel mendeteksi `.fetch` pada default export dan memanggilnya
// dengan Request/Response Web Standard — Elysia jalan tanpa adapter tambahan.
import app from '../apps/api/src/app';

export default app;
