# News Reader

A small **React + Vite + TypeScript** app with an **Express** proxy that reads from [TheNewsApi](https://www.thenewsapi.com/) (`/v1/news/all` only). The browser never sees your API token; only the server uses it.

The UI is a **Flipboard-style** single-article view: search and categories, pagination with prefetch and in-memory caching, favorites stored in `localStorage`, and a responsive layout (filters drawer on small screens).

## Requirements

- **Node.js** 16 or newer (18+ recommended)

## Quick start

From the **repository root**:

```bash
npm run server:install
```

Configure the API token:

1. Copy `server/.env.example` to `server/.env`.
2. Set `THENEWSAPI_TOKEN` to your real key from TheNewsApi.

Start **both** the proxy and the web app in **one terminal**:

```bash
npm run dev
```

- **Web app:** [http://localhost:5176](http://localhost:5176)
- **API proxy:** [http://localhost:5177](http://localhost:5177) (used by Vite via `/api` in development)

If you prefer two terminals instead:

```bash
npm run server:dev
npm run web:dev
```

Restart the dev processes after changing `server/.env`.

## Scripts (root)

| Script            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Runs proxy (**5177**) and Vite (**5176**) together |
| `npm run server:install` | Installs dependencies under `server/` and `web/` |
| `npm run server:dev`     | Proxy only                                       |
| `npm run web:dev`        | Vite only (expects proxy reachable for `/api`)  |

## Production build (frontend only)

```bash
cd web && npm run build
```

Output is in `web/dist`. For production you still need the Express proxy (or another backend) to attach `api_token` server-side and expose something like `/api/news/all`; the static build does not contain secrets.

## Project layout

| Path        | Role |
| ----------- | ---- |
| `server/`   | Express: `/api/health`, `/api/news/all` → TheNewsApi |
| `web/`      | React app; dev server proxies `/api` → `localhost:5177` |
| `web/src/`  | App, styles, `lib/newsapi.ts`, `components/HeadlinesList.tsx` |

More detail on the proxy: [`server/README.md`](server/README.md).

## Behavior (summary)

- **Language** fixed to `en`, **3 articles per API page**, client shows **one** featured card at a time.
- **Search vs category:** non-empty search sends `search=…` (no `categories`); empty search sends `categories=…` (default **tech**).
- **Caching:** pages cached in memory per filter set; **prefetch** next/previous page per the in-app rules; navigating uses cache when possible to avoid flashing old content.
- **Favorites:** toggle per article; persisted in `localStorage`; sidebar can switch to a favorites-only flow.

## Security

- Put secrets only in **`server/.env`**. The repo **`.gitignore`** ignores `.env` files so they are not committed.
- Do **not** put `THENEWSAPI_TOKEN` in frontend env vars or client code.

## License

Private project; no license specified unless you add one.
