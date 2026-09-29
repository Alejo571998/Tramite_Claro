// src/components/BrandMark.tsx — logo (sello con check) + wordmark
export function BrandMark({ href = "#/" }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="Trámite Claro, inicio">
      <svg className="brand__mark" width="32" height="32" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <rect width="34" height="34" rx="9" fill="var(--accent)" />
        <path className="brand__check" d="M9 17.5 L14.5 23 L25 11" stroke="#EAF3EF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="brand__word">
        <em>Trámite</em> <strong>Claro</strong>
      </span>
    </a>
  );
}
