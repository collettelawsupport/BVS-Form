type BrandHeaderProps = {
  title: string;
  subtitle: string;
};

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  return (
    <header className="brand-header">
      <div className="brand-header-inner">
        <img
          className="brand-logo"
          src="/collette-law-logo.png"
          alt="Collette Law PLLC logo"
          width="96"
          height="96"
        />
        <div className="brand-copy">
          <p>Collette Law</p>
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </div>
      </div>
    </header>
  );
}
