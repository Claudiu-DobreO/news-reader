import type { NewsArticle } from '../lib/newsapi';

export type HeadlinesListProps = {
  article: NewsArticle | null;
  itemsOnPage: NewsArticle[];
  page: number;
  indexOnPage: number;
  hasPrev: boolean;
  hasNext: boolean;
  loading: boolean;
  error: string | null;
  dotLabels: [number, number, number];
  isFavorite: (a: NewsArticle) => boolean;
  onToggleFavorite: (a: NewsArticle) => void;
  onGoFirst: () => void;
  onGoPrev: () => void;
  onGoNext: () => void;
  onSelectIndex: (i: number) => void;
};

export function HeadlinesList({
  article,
  itemsOnPage,
  page,
  indexOnPage,
  hasPrev,
  hasNext,
  loading,
  error,
  dotLabels,
  isFavorite,
  onToggleFavorite,
  onGoFirst,
  onGoPrev,
  onGoNext,
  onSelectIndex,
}: HeadlinesListProps) {
  const title = article?.title || 'No headline';
  const description = article?.description || article?.snippet || '';
  const image = article?.image_url || '/placeholder.png';
  const href = article?.url || '#';
  const when = article?.published_at || '';
  const source = article?.source || '';
  const saved = article ? isFavorite(article) : false;

  return (
    <section className="headlines" aria-label="Featured article" role="region">
      {error && (
        <div className="headlines__error" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="headlines__skeleton" aria-busy="true" aria-label="Loading">
          <div className="skeleton__media" />
          <div className="skeleton__lines">
            <div className="skeleton__line w80" />
            <div className="skeleton__line w60" />
            <div className="skeleton__line w40" />
          </div>
        </div>
      )}

      {!loading && article && (
        <>
          <article className="feature-card">
            <div className="feature-card__mediaWrap">
              <img
                src={image}
                alt={article.title ? `Illustration for ${article.title}` : 'Article image'}
                className="feature-card__image"
                loading="lazy"
              />
              <div className="feature-card__panel">
                <p className="feature-card__meta">
                  {source}
                  {when ? ` · ${new Date(when).toLocaleString()}` : ''}
                </p>
                <h2 className="feature-card__title">{title}</h2>
                <p className="feature-card__desc">{description}</p>
                <div className="feature-card__actions">
                  <a
                    className="feature-card__cta"
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    View Full Article
                  </a>
                  <button
                    type="button"
                    className={`favorite-btn ${saved ? 'favorite-btn--on' : ''}`}
                    onClick={() => onToggleFavorite(article)}
                    aria-pressed={saved}
                    aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
                  >
                    {saved ? 'Remove from Favorites' : 'Save to Favorites'}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <nav className="pager" aria-label="Article pagination">
            <div className="pager__inner">
              <button
                type="button"
                className="pager__btn pager__circle"
                onClick={onGoFirst}
                aria-label="First page"
                title="First"
              >
                «
              </button>
              <button
                type="button"
                className="pager__btn pager__circle"
                onClick={onGoPrev}
                disabled={!hasPrev}
                aria-label="Previous article"
                title="Previous"
              >
                ‹
              </button>
              <div className="pager__dots" role="group" aria-label="Articles on this page">
                {itemsOnPage.map((row, i) => {
                  const label = dotLabels[i] ?? 0;
                  const active = i === indexOnPage;
                  return (
                    <button
                      key={`${label}-${row.uuid ?? i}`}
                      type="button"
                      className={`pager__dot ${active ? 'pager__dot--active' : ''}`}
                      onClick={() => onSelectIndex(i)}
                      aria-current={active ? 'true' : undefined}
                      aria-label={`Article ${label}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="pager__btn pager__circle"
                onClick={onGoNext}
                disabled={!hasNext}
                aria-label="Next article"
                title="Next"
              >
                ›
              </button>
            </div>
            <p className="pager__hint">
              Page {page} — article {(page - 1) * 3 + indexOnPage + 1}
            </p>
          </nav>
        </>
      )}

      {!loading && !article && !error && (
        <p className="headlines__empty">No articles to show.</p>
      )}
    </section>
  );
}
