export type NewsArticle = {
  uuid?: string;
  title?: string;
  description?: string;
  snippet?: string;
  url?: string;
  image_url?: string | null;
  published_at?: string;
  source?: string;
  categories?: string[];
};

export type NewsMeta = {
  found?: number;
  returned?: number;
  limit?: number;
  page?: number;
};

export type NewsResponse = {
  data?: NewsArticle[];
  meta?: NewsMeta;
};

export type FetchNewsParams = {
  page: number;
  category: string;
  search: string;
};

function buildQuery(params: FetchNewsParams): URLSearchParams {
  const q = new URLSearchParams({
    language: 'en',
    limit: '3',
    page: String(params.page),
  });
  const s = params.search.trim();
  if (s) {
    q.set('search', s);
  } else {
    q.set('categories', params.category || 'tech');
  }
  return q;
}

/**
 * Returns the relative URL used by the Vite dev proxy (no token).
 */
export function getProxiedNewsUrl(params: FetchNewsParams): string {
  const qs = buildQuery(params);
  return `/api/news/all?${qs.toString()}`;
}

export async function fetchNewsPage(
  params: FetchNewsParams,
): Promise<NewsResponse> {
  const path = getProxiedNewsUrl(params);
  // Debugging: log proxied path only (never contains api_token)
  console.info('[news] proxied URL:', path);

  const res = await fetch(path);
  const json = (await res.json()) as NewsResponse & { error?: string };

  if (!res.ok) {
    const errMsg = json.error || `Request failed (${res.status})`;
    throw new Error(errMsg);
  }

  return json;
}

export function articleKey(a: NewsArticle): string {
  return String(a.uuid || a.url || a.title || Math.random());
}

export function hasNextPage(meta: NewsMeta | undefined, page: number, count: number): boolean {
  if (!meta) return count >= 3;
  const found = meta.found;
  if (typeof found === 'number') {
    return (page - 1) * 3 + count < found;
  }
  return count >= 3;
}
