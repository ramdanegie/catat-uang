# Catat Uang Hemat — Production Build & Run

Satu service Bun: backend Elysia (`apps/api`) men-serve API `/api/v1` +
frontend statis (`apps/web/build`) di satu port. Database SQLite.

Dua target deploy yang didukung:

| Target | Runtime | Database | Entry |
|---|---|---|---|
| Docker / VPS / PaaS | Bun, satu proses | File SQLite di volume | `apps/api/src/index.ts` |
| Vercel | Node serverless | Turso (libSQL remote) | `api/index.ts` |

Rute Elysia didefinisikan sekali di `apps/api/src/app.ts` dan dipakai kedua
entry. Driver database juga satu (`@libsql/client`): URL `file:` untuk lokal,
`libsql://` untuk Turso.

## Opsi A — Docker (disarankan)

```bash
# 1. Wajib: secret JWT
export JWT_SECRET="$(openssl rand -hex 32)"

# 2. Opsional: URL publik (untuk redirect login Google) & kredensial Google
export FRONTEND_URL="https://uang.contoh.id"
export GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="xxx"
export GOOGLE_REDIRECT_URI="https://uang.contoh.id/api/v1/auth/google/callback"

# 3. Build & jalan (persisten DB di volume app-data)
docker compose up -d --build
docker compose logs -f
```

Cek: `curl https://uang.contoh.id/health` → `{"status":"ok"}`.

## Opsi B — Bun langsung (VPS, tanpa Docker)

```bash
# API
cd apps/api && bun install
# Web (build statis; VITE_API_URL kosong = same-origin /api/v1)
cd ../web && bun install && VITE_API_URL= bun run build

# Jalan (gunakan process manager: systemd / pm2 / tmux)
cd ../api
PORT=3001 DB_PATH=/var/lib/catat-uang/app.db JWT_SECRET="isi-rahasia-kuat" \
FRONTEND_URL="https://uang.contoh.id" bun run src/index.ts
```

Contoh unit systemd (`/etc/systemd/system/catat-uang.service`):

```ini
[Unit]
Description=Catat Uang Hemat
After=network.target

[Service]
WorkingDirectory=/srv/catat_uang/apps/api
Environment=PORT=3001
Environment=DB_PATH=/var/lib/catat-uang/app.db
EnvironmentFile=/etc/catat-uang.env   # JWT_SECRET, FRONTEND_URL, GOOGLE_*
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

Pasang reverse proxy (Caddy/Nginx) di depan untuk HTTPS, mis. Caddy:

```text
uang.contoh.id {
    reverse_proxy 127.0.0.1:3001
}
```

## Opsi C — Vercel + Turso (CI/CD otomatis)

Vercel tidak punya disk persisten dan tidak menjalankan Bun, jadi jalur ini
memakai **Vercel Functions (Node)** untuk API dan **Turso** (libSQL, SQLite
terkelola) untuk database. Frontend statis diserve dari CDN Vercel.

Apa yang sudah disiapkan repo ini:

- `api/index.mjs` — satu function untuk seluruh API; default-export instance
  Elysia, dan runtime Node Vercel memanggil `.fetch` dengan Request/Response
  Web Standard.
- `vercel.json` — build command, output `apps/web/build`, rewrite `/api/(.*)`
  ke function (URL asli tetap utuh, jadi Elysia melihat `/api/v1/...`),
  rewrite `/health` → `/api/health`, dan fallback SPA ke `index.html`.
- `package.json` root — npm workspaces supaya Vercel memasang kedua app.
  `vercel-build` menjalankan tiga langkah berurutan: bundle API → migrasi
  Drizzle → build frontend.

Dua hal yang tampak berlebihan tapi memang perlu:

- **API di-bundle esbuild dulu** (`npm run build:api` → `api/_generated/app.mjs`).
  File-tracer Vercel tidak mengikuti impor TypeScript relatif ke luar direktori
  `api/`, jadi impor langsung `../apps/api/src/app` membuat function ter-deploy
  tanpa source-nya (`ERR_MODULE_NOT_FOUND` saat runtime).
- **Rewrite, bukan catch-all nama file.** Di direktori `api/` bare, Vercel
  menerjemahkan `[...path].ts` sebagai satu segmen (`^/api/([^/]+)$`), sehingga
  `/api/v1/expenses` jatuh ke 404. Konvensi itu hanya berlaku di Next.js.

### 1. Siapkan database Turso

Lewat Vercel Marketplace (paling ringkas — env var terisi otomatis):

```bash
vercel integration add turso
```

Terima syarat di browser saat diminta, lalu pilih paket **Free**. Integrasi
mengisi `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` di project.

Atau lewat Turso CLI bila ingin kelola sendiri:

```bash
brew install tursodatabase/tap/turso   # atau: curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create catat-uang
turso db show catat-uang --url                 # -> TURSO_DATABASE_URL
turso db tokens create catat-uang              # -> TURSO_AUTH_TOKEN
```

### 2. Buat project Vercel & set environment

```bash
vercel link --yes --project catat-uang

