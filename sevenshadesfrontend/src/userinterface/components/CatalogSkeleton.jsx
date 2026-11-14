import './CatalogSkeleton.css';
export default function CatalogSkeleton({ hero = false }) {
  return <div className="catalog-skeleton" role="status" aria-label="Loading collections" aria-busy="true">
    {hero && <div className="catalog-skeleton-hero skeleton-shimmer" aria-hidden="true" />}
    <div className="catalog-skeleton-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, i) =>
      <div key={i}><div className="catalog-skeleton-image skeleton-shimmer" /><div className="catalog-skeleton-line skeleton-shimmer" /><div className="catalog-skeleton-line short skeleton-shimmer" /></div>)}</div>
  </div>;
}
