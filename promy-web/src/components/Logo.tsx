type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
type LogoVariant = "default" | "flat" | "mark";

type LogoProps = {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
};

const sizes: Record<LogoSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 56,
  xl: 96,
  hero: 180,
};

const logoSources: Record<LogoVariant, string> = {
  default: "/promy-logo-square.png",
  flat: "/promy-logo.png",
  mark: "/promy-logo.png",
};

/**
 * Logo oficial de PROMY.
 * default → ícono cuadrado amarillo original.
 * flat/mark → mascota P original sin fondo, para piezas grandes o fondos propios.
 */
export function PromyMark({ size = "md", variant = "default", className }: LogoProps) {
  const px = sizes[size];

  return (
    <img
      src={logoSources[variant]}
      width={px}
      height={px}
      className={className}
      alt="PROMY"
      aria-label="PROMY"
      draggable={false}
      decoding="async"
    />
  );
}

/**
 * Logo con wordmark: ícono + "PROMY" en texto.
 * showWordmark=true → lockup horizontal.
 */
export function Logo({
  showWordmark,
  ...props
}: LogoProps & { showWordmark?: boolean }) {
  if (showWordmark) {
    return (
      <div className="brand-lockup">
        <PromyMark {...props} />
        <PromyWordmark />
      </div>
    );
  }
  return <PromyMark {...props} />;
}

export function PromyWordmark({ className }: { className?: string }) {
  return <span className={`promy-wordmark ${className || ""}`}>PROMY</span>;
}

export function BrandLockup({ size = "sm" }: { size?: LogoSize }) {
  return (
    <div className="brand-lockup">
      <PromyMark size={size} variant="default" />
      <PromyWordmark />
    </div>
  );
}
