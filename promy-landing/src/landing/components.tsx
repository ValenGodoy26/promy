import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { commerceLogos, mapDemoPromos, rotatingHeroWords } from "./data";

const mapPinLabels: Record<string, string> = {
  "CAFÉ": "Café",
  GASTRO: "Gastronomía",
  BAR: "Bar",
  "HELADERÍA": "Heladería",
  "PELUQUERÍA": "Peluquería",
};

function MapPinGlyph({ tag }: { tag: string }) {
  switch (tag) {
    case "CAFÉ":
      return (
        <svg viewBox="0 0 24 24" className="interactive-pin-icon" aria-hidden="true">
          <path d="M5 8.75h9.2a0.8 0.8 0 0 1 0.8 0.8v3.2a3.75 3.75 0 0 1-3.75 3.75H8.75A3.75 3.75 0 0 1 5 12.75v-4Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M15 10h1.4a2.1 2.1 0 1 1 0 4.2H15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 18.25h8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case "GASTRO":
      return (
        <svg viewBox="0 0 24 24" className="interactive-pin-icon" aria-hidden="true">
          <path d="M7 4v6.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M5 4v6.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M9 4v6.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M7 10.4v8.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M15.5 4c1.8 1.2 2.6 3 2.6 5.2v9.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 4c-1.2 1.2-1.8 2.6-1.8 4.2 0 1.1 0.3 2 0.9 2.8h3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "BAR":
      return (
        <svg viewBox="0 0 24 24" className="interactive-pin-icon" aria-hidden="true">
          <path d="M7 5.5h10l-3.8 4.9v4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 14.4v4.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M9.4 18.5h5.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case "HELADERÍA":
      return (
        <svg viewBox="0 0 24 24" className="interactive-pin-icon" aria-hidden="true">
          <path d="M9.2 10.3a3.2 3.2 0 1 1 5.6 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M8.2 10.4a2.3 2.3 0 1 1 0.6-4.5 3.6 3.6 0 0 1 6.8 1.2 2.5 2.5 0 1 1 0.2 4.9H8.2Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M10.2 10.8h3.6l-1.8 7.1-1.8-7.1Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="interactive-pin-icon" aria-hidden="true">
          <path d="M7 7.5 17 17.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M17 7.5 7 17.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M10.1 7.6 7.8 5.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M16.2 18.6 13.9 16.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
  }
}


export function launchPromoConfetti(anchor?: HTMLElement | null) {
  if (typeof window === "undefined") return;

  const labels = ["Promo", "Cerca", "Local", "Hoy", "Gratis", "PROMY"];
  const rect = anchor?.getBoundingClientRect();
  const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

  labels.forEach((label, index) => {
    const sticker = document.createElement("span");
    sticker.className = "promo-confetti";
    sticker.textContent = label;
    sticker.style.left = `${originX}px`;
    sticker.style.top = `${originY}px`;
    sticker.style.setProperty("--confetti-x", `${(index - 2.5) * 82 + (index % 2 ? 20 : -20)}px`);
    sticker.style.setProperty("--confetti-rot", `${(index - 2) * 16}deg`);
    sticker.style.setProperty("--confetti-delay", `${index * 35}ms`);
    document.body.appendChild(sticker);
    window.setTimeout(() => sticker.remove(), 1300);
  });
}

export function RotatingHeroWord() {
  const [index, setIndex] = useState(0);
  const wordRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = wordRef.current;
    if (!element) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let timer = 0;
    let inView = true;

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    };

    const start = () => {
      if (timer || document.hidden || !inView) return;
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % rotatingHeroWords.length);
      }, 2500);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          if (inView) start();
          else stop();
        },
        { rootMargin: "100px 0px", threshold: 0.01 },
      );
      observer.observe(element);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    start();

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <>
      <span ref={wordRef} className="rotating-word" aria-hidden="true" data-motion-loop>
        <span key={rotatingHeroWords[index]}>{rotatingHeroWords[index]},</span>
      </span>
      <span className="sr-only">reales</span>
    </>
  );
}

export function PromyMark({
  simple = false,
  className = "",
}: {
  simple?: boolean;
  className?: string;
}) {
  const src = simple ? "/promy-logo-square.webp" : "/promy-logo.webp";
  const width = simple ? 128 : 756;
  const height = simple ? 128 : 938;

  return (
    <img
      className={`promy-eye-mark ${simple ? "promy-eye-mark--square" : "promy-eye-mark--plain"} ${className}`.trim()}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={width}
      height={height}
      loading="eager"
      decoding="async"
    />
  );
}

