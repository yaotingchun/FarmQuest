"use client";

export function SkeletonBlock({ width, height, style }: { width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  return <div className="skeleton-block" style={{ width, height, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div className="setup-card">
      <div className="skeleton-block" style={{ width: "40%", height: 20, marginBottom: 16 }} />
      <div className="skeleton-block" style={{ width: "100%", height: 14, marginBottom: 10 }} />
      <div className="skeleton-block" style={{ width: "80%", height: 14, marginBottom: 10 }} />
      <div className="skeleton-block" style={{ width: "60%", height: 14 }} />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="setup-page">
      <div className="setup-hero">
        <div className="skeleton-block" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: 16 }} />
        <div className="skeleton-block" style={{ width: "50%", height: 32, marginBottom: 12 }} />
        <div className="skeleton-block" style={{ width: "70%", height: 16 }} />
      </div>
      <div className="setup-grid">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
