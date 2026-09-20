// Vercel Function: menangkap semua request /api/*.
// Runtime Node Vercel mendeteksi `.fetch` pada default export dan memanggilnya
// dengan Request/Response Web Standard — Elysia jalan tanpa adapter tambahan.
import app from '../apps/api/src/app';

export default app;