export function CommerceLogoMarquee() {
  const repeated = [...commerceLogos, ...commerceLogos];

  return (
    <div className="commerce-marquee reveal delay-2" aria-label="Comercios adheridos" data-motion-loop>
      <div className="commerce-marquee-track">
        {repeated.map((logo, index) => (
          <div className="commerce-logo-pill" key={`${logo}-${index}`}>
            <span>{logo.slice(0, 1)}</span>
            {logo}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InteractivePromoMap() {
  const [point, setPoint] = useState({ x: 52, y: 52 });
  const [dragging, setDragging] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const updatePointFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const nextX = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100));
    const nextY = Math.min(88, Math.max(10, ((event.clientY - rect.top) / rect.height) * 100));
    setPoint({ x: nextX, y: nextY });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updatePointFromPointer(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging) updatePointFromPointer(event);
  };

  const onPointerUp = () => setDragging(false);

  const onMapKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 7 : 3;
    const deltas: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = deltas[event.key];
    if (!delta) return;

    event.preventDefault();
    setPoint((current) => ({
      x: Math.min(92, Math.max(8, current.x + delta.x)),
      y: Math.min(88, Math.max(10, current.y + delta.y)),
    }));
  };

  const nearbyPromos = mapDemoPromos
    .map((promo) => ({
      ...promo,
      distance: Math.hypot(promo.x - point.x, promo.y - point.y),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3);

  return (
    <div className="interactive-map-shell reveal delay-1">
      <div
        ref={mapRef}
        className={`interactive-map ${dragging ? "dragging" : ""}`.trim()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onKeyDown={onMapKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Mapa interactivo de promociones. Arrastrá el punto o usá las flechas del teclado para mover tu ubicación de ejemplo."
      >
        <div className="map-demo-chip">Concordia · zona demo</div>
        <div className="map-area-label map-area-label--centro">Centro</div>
        <div className="map-area-label map-area-label--costanera">Costanera</div>
        <div className="map-area-label map-area-label--parque">Plaza</div>

        <svg viewBox="0 0 100 100" className="interactive-map-svg" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="100" rx="5" fill="#EAE2D1" />

          <path d="M76 -4 C80 16 79 34 84 50 C89 68 91 82 90 104 L108 104 L108 -4 Z" fill="#F4D9D5" opacity="0.36" />
          <path d="M-4 73 C15 67 25 72 34 83 C39 90 43 97 46 104 L-4 104 Z" fill="#F4E1A5" opacity="0.5" />
          <rect x="8" y="8" width="17" height="11" rx="5" fill="#E0D6C2" opacity="0.76" />
          <rect x="31" y="8" width="24" height="10" rx="5" fill="#E3D9C7" opacity="0.68" />
          <rect x="60" y="7" width="16" height="11" rx="5" fill="#E1D6C3" opacity="0.72" />

          <g stroke="#CEC4B1" strokeWidth="5.2" fill="none" strokeLinecap="round">
            <path d="M-8 22 C18 25 37 17 62 22 C82 25 92 22 108 24" />
            <path d="M-8 51 C16 45 34 53 55 49 C76 45 91 52 108 47" />
            <path d="M-8 78 C13 72 31 78 52 75 C75 72 88 79 108 73" />
            <path d="M18 -8 C22 21 18 45 24 69 C27 83 29 93 31 108" />
            <path d="M48 -8 C43 20 52 38 49 60 C47 78 52 91 50 108" />
            <path d="M78 -8 C73 18 80 38 77 57 C74 75 80 92 76 108" />
          </g>

          <g stroke="#FFFDF8" strokeWidth="2.65" fill="none" strokeLinecap="round">
            <path d="M-8 22 C18 25 37 17 62 22 C82 25 92 22 108 24" />
            <path d="M-8 51 C16 45 34 53 55 49 C76 45 91 52 108 47" />
            <path d="M-8 78 C13 72 31 78 52 75 C75 72 88 79 108 73" />
            <path d="M18 -8 C22 21 18 45 24 69 C27 83 29 93 31 108" />
            <path d="M48 -8 C43 20 52 38 49 60 C47 78 52 91 50 108" />
            <path d="M78 -8 C73 18 80 38 77 57 C74 75 80 92 76 108" />
          </g>

          <g stroke="#D9CFBD" strokeWidth="1.25" fill="none" strokeLinecap="round" opacity="0.7">
            <path d="M8 35 C30 31 54 36 93 32" />
            <path d="M12 64 C34 58 60 64 94 60" />
            <path d="M36 9 C33 29 39 45 36 91" />
            <path d="M63 9 C60 29 66 48 63 92" />
          </g>

          <circle cx="15" cy="84" r="9" fill="#F0D88E" opacity="0.28" />
          <circle cx="87" cy="16" r="7" fill="#EF9FA5" opacity="0.15" />
        </svg>

        {mapDemoPromos.map((promo) => {
          const isNear = nearbyPromos.some((nearby) => nearby.id === promo.id);

          return (
            <div
              className={`interactive-pin ${promo.tone} ${isNear ? "near" : ""}`.trim()}
              key={promo.id}
              style={{ left: `${promo.x}%`, top: `${promo.y}%` }}
            >
              <MapPinGlyph tag={promo.tag} />
              <span className="sr-only">{mapPinLabels[promo.tag] ?? promo.tag}</span>
            </div>
          );
        })}

        <div className="user-radius" style={{ left: `${point.x}%`, top: `${point.y}%` }} />
        <div className="user-dot-live" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
          <PromyMark simple />
        </div>

        <div className="map-drag-hint">Arrastrá el punto y mirá qué aparece cerca</div>
      </div>

      <div className="interactive-map-panel">
        <div className="interactive-map-kicker">
          <span />
          Tu zona, ahora
        </div>

        <h3>Lo más cerca,<br />primero.</h3>
        <p>
          Mové tu ubicación y PROMY reordena las promociones según dónde estés.
        </p>

        <div className="nearby-demo-list" aria-live="polite">
          {nearbyPromos.map((promo, index) => {
            const minutes = Math.max(1, Math.round(promo.distance / 5));

            return (
              <div
                className={`nearby-demo-card nearby-demo-card--rank-${index + 1}`}
                key={`${promo.id}-${index}`}
              >
                <div className="nearby-demo-copy">
                  <div className="nearby-demo-meta">
                    <small>{promo.tag}</small>
                    {index === 0 ? <span className="nearby-demo-nearest">Más cerca</span> : null}
                  </div>
                  <strong>{promo.title}</strong>
                  <span>{promo.commerce}</span>
                </div>
                <b>{minutes} min</b>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export function KonamiBurst() {
  return (
    <div className="konami-burst" role="status" aria-live="polite">
      <PromyMark className="konami-logo" />
      <div>
        <strong>Promo secreta desbloqueada</strong>
        <span>↑↑↓↓←→←→BA</span>
      </div>
    </div>
  );
}

export function HeroProductShot() {
  return (
    <figure className="hero-product-shot" aria-label="Vista editorial de la app PROMY y una promoción cercana">
      <div className="hero-product-halo" aria-hidden="true" />
      <div className="hero-product-brand" aria-hidden="true">
        <PromyMark />
      </div>

      <div className="hero-product-device">
        <div className="hero-product-notch" aria-hidden="true" />
        <img
          className="hero-product-screen"
          src="/hero-app-feed.webp"
          alt="Pantalla de PROMY con promociones cercanas en Concordia"
          width={720}
          height={1055}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      <div className="hero-product-promo" aria-hidden="true">
        <img
          src="/hero-promo-card.webp"
          alt=""
          width={644}
          height={265}
          loading="eager"
          decoding="async"
        />
        <div className="hero-product-promo-distance">
          <span className="hero-product-distance-dot" />
          A 2 cuadras
        </div>
      </div>
    </figure>
  );
}
export function PlatformAccessTag({
  platform,
  label,
}: {
  platform: "apple" | "google";
  label: string;
}) {
  return (
    <span className="platform-access-tag">
      <span className="platform-access-icon" aria-hidden="true">
        {platform === "apple" ? <AppleIcon /> : <GooglePlayIcon />}
      </span>
      <span>{label}</span>
    </span>
  );
}

export function StoreBadge({
  platform,
  small,
  title,
  celebrate = false,
}: {
  platform: "apple" | "google";
  small?: string;
  title: string;
  celebrate?: boolean;
}) {
  const href = "#cta";

  return (
    <a
      className="store-badge"
      href={href}
      onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
        if (celebrate) {
          launchPromoConfetti(event.currentTarget);
        }
      }}
    >
      <span className="store-badge-icon" aria-hidden="true">
        {platform === "apple" ? <AppleIcon /> : <GooglePlayIcon />}
      </span>
      <span className="store-badge-copy">
        {small ? <small>{small}</small> : null}
        <b>{title}</b>
      </span>
    </a>
  );
}

export function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

export function ArrowRightMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFBF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.04c-.03-2.9 2.37-4.3 2.48-4.37-1.35-1.98-3.45-2.25-4.2-2.28-1.79-.18-3.49 1.05-4.4 1.05-.91 0-2.31-1.02-3.8-1-1.95.03-3.76 1.14-4.76 2.88-2.04 3.52-.52 8.72 1.45 11.57.97 1.4 2.11 2.96 3.6 2.9 1.45-.06 2-.93 3.76-.93s2.25.93 3.79.9c1.56-.03 2.55-1.42 3.5-2.82 1.11-1.61 1.57-3.18 1.59-3.26-.03-.01-3.04-1.17-3.01-4.64zM14.3 3.54c.79-.96 1.33-2.29 1.18-3.62-1.14.05-2.53.76-3.35 1.71-.73.84-1.37 2.2-1.2 3.5 1.27.1 2.58-.64 3.37-1.59z" />
    </svg>
  );
}

export function GooglePlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.6 1.6c-.4.4-.6 1-.6 1.8v17.2c0 .8.2 1.4.6 1.8l9.2-9.2L3.6 1.6zm10.6 10.8L5.4 21.2c.2.1.4.1.6.1.3 0 .6-.1.9-.3l10-5.7-2.7-2.9zm5.9-3.4-3.5-2L14 10.5l3 2.9 3.1-1.8c.8-.5.8-1.6 0-2zM5.4 2.8l8.8 8.8 2.6-2.9-10-5.7c-.5-.3-1-.3-1.4-.2z" />
    </svg>
  );
}

export function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
    </svg>
  );
}
