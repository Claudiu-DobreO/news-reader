import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HeadlinesList } from './components/HeadlinesList';
import {
  type NewsArticle,
  type NewsResponse,
  articleKey,
  fetchNewsPage,
  hasNextPage,
} from './lib/newsapi';

const CATEGORIES = [
  'tech',
  'general',
  'science',
  'sports',
  'business',
  'health',
  'entertainment',
  'politics',
  'food',
  'travel',
] as const;

const FAV_STORAGE = 'news-reader-favorites';

function readFavorites(): NewsArticle[] {
  try {
    const raw = localStorage.getItem(FAV_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NewsArticle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function App() {
  const [category, setCategory] = useState<string>('tech');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput, 450);

  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<NewsArticle[]>(() => readFavorites());

  const [page, setPage] = useState(1);
  const [indexOnPage, setIndexOnPage] = useState(0);
  const [activeResponse, setActiveResponse] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const cacheRef = useRef(new Map<string, NewsResponse>());

  const filterCacheKey = useCallback(
    (p: number) => {
      const s = search.trim();
      return `${s ? `s:${s}` : `c:${category}`}:${p}`;
    },
    [category, search],
  );

  useEffect(() => {
    localStorage.setItem(FAV_STORAGE, JSON.stringify(favorites));
  }, [favorites]);

  /** Live feed: reset cache and load when filters change */
  useEffect(() => {
    if (showFavorites) return;
    cacheRef.current = new Map();
    setPage(1);
    setIndexOnPage(0);
    setActiveResponse(null);
    setError(null);
    setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchNewsPage({ page: 1, category, search });
        if (cancelled) return;
        cacheRef.current.set(filterCacheKey(1), data);
        setActiveResponse(data);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [category, search, showFavorites, filterCacheKey]);

  const loadPage = useCallback(
    async (p: number) => {
      const key = filterCacheKey(p);
      const cached = cacheRef.current.get(key);
      if (cached) {
        setError(null);
        setActiveResponse(cached);
        setPage(p);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNewsPage({ page: p, category, search });
        cacheRef.current.set(key, data);
        setActiveResponse(data);
        setPage(p);
        setLoading(false);
      } catch (e) {
        setError((e as Error).message);
        setLoading(false);
      }
    },
    [category, search, filterCacheKey],
  );

  /** Prefetch next page when viewing 2nd article */
  useEffect(() => {
    if (showFavorites || loading) return;
    if (indexOnPage !== 1) return;
    const items = activeResponse?.data ?? [];
    if (!hasNextPage(activeResponse?.meta, page, items.length)) return;
    const nextP = page + 1;
    const nk = filterCacheKey(nextP);
    if (cacheRef.current.has(nk)) return;
    fetchNewsPage({ page: nextP, category, search })
      .then((d) => {
        cacheRef.current.set(nk, d);
      })
      .catch(() => {});
  }, [
    indexOnPage,
    page,
    category,
    search,
    showFavorites,
    loading,
    activeResponse,
    filterCacheKey,
  ]);

  /** Prefetch previous page when first article and not on page 1 */
  useEffect(() => {
    if (showFavorites || loading) return;
    if (indexOnPage !== 0 || page <= 1) return;
    const prevP = page - 1;
    const pk = filterCacheKey(prevP);
    if (cacheRef.current.has(pk)) return;
    fetchNewsPage({ page: prevP, category, search })
      .then((d) => {
        cacheRef.current.set(pk, d);
      })
      .catch(() => {});
  }, [indexOnPage, page, category, search, showFavorites, loading, filterCacheKey]);

  const liveItems = activeResponse?.data ?? [];
  const article = !showFavorites ? liveItems[indexOnPage] ?? null : null;

  const favTotalPages = Math.max(1, Math.ceil(favorites.length / 3));
  const [favPage, setFavPage] = useState(1);
  const [favIndex, setFavIndex] = useState(0);

  useEffect(() => {
    if (showFavorites) {
      setFavPage(1);
      setFavIndex(0);
    }
  }, [showFavorites, favorites.length]);

  useEffect(() => {
    if (!showFavorites || favorites.length === 0) return;
    const maxPage = Math.max(1, Math.ceil(favorites.length / 3));
    setFavPage((p) => Math.min(p, maxPage));
  }, [favorites.length, showFavorites]);

  useEffect(() => {
    if (!showFavorites || favorites.length === 0) return;
    const start = (favPage - 1) * 3;
    const sliceLen = Math.min(3, Math.max(0, favorites.length - start));
    setFavIndex((i) => Math.min(i, Math.max(0, sliceLen - 1)));
  }, [favorites, showFavorites, favPage]);

  const favSlice = useMemo(() => {
    const start = (favPage - 1) * 3;
    return favorites.slice(start, start + 3);
  }, [favorites, favPage]);

  const favArticle = showFavorites ? favSlice[favIndex] ?? null : null;
  const displayArticle = showFavorites ? favArticle : article;
  const displayItems = showFavorites ? favSlice : liveItems;
  const displayPage = showFavorites ? favPage : page;
  const displayIndex = showFavorites ? favIndex : indexOnPage;

  const liveHasPrev = page > 1 || indexOnPage > 0;
  const liveItemsCount = liveItems.length;
  const liveHasNext = (() => {
    if (!liveItemsCount) return false;
    if (indexOnPage < liveItemsCount - 1) return true;
    return hasNextPage(activeResponse?.meta, page, liveItemsCount);
  })();

  const favHasPrev = favPage > 1 || favIndex > 0;
  const favHasNext =
    favSlice.length > 0 &&
    (favIndex < favSlice.length - 1 || favPage < favTotalPages);

  const hasPrev = showFavorites ? favHasPrev : liveHasPrev;
  const hasNext = showFavorites ? favHasNext : liveHasNext;

  const displayLoading = showFavorites ? false : loading;
  const displayError = showFavorites ? null : error;

  const dotLabels: [number, number, number] = useMemo(() => {
    const base = (displayPage - 1) * 3;
    return [base + 1, base + 2, base + 3];
  }, [displayPage]);

  const favDotLabels: [number, number, number] = useMemo(() => {
    const base = (favPage - 1) * 3;
    return [base + 1, base + 2, base + 3];
  }, [favPage]);

  const isFavorite = useCallback(
    (a: NewsArticle) => favorites.some((x) => articleKey(x) === articleKey(a)),
    [favorites],
  );

  const onToggleFavorite = useCallback((a: NewsArticle) => {
    const k = articleKey(a);
    setFavorites((prev) => {
      const exists = prev.some((x) => articleKey(x) === k);
      if (exists) return prev.filter((x) => articleKey(x) !== k);
      return [...prev, a];
    });
  }, []);

  const goFirst = useCallback(() => {
    if (showFavorites) {
      setFavPage(1);
      setFavIndex(0);
      return;
    }
    setIndexOnPage(0);
    void loadPage(1);
  }, [showFavorites, loadPage]);

  const goPrev = useCallback(async () => {
    if (showFavorites) {
      if (favIndex > 0) {
        setFavIndex((i) => i - 1);
      } else if (favPage > 1) {
        const newPage = favPage - 1;
        const start = (newPage - 1) * 3;
        const slice = favorites.slice(start, start + 3);
        const lastIdx = Math.max(0, slice.length - 1);
        setFavPage(newPage);
        setFavIndex(lastIdx);
      }
      return;
    }
    if (indexOnPage > 0) {
      setIndexOnPage((i) => i - 1);
      return;
    }
    if (page <= 1) return;
    const prevP = page - 1;
    const key = filterCacheKey(prevP);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setError(null);
      setActiveResponse(cached);
      setPage(prevP);
      const lastIdx = Math.max(0, (cached.data?.length ?? 1) - 1);
      setIndexOnPage(lastIdx);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNewsPage({ page: prevP, category, search });
      cacheRef.current.set(key, data);
      setActiveResponse(data);
      setPage(prevP);
      const lastIdx = Math.max(0, (data.data?.length ?? 1) - 1);
      setIndexOnPage(lastIdx);
      setLoading(false);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }, [
    showFavorites,
    favIndex,
    favPage,
    favorites,
    indexOnPage,
    page,
    category,
    search,
    filterCacheKey,
  ]);

  const goNext = useCallback(async () => {
    if (showFavorites) {
      if (favIndex < favSlice.length - 1) {
        setFavIndex((i) => i + 1);
      } else if (favPage < favTotalPages) {
        setFavPage((p) => p + 1);
        setFavIndex(0);
      }
      return;
    }
    const len = liveItems.length;
    if (indexOnPage < len - 1) {
      setIndexOnPage((i) => i + 1);
      return;
    }
    if (!hasNextPage(activeResponse?.meta, page, len)) return;
    const nextP = page + 1;
    const key = filterCacheKey(nextP);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setError(null);
      setActiveResponse(cached);
      setPage(nextP);
      setIndexOnPage(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNewsPage({ page: nextP, category, search });
      cacheRef.current.set(key, data);
      setActiveResponse(data);
      setPage(nextP);
      setIndexOnPage(0);
      setLoading(false);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }, [
    showFavorites,
    favIndex,
    favSlice.length,
    favPage,
    favTotalPages,
    liveItems.length,
    indexOnPage,
    page,
    activeResponse?.meta,
    category,
    search,
    filterCacheKey,
  ]);

  const selectIndex = useCallback(
    (i: number) => {
      if (showFavorites) {
        if (i >= 0 && i < favSlice.length) setFavIndex(i);
        return;
      }
      if (i >= 0 && i < liveItems.length) setIndexOnPage(i);
    },
    [showFavorites, favSlice.length, liveItems.length],
  );

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">News Reader</h1>
        <button
          type="button"
          className="mobile-toggle"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          aria-expanded={mobileFiltersOpen}
        >
          {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
      </header>

      <div className="layout">
        <aside
          className={`sidebar ${mobileFiltersOpen ? 'sidebar--open' : ''}`}
          aria-label="Filters and navigation"
        >
          <div className="panel">
            <label className="field">
              <span className="field__label">Search</span>
              <input
                className="field__input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search headlines…"
                disabled={showFavorites}
                autoComplete="off"
              />
            </label>
            <p className="hint">
              With search text, category is ignored for the API request.
            </p>
          </div>

          <div className="panel">
            <p className="field__label">Category</p>
            <div className="cats" role="group" aria-label="Categories">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cat ${category === c ? 'cat--active' : ''}`}
                  onClick={() => setCategory(c)}
                  disabled={showFavorites || !!searchInput.trim()}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar__foot">
            <button
              type="button"
              className={`fav-pill ${showFavorites ? 'fav-pill--on' : ''}`}
              onClick={() => setShowFavorites((v) => !v)}
              aria-pressed={showFavorites}
            >
              {showFavorites ? 'Back to Live' : 'Favorites'}
            </button>
          </div>
        </aside>

        <main className="main" role="main">
          {showFavorites && favorites.length === 0 ? (
            <p className="headlines__empty">No saved articles yet.</p>
          ) : (
            <HeadlinesList
              article={displayArticle}
              itemsOnPage={displayItems}
              page={displayPage}
              indexOnPage={displayIndex}
              hasPrev={hasPrev}
              hasNext={hasNext}
              loading={displayLoading}
              error={displayError}
              dotLabels={showFavorites ? favDotLabels : dotLabels}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onGoFirst={goFirst}
              onGoPrev={goPrev}
              onGoNext={goNext}
              onSelectIndex={selectIndex}
            />
          )}
        </main>
      </div>
    </div>
  );
}
