# news-reader API proxy

Express server forwards TheNewsApi requests with `THENEWSAPI_TOKEN` from the environment. The browser never sees the token.

## Setup

1. Copy `.env.example` to `.env` in this folder.
2. Set `THENEWSAPI_TOKEN` to your key from [TheNewsApi](https://www.thenewsapi.com/).

## Run

From the repo root:

```bash
npm run server:dev
```

Server listens on port **5177**. Routes: `/api/health`, `/api/news/all`.

The raw API token is never logged. Request URLs are logged with the token redacted.