vercel env add JWT_SECRET production --value "$(openssl rand -hex 32)" --yes
vercel env add JWT_EXPIRES_IN production --value 30d --yes
# Lewati dua baris ini bila memakai integrasi Marketplace.
vercel env add TURSO_DATABASE_URL production --value "libsql://..." --yes
vercel env add TURSO_AUTH_TOKEN production --value "..." --yes
```

`VITE_API_URL` **tidak perlu di-set** — `vercel-build` sudah memaksa nilai
kosong supaya frontend memanggil API same-origin di `/api/v1`.

Ulangi `vercel env add ... preview` bila ingin preview deployment berfungsi
penuh (butuh database Turso terpisah agar data preview tidak mencemari
produksi).

### 3. Nyalakan CI/CD (auto-deploy tiap push)

Vercel Git Integration sudah cukup — tidak perlu GitHub Actions.

1. Pasang Vercel GitHub App dan beri akses ke repo:
   <https://github.com/apps/vercel/installations/new>
2. Hubungkan repo ke project:

   ```bash
   vercel git connect https://github.com/<user>/catat-uang
   ```

Setelah tersambung:

- push ke `main` → **Production deployment** otomatis.
- push ke branch lain / buka PR → **Preview deployment** otomatis dengan URL
  sendiri, dan Vercel mengomentari PR-nya.

Deploy manual sekali jalan tetap bisa: `vercel deploy --prod`.

### 4. Setelah domain final diketahui

```bash
vercel env add FRONTEND_URL production --value "https://<domain>" --yes
vercel deploy --prod
```

Lalu daftarkan `https://<domain>/api/v1/auth/google/callback` di Google Cloud
Console bila memakai login Google (lihat bagian *Login Google*).

### Catatan penting jalur Vercel

- **Migrasi jalan saat build**, bukan saat request (`npm run db:migrate -w api`
  di dalam `vercel-build`). Jadi env Turso harus tersedia di build-time —
  Vercel memang menyediakannya.
- **Hash password berbeda dari versi Bun.** Kode memakai scrypt (`node:crypto`)
  supaya jalan di Bun maupun Node. Database lama berisi hash `Bun.password`
  tidak bisa dipakai — gunakan database baru.
- **Free tier Turso punya batas**. Pantau kuota row-read/storage di dashboard
  Turso sebelum trafik naik.
- Cold start Vercel + Turso lewat jaringan lebih lambat daripada SQLite lokal.
  Bila butuh latensi rendah dan data besar, Opsi A/B/D lebih cocok.
- **Preview deployment memakai database yang sama** bila `TURSO_DATABASE_URL`
  di-set untuk environment Preview. Buat database Turso terpisah bila tidak
  ingin data preview bercampur dengan produksi.

Verifikasi jalur ini memakai skrip E2E yang sama dengan lokal:

```bash
cd apps/api && BASE=https://<domain> ./scripts/e2e.sh   # 21 asersi
```

## Opsi D — Hosting / PaaS lain

Aplikasi ini **satu container, satu port, SQLite di disk**. Syarat hosting:

1. Bisa build dari `Dockerfile` di root repo.
2. Menyediakan **persistent volume** yang di-mount ke `/data` (tanpa ini, data
   hilang setiap redeploy — SQLite bukan database eksternal).
3. Mengizinkan set environment variable (minimal `JWT_SECRET`).

