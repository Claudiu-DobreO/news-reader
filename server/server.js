/**
 * Express proxy for TheNewsApi —/news/all only.
 * Never log the raw API token.
 */
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const PORT = process.env.PORT || 5177;
const UPSTREAM = 'https://api.thenewsapi.com/v1/news/all';

const app = express();

app.disable('x-powered-by');

/**
 * Redact token from a URL string for safe logging.
 * @param {string} url
 * @param {string} token
 */
function redactToken(url, token) {
  if (!token) return url;
  return url.split(token).join('***');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/news/all', async (req, res) => {
  const token = process.env.THENEWSAPI_TOKEN;
  if (!token || !String(token).trim()) {
    return res.status(500).json({
      error: 'Server not configured: missing THENEWSAPI_TOKEN',
    });
  }

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const searchRaw = req.query.search != null ? String(req.query.search).trim() : '';
  const categoriesRaw =
    req.query.categories != null ? String(req.query.categories).trim() : '';

  const params = new URLSearchParams({
    api_token: token,
    language: 'en',
    limit: '3',
    page: String(page),
  });

  if (searchRaw) {
    params.set('search', searchRaw);
  } else {
    params.set('categories', categoriesRaw || 'tech');
  }

  const url = `${UPSTREAM}?${params.toString()}`;
  console.info('[proxy]', redactToken(url, token));

  try {
    const { data, status } = await axios.get(url, {
      validateStatus: () => true,
      timeout: 20000,
    });

    if (status === 429) {
      return res.status(429).json({
        error: 'Daily request limit reached…',
      });
    }
    if (status === 401 || status === 403) {
      return res.status(401).json({
        error: 'TheNewsApi authentication failed…',
      });
    }
    if (status >= 400) {
      const msg =
        (data && (data.message || data.error || data.errors)) ||
        `Upstream error (${status})`;
      return res.status(status).json({ error: String(msg) });
    }

    res.json(data);
  } catch (err) {
    console.error('[proxy] request failed:', err.message);
    res.status(502).json({ error: 'Failed to reach TheNewsApi' });
  }
});

app.listen(PORT, () => {
  console.info(`News proxy listening on http://localhost:${PORT}`);
});
