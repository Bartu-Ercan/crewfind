type BrandProps = {
  highlight?: "crew" | "find";
};

export function Brand({ highlight = "crew" }: BrandProps) {
  return (
    <div className={`brand brand-${highlight}`} aria-label="CrewFind">
      <span className="brand-highlight" aria-hidden="true" />
      <span className="brand-word brand-word-crew">Crew</span>
      <span className="brand-word brand-word-find">Find</span>
    </div>
  );
}