> Platform serverless/edge tanpa disk persisten (Netlify, Cloudflare Workers)
> **tidak cocok** untuk jalur ini — mereka butuh database remote seperti pada
> [Opsi C](#opsi-c--vercel--turso-cicd-otomatis).

### Railway

```bash
npm i -g @railway/cli
railway login
railway init            # pilih "Empty Project", lalu deploy dari repo GitHub
railway up              # atau hubungkan repo via dashboard (auto-deploy on push)
```

Di dashboard Railway:

- **Settings → Networking → Generate Domain** (Railway isi `PORT` otomatis;
  `Dockerfile` sudah `EXPOSE 3001` dan server membaca `process.env.PORT`).
- **Variables**: `JWT_SECRET`, `DB_PATH=/data/app.db`, `FRONTEND_URL=https://<domain>`,
  dan `GOOGLE_*` bila memakai login Google.
- **Volumes → New Volume** dengan mount path `/data`.

### Fly.io

```bash
fly launch --no-deploy          # deteksi Dockerfile, buat fly.toml
fly volumes create app_data --size 1 --region sin
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" \
  FRONTEND_URL="https://<app>.fly.dev"
fly deploy
```

Tambahkan di `fly.toml`:

```toml
[env]
  PORT = "3001"
  DB_PATH = "/data/app.db"

[http_service]
  internal_port = 3001
  force_https = true
  min_machines_running = 1   # SQLite: jangan biarkan mesin di-scale ke 0/banyak

[[mounts]]
  source = "app_data"
  destination = "/data"
```

Jalankan **satu mesin saja** (`fly scale count 1`) — SQLite tidak aman ditulis
banyak instance sekaligus.

### Render

- New → **Web Service** → hubungkan repo → Runtime **Docker**.
- Environment: `JWT_SECRET`, `DB_PATH=/data/app.db`, `FRONTEND_URL`, `GOOGLE_*`.
- **Disks → Add Disk**, mount path `/data`, ukuran 1 GB.
- Instance type harus berbayar (free tier tidak punya disk persisten).

### Coolify / Dokploy / CapRover (self-host di VPS)

Panel ini membaca `docker-compose.yml` apa adanya:

- New Resource → **Docker Compose** → arahkan ke repo ini.
- Isi env `JWT_SECRET` dan `FRONTEND_URL` di panel.
- Volume `app-data` sudah terdefinisi di compose → data aman saat redeploy.
- HTTPS/domain ditangani proxy bawaan panel (Traefik/Caddy).

### Setelah deploy di hosting mana pun

1. Set `FRONTEND_URL` ke domain final, lalu redeploy.
2. Bila memakai login Google: tambahkan
   `https://<domain>/api/v1/auth/google/callback` ke **Authorized redirect URIs**
   di Google Cloud Console dan samakan dengan `GOOGLE_REDIRECT_URI`.
3. Verifikasi dengan perintah di bagian [Verifikasi pasca-deploy](#verifikasi-pasca-deploy).

## Environment

| Var | Wajib | Default | Keterangan |
|---|---|---|---|
| `PORT` | – | `3000` | Port listen (compose memakai `3001`) |
| `DB_PATH` | – | `./data/app.db` | Lokasi file SQLite (mount volume di prod!). Diabaikan bila `TURSO_DATABASE_URL` diisi |
| `TURSO_DATABASE_URL` | Bila Vercel | – | URL Turso (`libsql://...`); mengaktifkan mode database remote |
| `TURSO_AUTH_TOKEN` | Bila Turso | – | Token akses database Turso |
| `JWT_SECRET` | **Ya (prod)** | `dev-secret-change-me` | Secret JWT; server memberi warning bila masih default |
| `JWT_EXPIRES_IN` | – | `30d` | Masa berlaku token |
| `FRONTEND_URL` | Bila Google login | `http://localhost:5173` | Origin publik web, tujuan redirect OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Bila Google login | – | Kredensial OAuth; tombol Google otomatis sembunyi bila kosong |
| `STATIC_DIR` | – | `../web/build` | Folder build frontend yang diserve |
| `VITE_API_URL` (build-time web) | – | – | Kosong = same-origin (wajib prod); URL absolut hanya untuk dev terpisah; unset = mode dummy |

## Login Google — setup sekali

1. [Google Cloud Console](https://console.cloud.google.com/) → project → **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** (tipe *Web application*).
2. **Authorized redirect URIs** tambahkan persis:
   `https://DOMAIN_KAMU/api/v1/auth/google/callback`
3. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (sama persis dengan URI di atas), dan `FRONTEND_URL=https://DOMAIN_KAMU`, lalu restart service.
4. Tombol “Masuk/Daftar dengan Google” muncul otomatis di halaman auth; avatar profil diambil dari foto Google bila ada (fallback inisial nama).

Alur: `/api/v1/auth/google/start` (302 ke Google + cookie state CSRF) → callback tukar kode → find-or-create user by `google_id` (tautkan via email bila sudah ada) → redirect `FRONTEND_URL/login/callback#token=JWT` (fragment, tidak masuk server log) → SPA verifikasi `/me` + sync.

## Backup SQLite (PRD §21)

```bash
# Volume compose: backup file dari volume
docker run --rm -v catat_uang_app-data:/data -v "$PWD/backup:/backup" \
  alpine tar czf "/backup/app-$(date +%F).db.tgz" -C /data app.db
```

Di Turso, backup memakai CLI-nya:

```bash
turso db shell catat-uang .dump > "backup/app-$(date +%F).sql"
```

Aturan minimal: backup harian, simpan di disk berbeda dari server, uji restore
berkala. Migrasi Drizzle (`apps/api/drizzle/`) jalan saat boot di jalur
Bun/Docker, dan saat build di jalur Vercel.

## Verifikasi pasca-deploy

```bash
curl https://DOMAIN/health
# {"status":"ok"}
curl -s https://DOMAIN/api/v1/auth/google/status
# {"success":true,"data":{"enabled":true}}
```

E2E lokal (21 asersi, skenario PRD §26): `cd apps/api && BASE=http://localhost:3001 ./scripts/e2e.sh`.
