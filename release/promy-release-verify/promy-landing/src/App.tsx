import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

type DelayClass = "" | "delay-1" | "delay-2" | "delay-3";

type Step = {
  number: string;
  title: string;
  description: string;
  delay?: DelayClass;
  icon: ReactElement;
  iconClassName?: string;
};

type Category = {
  label: string;
  title: string;
  sample: string;
  description: string;
  delay?: DelayClass;
  icon: ReactElement;
  iconStyle?: CSSProperties;
};

type Testimonial = {
  quote: string;
  author: string;
  location: string;
  avatar: string;
  avatarStyle?: CSSProperties;
  delay?: DelayClass;
};

type Faq = {
  question: string;
  answer: string;
};

const PANEL_BASE_URL = import.meta.env.VITE_PANEL_BASE_URL?.trim() || "http://localhost:5173";

function buildPanelUrl(path: string) {
  return `${PANEL_BASE_URL}${path}`;
}

const steps: Step[] = [
  {
    number: "PASO 01",
    title: "Descargás la app",
    description: "Pensada para iPhone y Android. El acceso cliente se habilita por etapas.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 19h16" />
      </svg>
    ),
  },
  {
    number: "PASO 02",
    title: "Explorás cerca tuyo",
    description: "Mapa, lista y categorías. Filtrás por rubro, distancia u horario.",
    delay: "delay-1",
    iconClassName: "step-icon soft",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 22s7-8 7-13a7 7 0 1 0-14 0c0 5 7 13 7 13z" />
      </svg>
    ),
  },
  {
    number: "PASO 03",
    title: "Elegís la que te gusta",
    description: "Guardás favoritas, compartís con amigos, te avisamos cuando caducan.",
    delay: "delay-2",
    iconClassName: "step-icon dark",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFBF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
      </svg>
    ),
  },
  {
    number: "PASO 04",
    title: "Mostrás y listo",
    description: "Mostrás la promo en el local. El comercio la valida en segundos.",
    delay: "delay-3",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 3v2" />
        <path d="M16 3v2" />
        <path d="M4 9h16" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    ),
  },
];

const categories: Category[] = [
  {
    label: "CAFETERÍAS",
    title: "Café & desayunos",
    sample: "2x1 en desayuno",
    description: "Café, medialunas, meriendas y beneficios para todos los días.",
    iconStyle: { background: "var(--yellow-soft)" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2">
        <path d="M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" />
        <path d="M16 11h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
        <path d="M8 4v2" />
        <path d="M11 4v2" />
        <path d="M14 4v2" />
      </svg>
    ),
  },
  {
    label: "BARES",
    title: "Bares & tragos",
    sample: "Happy hour",
    description: "Tragos, picadas y salidas con promos claras por horario.",
    delay: "delay-1",
    iconStyle: { background: "#FFE9A8" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2">
        <path d="M3 11c0-4 4-6 9-6s9 2 9 6" />
        <path d="M3 11v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
        <path d="M7 15v5" />
        <path d="M17 15v5" />
      </svg>
    ),
  },
  {
    label: "GASTRO",
    title: "Restaurantes",
    sample: "Hasta 30% OFF",
    description: "Restaurantes y locales gastronómicos con beneficios activos.",
    delay: "delay-2",
    iconStyle: { background: "#FFD1D1" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round">
        <path d="M3 21c3-9 15-9 18 0" />
        <path d="M6 8 5 12" />
        <path d="M9 6 8 12" />
        <path d="M12 5v7" />
        <path d="m15 6 1 6" />
        <path d="m18 8 1 4" />
      </svg>
    ),
  },
  {
    label: "HELADERÍAS",
    title: "Helados",
    sample: "2do 50%",
    description: "Heladerías y antojos cerca tuyo para aprovechar en el momento.",
    delay: "delay-3",
    iconStyle: { background: "var(--yellow)" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2">
        <path d="M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" />
        <path d="m6 22 3-8" />
        <path d="m18 22-3-8" />
        <path d="M12 13v9" />
      </svg>
    ),
  },
  {
    label: "GYM & WELLNESS",
    title: "Gimnasios",
    sample: "1ra clase",
    description: "Gimnasios, clases y bienestar con ofertas simples de probar.",
    iconStyle: { background: "var(--yellow)" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2">
        <path d="M6 10h12" />
        <path d="M3 10v4" />
        <path d="M21 10v4" />
        <path d="M5 8v8" />
        <path d="M19 8v8" />
        <path d="M9 6h6v12H9z" />
      </svg>
    ),
  },
  {
    label: "ESTÉTICA",
    title: "Belleza & spa",
    sample: "Combo spa",
    description: "Belleza, uñas, estética y cuidado personal con promos locales.",
    delay: "delay-1",
    iconStyle: { background: "#FFD1D1" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    label: "PELUQUERÍAS",
    title: "Corte & color",
    sample: "Corte promo",
    description: "Peluquerías y barberías con descuentos o beneficios por turno.",
    delay: "delay-2",
    iconStyle: { background: "var(--ink)", color: "var(--yellow)" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFBF00" strokeWidth="2">
        <path d="m7 17 10-10" />
        <path d="M7 7h.01" />
        <path d="M17 17h.01" />
      </svg>
    ),
  },
  {
    label: "SERVICIOS",
    title: "Talleres, lavaderos",
    sample: "Promo fija",
    description: "Lavaderos, talleres y servicios útiles de la ciudad.",
    delay: "delay-3",
    iconStyle: { background: "var(--yellow)" },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 14h3" />
      </svg>
    ),
  },
];

const testimonials: Testimonial[] = [
  {
    quote: '"Me gusta que PROMY arranque con comercios de acá: abrís, ves qué hay cerca y sabés que la promo existe."',
    author: "Vecina de Concordia",
    location: "CONCORDIA · ENTRE RÍOS",
    avatar: "M",
  },
  {
    quote: '"Para los negocios está bueno porque pueden cargar una oferta simple y medir si la gente la usa."',
    author: "Comercio local",
    location: "CONCORDIA · LANZAMIENTO",
    avatar: "A",
    avatarStyle: { background: "var(--red)", color: "#fff" },
    delay: "delay-1",
  },
  {
    quote: '"La idea es simple: promociones reales, cerca tuyo y sin vueltas raras. Eso es lo que estamos validando."',
    author: "Equipo PROMY",
    location: "CONCORDIA · PRIMERA ETAPA",
    avatar: "J",
    avatarStyle: { background: "var(--ink)", color: "var(--yellow)" },
    delay: "delay-2",
  },
];

const faqs: Faq[] = [
  {
    question: "¿Qué es PROMY?",
    answer:
      "PROMY es una app mobile que te muestra promociones, descuentos y beneficios reales de comercios locales cerca de donde estás. Funciona con geolocalización y hoy está en etapa beta.",
  },
  {
    question: "¿Cómo uso una promo?",
    answer:
      'Elegís la promo, presionás "Usar", vas al comercio y le mostrás la pantalla de canje. El comercio la valida al instante y listo.',
  },
  {
    question: "¿Tiene costo?",
    answer:
      "En esta etapa beta, la app no tiene costo para el usuario. Si eso cambia más adelante, lo vamos a comunicar de forma clara.",
  },
  {
    question: "¿Funciona en mi ciudad?",
    answer:
      "PROMY arranca en Concordia, Entre Ríos. La idea es validar primero con comercios y usuarios locales antes de crecer a otras ciudades.",
  },
  {
    question: "¿Cómo se validan los beneficios?",
    answer:
      "Cada promo tiene un canje único que se valida en el momento con el comercio. No se puede reutilizar y caduca junto con la promoción.",
  },
  {
    question: "¿Cómo me sumo como comercio?",
    answer:
      "Tocá “Soy comercio” para registrarte en el panel web. Te pedimos los datos básicos del local, revisamos la información y te habilitamos la cuenta para cargar promos reales.",
  },
  {
    question: "¿Cuánto cuesta para mi comercio?",
    answer:
      "En la etapa de lanzamiento en Concordia, sumarte no tiene costo. Si más adelante hay planes pagos, lo vamos a comunicar de forma clara y sin letra chica.",
  },
  {
    question: "¿Puedo usarla en iPhone y Android?",
    answer:
      "Sí. La app está pensada para iPhone y Android. Durante el lanzamiento vamos a avisar por nuestros canales cuándo esté disponible para descargar.",
  },
];

const rotatingHeroWords = ["reales", "cerca", "locales", "hoy", "simples"];
const konamiSequence = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const commerceLogos = [
  "Cafeterías",
  "Bares",
  "Heladerías",
  "Peluquerías",
  "Gimnasios",
  "Estética",
  "Gastronomía",
  "Servicios",
  "Comercios de barrio",
  "Promos locales",
];

const mapDemoPromos = [
  { id: 1, x: 24, y: 28, title: "Promo en cafetería", commerce: "Comercio local", tag: "2 cuadras", tone: "red" },
  { id: 2, x: 46, y: 44, title: "Beneficio gastronómico", commerce: "Local de Concordia", tag: "300m", tone: "yellow" },
  { id: 3, x: 67, y: 30, title: "Promo del día", commerce: "Bar de la zona", tag: "5 min", tone: "ink" },
  { id: 4, x: 78, y: 62, title: "Descuento en heladería", commerce: "Heladería local", tag: "650m", tone: "red" },
  { id: 5, x: 35, y: 72, title: "Promo en peluquería", commerce: "Peluquería local", tag: "8 min", tone: "yellow" },
];

type LandingStyleVars = CSSProperties & Record<`--${string}`, string>;

function usePointerEyes() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouchLike = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const getLogos = () => Array.from(document.querySelectorAll<HTMLElement>('.promy-eye-mark[data-animated-eyes="true"]'));

    const setEyesFromPoint = (x: number, y: number) => {
      getLogos().forEach((logo) => {
        const rect = logo.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height * 0.26;
        const angle = Math.atan2(y - centerY, x - centerX);
        const maxDistance = Math.min(10, Math.max(2.4, rect.width * 0.025));
        const strength = Math.min(1, Math.hypot(x - centerX, y - centerY) / 180);
        const distance = maxDistance * strength;

        logo.style.setProperty("--eye-x", `${Math.cos(angle) * distance}px`);
        logo.style.setProperty("--eye-y", `${Math.sin(angle) * distance}px`);
      });
    };

    const setEyesFromTilt = (gamma = 0, beta = 0) => {
      const tiltX = Math.max(-1, Math.min(1, gamma / 24));
      const tiltY = Math.max(-1, Math.min(1, (beta - 35) / 28));

      getLogos().forEach((logo) => {
        const rect = logo.getBoundingClientRect();
        const maxDistance = Math.min(9, Math.max(2.2, rect.width * 0.022));
        logo.style.setProperty("--eye-x", `${tiltX * maxDistance}px`);
        logo.style.setProperty("--eye-y", `${tiltY * maxDistance}px`);
      });
    };

    const resetEyes = () => {
      getLogos().forEach((logo) => {
        logo.style.setProperty("--eye-x", "0px");
        logo.style.setProperty("--eye-y", "0px");
      });
    };

    let frame = 0;
    let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let blinkTimeout = 0;

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          setEyesFromPoint(pointer.x, pointer.y);
          frame = 0;
        });
      }
    };

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.gamma !== "number" && typeof event.beta !== "number") return;
      setEyesFromTilt(event.gamma ?? 0, event.beta ?? 35);
    };

    const blinkLogos = () => {
      getLogos().forEach((logo, index) => {
        window.setTimeout(() => {
          logo.classList.add("is-blinking");
          window.setTimeout(() => logo.classList.remove("is-blinking"), 180);
        }, index * 34);
      });
    };

    const scheduleBlink = (firstRun = false) => {
      if (prefersReduced) return;

      const nextBlink = firstRun ? 1200 : 4000 + Math.random() * 5000;
      blinkTimeout = window.setTimeout(() => {
        blinkLogos();
        scheduleBlink(false);
      }, nextBlink);
    };

    if (!prefersReduced) {
      if (isTouchLike) {
        window.addEventListener("deviceorientation", onDeviceOrientation, true);
      } else {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerleave", resetEyes);
        setEyesFromPoint(pointer.x, pointer.y);
      }

      scheduleBlink(true);
    }

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", resetEyes);
      window.removeEventListener("deviceorientation", onDeviceOrientation, true);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(blinkTimeout);
    };
  }, []);
}
function useKonamiEgg() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let progress = 0;
    let timeout = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === konamiSequence[progress]) {
        progress += 1;
      } else {
        progress = key === konamiSequence[0] ? 1 : 0;
      }

      if (progress === konamiSequence.length) {
        progress = 0;
        setActive(true);
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => setActive(false), 3600);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timeout);
    };
  }, []);

  return active;
}

function launchPromoConfetti(anchor?: HTMLElement | null) {
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

function RotatingHeroWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % rotatingHeroWords.length);
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <span className="rotating-word" aria-hidden="true">
        <span key={rotatingHeroWords[index]}>{rotatingHeroWords[index]},</span>
      </span>
      <span className="sr-only">reales</span>
    </>
  );
}

function DraggableSticker({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;

    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const start = startRef.current;
    setOffset({
      x: start.offsetX + event.clientX - start.pointerX,
      y: start.offsetY + event.clientY - start.pointerY,
    });
  };

  const releaseSticker = () => {
    if (!dragging) return;
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className={`sticker draggable-sticker ${className} ${dragging ? "dragging" : ""}`.trim()}
      style={
        {
          "--drag-x": `${offset.x}px`,
          "--drag-y": `${offset.y}px`,
        } as LandingStyleVars
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={releaseSticker}
      onPointerCancel={releaseSticker}
    >
      {children}
    </div>
  );
}

function PromyMark({
  simple = false,
  className = "",
}: {
  simple?: boolean;
  className?: string;
}) {
  const src = simple ? "/promy-logo-square.png" : "/promy-logo.png";

  return (
    <img
      className={`promy-eye-mark ${simple ? "promy-eye-mark--square" : "promy-eye-mark--plain"} ${className}`.trim()}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading="eager"
      decoding="async"
    />
  );
}

function App() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  usePointerEyes();
  const konamiActive = useKonamiEgg();

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!elements.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Subtle parallax on hero stickers — respects prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const stickers = Array.from(document.querySelectorAll<HTMLElement>(".sticker"));
    if (!stickers.length) return;

    let ticking = false;
    const update = () => {
      const scrollY = window.scrollY;
      stickers.forEach((el, index) => {
        const speed = 0.08 + (index % 3) * 0.04;
        const offset = scrollY * speed;
        el.style.setProperty("--parallax-y", `${offset}px`);
      });
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <SvgDefs />
      {konamiActive ? <KonamiBurst /> : null}

      <nav className={`nav ${navScrolled ? "scrolled" : ""}`} id="nav">
        <div className="nav-inner">
          <a href="#hero" className="nav-logo" aria-label="PROMY">
            <span className="nav-logo-mark">
              <PromyMark simple />
            </span>
            <span>promy</span>
          </a>

          <div className="nav-links">
            <a href="#how">Cómo funciona</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#app">La app</a>
            <a href="#promos">Promos</a>
            <a href="#faq">FAQ</a>
          </div>

          <a href={buildPanelUrl("/register-commerce")} className="nav-ghost">
            Soy comercio <ArrowRightMini />
          </a>

          <a href="#cta" className="nav-cta">
            Ver app cliente
          </a>
        </div>
      </nav>

      <header className="hero" id="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="pill reveal">
                <span className="dot" />
                App cliente en beta para iPhone y Android
              </div>

              <h1 className="hero-title reveal delay-1">
                <span className="hero-title-line hero-title-kicker">Promos <RotatingHeroWord /></span>
                <span className="hero-title-impact marker-smear">
                  <span className="hero-title-impact-light">cerca</span>{" "}
                  <span className="hero-title-impact-strong">tuyo.</span>
                </span>
              </h1>

              <p className="hero-sub reveal delay-2">
                PROMY te muestra promociones y beneficios reales de comercios de Concordia.
                Sin cupones raros, sin vueltas. Sólo abrir la app, elegir y mostrar la promo.
              </p>

              <div className="hero-ctas reveal delay-3">
                <a href="#cta" className="btn-primary">
                  Ver estado de la app
                  <ArrowRightIcon />
                </a>
                <a href="#how" className="btn-ghost">
                  <PlayIcon />
                  Cómo funciona
                </a>
              </div>

              <div className="stores reveal delay-4">
                <StoreBadge platform="apple" small="Beta para" title="iPhone" />
                <StoreBadge platform="google" small="Beta para" title="Android" />
              </div>
              <p className="subtle reveal delay-4" style={{ marginTop: 10 }}>
                Pedí acceso a la beta por mail y te sumamos a la lista según plataforma.
              </p>

              <div className="availability reveal delay-4">
                <span className="blip" />
                Lanzamiento en Concordia
              </div>
            </div>

            <div className="hero-visual reveal delay-2" id="heroVisual">
              <PromyMark className="bigP floaty slow" />

              <DraggableSticker className="red s1">Promo hoy</DraggableSticker>
              <DraggableSticker className="yellow s2">Café cerca</DraggableSticker>
              <DraggableSticker className="ink s3">a 3 cuadras</DraggableSticker>
              <DraggableSticker className="cream tag s5">★ promos reales</DraggableSticker>

              <HeroPhone />
            </div>
          </div>
        </div>
      </header>

      <section className="how" id="how">
        <div className="container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">01 · Cómo funciona</div>
              <h2>
                <span className="h2-soft">Cuatro pasos.</span>
                <br />
                <span className="scribble-word impact-word">Cero</span> vueltas.
              </h2>
            </div>
            <p>
              Bajás la app, activás tu zona y listo. Las promos aparecen solas, con fecha,
              distancia y un botón para canjearlas al toque.
            </p>
          </div>

          <div className="steps">
            {steps.map((step) => (
              <article key={step.number} className={`step reveal ${step.delay ?? ""}`.trim()}>
                <div className="step-num">{step.number}</div>
                <div className={step.iconClassName ?? "step-icon"}>{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.number !== "PASO 04" ? (
                  <svg className="step-arrow" width="32" height="12" viewBox="0 0 32 12" fill="none">
                    <path
                      d="M1 6h28M24 2l5 4-5 4"
                      stroke="#0F0F10"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  </svg>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="benefits" id="beneficios">
        <div className="container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">02 · Beneficios</div>
              <h2>
                Promos <span className="scribble-word">que</span> sí vas a <span className="impact-word">usar.</span>
              </h2>
            </div>
            <p>
              No coleccionás puntos imposibles ni cargás códigos larguísimos. En PROMY todo es
              local, real y de hoy.
            </p>
          </div>

          <div className="bento">
            <div className="bcard b1 reveal">
              <PromyMark className="bcard-brand" />
              <div className="bcard-column">
                <div className="eyebrow light">Lo que diferencia</div>
                <div>
                  <h4>Promociones locales, de verdad.</h4>
                  <p>
                    Arrancamos en Concordia con comercios locales, promos cargadas por negocios
                    reales y validación simple en el local.
                  </p>
                </div>
              </div>
            </div>

            <div className="bcard b2 reveal delay-1">
              <div className="bcard-column">
                <div className="b-big-number text-word">Local</div>
                <div>
                  <h4>Comercios reales del barrio</h4>
                  <p>Cafés, bares, gimnasios, peluquerías y servicios de Concordia.</p>
                </div>
              </div>
            </div>

            <div className="bcard b3 reveal delay-2">
              <div className="bcard-column">
                <ClockIcon />
                <div>
                  <h4>Todo el día, todos los días.</h4>
                  <p>
                    Promos simples, con vigencia clara y comercios que podés visitar en la ciudad.
                  </p>
                </div>
              </div>
            </div>

            <div className="bcard b4 reveal">
              <div className="bcard-inline-meta">
                <div className="mini-dot" />
                <div className="eyebrow">En 3 cuadras</div>
              </div>
              <h4>Descubrí lugares nuevos</h4>
              <p>Negocios de barrio que no conocías, recomendados por gente como vos.</p>
            </div>

            <div className="bcard b5 reveal delay-1">
              <h4>Simple y rápida</h4>
              <p>Tres toques desde abrir la app hasta canjear la promo. Sin captchas.</p>
              <div className="bcard-pill">~3 taps</div>
            </div>

            <div className="bcard b6 reveal delay-2">
              <div className="bcard-media">
                <div className="bcard-media-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
                    <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h4>Todas las promos en una sola app.</h4>
                  <p>
                    No cambies entre apps ni pestañas. Cafés, bares, gimnasios, estética: todo
                    acá.
                  </p>
                </div>
              </div>
            </div>

            <div className="bcard b7 reveal delay-3">
              <div className="bcard-column">
                <div className="b-big-number accent">Beta</div>
                <div>
                  <h4>Acceso por etapas.</h4>
                  <p>La experiencia cliente se está habilitando de forma gradual mientras validamos el producto.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase" id="app">
        <div className="blob yellow" />
        <div className="blob red" />

        <div className="container showcase-container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow light">03 · Dentro de la app</div>
              <h2>
                Hecha para <span className="scribble-word">usarse</span>,
                <br />
                no para <span className="impact-word">mirar.</span>
              </h2>
            </div>
            <p>
              Cuatro pantallas, cero complicación. Diseñada para que Concordia tenga promos
              locales fáciles de encontrar y usar.
            </p>
          </div>

          <InteractivePromoMap />
        </div>
      </section>

      <section className="cats" id="promos">
        <div className="container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">04 · Promos cerca tuyo</div>
              <h2>
                Rubros claros.
                <br />
                <span className="impact-word">Promos simples.</span>
              </h2>
            </div>
            <p>
              PROMY empieza por rubros cotidianos de Concordia: cafés, bares, peluquerías,
              gimnasios, estética, gastronomía y servicios.
            </p>
          </div>

          <div className="cat-grid">
            {categories.map((category, index) => (
              <article
                key={category.title}
                className={`cat cat-shape-${index + 1} reveal ${category.delay ?? ""}`.trim()}
              >
                <div className="cat-icon" style={category.iconStyle}>
                  {category.icon}
                </div>
                <div className="cat-copy">
                  <small>{category.label}</small>
                  <h4>{category.title}</h4>
                  <p>{category.description}</p>
                </div>
                <div className="cat-sample">{category.sample}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="social">
        <div className="container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">05 · Lanzamiento local</div>
              <h2>
                <span className="h2-soft">Primero Concordia.</span>
                <br />
                <span className="scribble-word">Después</span> crecer.
              </h2>
            </div>
            <p>
              Estamos preparando el lanzamiento con comercios reales de Concordia. Sin ciudades
              inventadas, sin métricas infladas y sin testimonios de relleno.
            </p>
          </div>

          <div className="counters">
            <div className="counter reveal">
              <div className="live-badge"><span /> LOCAL</div>
              <div className="big">1</div>
              <div className="lbl">Ciudad inicial: Concordia</div>
            </div>
            <div className="counter reveal delay-1">
              <div className="big text-stat">Real</div>
              <div className="lbl">Comercios cargando promos desde el panel</div>
            </div>
            <div className="counter reveal delay-2">
              <div className="big text-stat">Beta</div>
              <div className="lbl">Prueba local antes de crecer a otras ciudades</div>
            </div>
          </div>

          <CommerceLogoMarquee />

          <div className="tm-grid">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.author}
                className={`tm reveal ${testimonial.delay ?? ""}`.trim()}
              >
                <p>{testimonial.quote}</p>
                <div className="tm-who">
                  <div className="tm-avatar" style={testimonial.avatarStyle}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="tm-name">{testimonial.author}</div>
                    <div className="tm-city">{testimonial.location}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="merch" id="merch">
        <div className="container">
          <div className="merch-inner reveal">
            <PromyMark className="merch-brand" />

            <div>
              <div className="eyebrow light">Para comercios</div>
              <h3>
                ¿Tenés un comercio?
                <br />
                Sumate a PROMY.
              </h3>
              <p>
                Sumate al lanzamiento en Concordia. Cargá tus promos desde el panel, recibí
                canjes y mostrá tu comercio dentro de la app.
              </p>
            </div>

            <a href={buildPanelUrl("/register-commerce")} className="btn-primary">
              Quiero sumar mi comercio
              <ArrowRightIcon />
            </a>
          </div>
        </div>
      </section>

      <section className="final" id="cta">
        <div className="final-phone-float fp1">
          <div className="phone final-inline-phone">
            <div className="phone-notch" />
            <div className="phone-screen final-yellow-screen">
              <div className="final-phone-center">
                <PromyMark className="final-phone-logo" />
              </div>
            </div>
          </div>
        </div>

        <div className="final-phone-float fp2">
          <div className="phone final-inline-phone">
            <div className="phone-notch" />
            <div className="phone-screen final-red-screen">
              <div className="final-phone-copy">
                <div>promos</div>
                <div>cerca</div>
                <div>tuyo.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="final-inner">
            <div className="pill reveal final-pill">
              <span className="dot" />
              App cliente en beta
            </div>

            <h2 className="reveal delay-1">
              Tu próxima promo
              <br />
              <em>está a unas cuadras.</em>
            </h2>

            <p className="final-sub reveal delay-2">
              La experiencia cliente vive en la app mobile. Hoy el acceso se habilita por etapas mientras validamos comercios y promociones reales.
            </p>

            <div className="stores reveal delay-3">
              <StoreBadge platform="apple" small="Beta para" title="iPhone" celebrate />
              <StoreBadge platform="google" small="Beta para" title="Android" celebrate />
            </div>
            <p className="subtle reveal delay-3" style={{ marginTop: 10 }}>
              Cada badge abre un mail listo para pedir acceso a la beta.
            </p>
          </div>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="container">
          <div className="faq-grid">
            <div className="reveal">
              <div className="eyebrow">06 · FAQ</div>
              <h2 className="faq-title">
                Preguntas
                <br />
                frecuentes.
              </h2>
              <p className="subtle faq-copy">
                ¿Querés saber más? Escribinos a{" "}
                <a href="mailto:hola@promy.app" className="faq-mail">
                  hola@promy.app
                </a>{" "}
                y te respondemos.
              </p>
            </div>

            <div className="faq-list reveal delay-1">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <button
                    key={faq.question}
                    type="button"
                    className={`faq-item ${isOpen ? "open" : ""}`.trim()}
                    onClick={() => setActiveFaq(isOpen ? -1 : index)}
                  >
                    <span className="faq-q">
                      <span>{faq.question}</span>
                      <span className="faq-toggle">
                        <PlusIcon />
                      </span>
                    </span>
                    <span className="faq-a">{faq.answer}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="legal" className="legal-band">
        <div className="container">
          <div className="legal-band-head">
            <span className="section-kicker">Legal · Ley 25.326</span>
            <h2>Privacidad y términos claros para usar PROMY.</h2>
            <p>
              Antes de la beta pública dejamos visibles las reglas básicas: qué datos se guardan,
              para qué se usan y cómo funciona la relación entre clientes, comercios y PROMY.
            </p>
          </div>
          <div className="legal-card-grid">
            <article className="legal-card" id="privacidad">
              <h3>Política de privacidad</h3>
              <p>
                Guardamos datos de cuenta, contacto, ciudad, ubicación autorizada, comercios,
                promociones, canjes, notificaciones, favoritos locales y registros técnicos mínimos.
              </p>
              <p>
                Los usamos para operar cuentas, mostrar promos cercanas, validar canjes, moderar
                contenido, prevenir abuso, enviar avisos operativos y cumplir obligaciones legales.
              </p>
              <p>
                Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo
                a hola@promy.app desde el email de tu cuenta.
              </p>
            </article>
            <article className="legal-card" id="terminos">
              <h3>Términos y condiciones</h3>
              <p>
                PROMY conecta clientes con comercios adheridos. Los clientes deben usar la app de buena
                fe y respetar vigencias, límites y condiciones de cada promoción.
              </p>
              <p>
                Los comercios son responsables por sus datos, promociones, precios, stock, atención y
                cumplimiento de lo publicado. PROMY puede moderar, pausar o retirar contenido.
              </p>
              <p>Última actualización: mayo 2026.</p>
            </article>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-col">
              <div className="nav-logo footer-brand">
                <span className="nav-logo-mark">
                  <PromyMark simple />
                </span>
                <span>promy</span>
              </div>
              <div className="foot-brand-tag">
                Promos <em>reales,</em> cerca tuyo.
              </div>
            </div>

            <div className="foot-col">
              <div className="foot-title">Producto</div>
              <ul>
                <li><a href="#how">Cómo funciona</a></li>
                <li><a href="#beneficios">Beneficios</a></li>
                <li><a href="#app">La app</a></li>
                <li><a href="#promos">Categorías</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>

            <div className="foot-col">
              <div className="foot-title">Para comercios</div>
              <ul>
                <li><a href="#merch">Soy comercio</a></li>
                <li><a href={buildPanelUrl("/register-commerce")}>Panel de comercios</a></li>
                <li><a href={buildPanelUrl("/register-commerce")}>Crear cuenta comercio</a></li>
                <li><a href={buildPanelUrl("/login")}>Ingresar al panel</a></li>
              </ul>
            </div>

            <div className="foot-col">
              <div className="foot-title">Promy</div>
              <ul>
                <li><a href="mailto:hola@promy.app?subject=Nosotros%20PROMY">Nosotros</a></li>
                <li><a href="mailto:hola@promy.app?subject=Trabajar%20en%20PROMY">Trabajá con nosotros</a></li>
                <li><a href="mailto:hola@promy.app?subject=Prensa%20PROMY">Prensa</a></li>
                <li><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram ↗</a></li>
                <li><a href="https://tiktok.com" target="_blank" rel="noreferrer">TikTok ↗</a></li>
              </ul>
            </div>
          </div>

          <div className="foot-bottom">
            <div>© 2026 PROMY. Hecho en Argentina.</div>
            <div className="foot-bottom-links">
              <a href="#terminos">Términos</a>
              <a href="#privacidad">Privacidad</a>
              <a href="mailto:hola@promy.app">hola@promy.app</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function StatCounter({
  target,
  label,
  formatter,
  delay = "",
  live = false,
}: {
  target: number;
  label: string;
  formatter: (value: number) => string;
  delay?: DelayClass;
  live?: boolean;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    let frame = 0;
    const duration = 1400;

    const startAnimation = () => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(target * eased));
        if (progress < 1) {
          frame = window.requestAnimationFrame(step);
        }
      };
      frame = window.requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
      startAnimation();
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAnimation();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [target]);

  useEffect(() => {
    if (!live || value < target) return;

    const timer = window.setInterval(() => {
      setValue((current) => current + 1);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [live, target, value]);

  return (
    <div ref={ref} className={`counter reveal ${delay}`.trim()}>
      {live ? <div className="live-badge"><span /> LIVE</div> : null}
      <div className="big">{formatter(value)}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

function CommerceLogoMarquee() {
  const repeated = [...commerceLogos, ...commerceLogos];

  return (
    <div className="commerce-marquee reveal delay-2" aria-label="Comercios adheridos">
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

function InteractivePromoMap() {
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
    if (dragging) {
      updatePointFromPointer(event);
    }
  };

  const onPointerUp = () => setDragging(false);

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
      >
        <svg viewBox="0 0 100 100" className="interactive-map-svg" preserveAspectRatio="none">
          <rect width="100" height="100" rx="4" fill="#E9E2D0" />
          <g stroke="#D2C9B6" strokeWidth="5" fill="none">
            <path d="M-8 18 C20 24 44 15 108 24" />
            <path d="M-8 42 C24 36 54 48 108 39" />
            <path d="M-8 70 C22 66 46 76 108 68" />
            <path d="M17 -8 C23 28 18 60 28 108" />
            <path d="M48 -8 C42 28 56 64 50 108" />
            <path d="M78 -8 C72 20 86 58 74 108" />
          </g>
          <g stroke="#FFFDF8" strokeWidth="2.6" fill="none">
            <path d="M-8 18 C20 24 44 15 108 24" />
            <path d="M-8 42 C24 36 54 48 108 39" />
            <path d="M-8 70 C22 66 46 76 108 68" />
            <path d="M17 -8 C23 28 18 60 28 108" />
            <path d="M48 -8 C42 28 56 64 50 108" />
            <path d="M78 -8 C72 20 86 58 74 108" />
          </g>
        </svg>

        {mapDemoPromos.map((promo) => {
          const isNear = nearbyPromos.some((nearby) => nearby.id === promo.id);

          return (
            <div
              className={`interactive-pin ${promo.tone} ${isNear ? "near" : ""}`.trim()}
              key={promo.id}
              style={{ left: `${promo.x}%`, top: `${promo.y}%` }}
            >
              {promo.tone === "yellow" ? "Hoy" : promo.tone === "ink" ? "★" : "P"}
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
                <div className="eyebrow light">Vista de ejemplo</div>
        <h3>Promos cerca tuyo, de verdad.</h3>
        <p>
          Mové el puntito por la ciudad. Las promos se reordenan por cercanía, como pasa dentro de PROMY.
        </p>

        <div className="nearby-demo-list">
          {nearbyPromos.map((promo) => (
            <div className={`nearby-demo-card ${promo.tone}`} key={promo.id}>
              <div>
                <small>{promo.tag}</small>
                <strong>{promo.title}</strong>
                <span>{promo.commerce}</span>
              </div>
              <b>{Math.max(1, Math.round(promo.distance / 5))} min</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KonamiBurst() {
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

function PhoneCard({
  children,
  title,
  index,
  delay,
}: {
  children: ReactNode;
  title: string;
  index: string;
  delay?: DelayClass;
}) {
  return (
    <div className={`phone-card reveal ${delay ?? ""}`.trim()}>
      <div className="phone-mini">
        <div className="notch" />
        <div className="screen">{children}</div>
      </div>
      <div className="phone-card-label">
        <h4>{title}</h4>
        <small>{index}</small>
      </div>
    </div>
  );
}

function HeroPhone() {
  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="hero-phone-head">
          <div>
            <div className="hero-phone-meta">UBICACIÓN · CONCORDIA</div>
            <div className="hero-phone-title">Hola, Luli</div>
          </div>
          <div className="hero-phone-bell">
            <BellIcon />
          </div>
        </div>

        <div className="hero-phone-search-wrap">
          <div className="hero-phone-search">
            <SearchIcon />
            Buscar promos
          </div>
        </div>

        <div className="hero-phone-filter-row">
          <span className="filter-chip active">Todos</span>
          <span className="filter-chip">Café</span>
          <span className="filter-chip">Gastro</span>
          <span className="filter-chip">Gym</span>
        </div>

        <div className="hero-phone-promo-primary">
          <div className="hero-phone-card-meta">CAFÉ · 2 CUADRAS</div>
          <div className="hero-phone-card-title">Promo en café local</div>
          <div className="hero-phone-card-copy">Hoy hasta las 19:00 · Comercio de Concordia</div>
          <div className="hero-phone-badge">Hoy</div>
        </div>

        <MiniCommerceCard
          icon="🍦"
          title="Heladería local"
          meta="400M · beneficio activo"
        />
        <MiniCommerceCard
          icon="✂"
          title="Peluquería local"
          meta="600M · promo disponible"
        />

        <div className="hero-phone-nav">
          <div className="hero-phone-nav-item active">
            <HomeIcon />
            <span>Inicio</span>
          </div>
          <div className="hero-phone-nav-item">
            <PinIcon />
            <span>Mapa</span>
          </div>
          <div className="hero-phone-nav-item">
            <HeartIcon />
            <span>Favoritas</span>
          </div>
          <div className="hero-phone-nav-item">
            <ProfileIcon />
            <span>Perfil</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseHome() {
  return (
    <>
      <div className="phone-block phone-block-top">
        <div className="hero-phone-meta">HOY · CONCORDIA</div>
        <div className="showcase-greeting">
          Hola,
          <br />
          Luli.
        </div>
      </div>
      <div className="showcase-grid-three">
        <div className="mini-promo red"><span>Café</span><b>Hoy</b></div>
        <div className="mini-promo yellow"><span>Gastro</span><b>Cerca</b></div>
        <div className="mini-promo dark"><span>Gym</span><b>Activo</b></div>
      </div>
      <div className="showcase-list">
        <div className="showcase-label">RECOMENDADAS</div>
        <MiniListRow title="Cafetería local" copy="Promo del día" tone="yellow" />
        <MiniListRow title="Gimnasio de la zona" copy="Beneficio activo" tone="pink" />
      </div>
    </>
  );
}

function ShowcaseExplore() {
  return (
    <>
      <div className="phone-block phone-block-top">
        <div className="showcase-top-row">
          <div className="showcase-top-title">Explorar</div>
          <FilterIcon />
        </div>
        <div className="showcase-search">Buscar una promo</div>
      </div>
      <div className="showcase-chip-row">
        <span className="filter-chip active">Todas</span>
        <span className="filter-chip">Café</span>
        <span className="filter-chip">Gastro</span>
      </div>
      <div className="showcase-stacked-promos">
        <div className="stacked-promo red">
          <div>300M · HOY</div>
          <strong>Promo gastronómica</strong>
        </div>
        <div className="stacked-promo yellow">
          <div>500M · MIÉ</div>
          <strong>Beneficio en bar</strong>
        </div>
        <div className="stacked-promo white">
          <div>700M · HOY</div>
          <strong>Promo de gimnasio</strong>
        </div>
      </div>
    </>
  );
}

function ShowcaseMap() {
  return (
    <div className="map-screen">
      <svg width="100%" height="100%" viewBox="0 0 160 320" preserveAspectRatio="xMidYMid slice" className="map-svg">
        <rect width="160" height="320" fill="#ece6d6" />
        <g stroke="#d6cfbd" strokeWidth="10" fill="none">
          <line x1="-20" y1="60" x2="180" y2="90" />
          <line x1="-20" y1="140" x2="180" y2="160" />
          <line x1="-20" y1="220" x2="180" y2="230" />
          <line x1="40" y1="-20" x2="60" y2="340" />
          <line x1="110" y1="-20" x2="130" y2="340" />
        </g>
        <g stroke="#fff" strokeWidth="6" fill="none">
          <line x1="-20" y1="60" x2="180" y2="90" />
          <line x1="-20" y1="140" x2="180" y2="160" />
          <line x1="-20" y1="220" x2="180" y2="230" />
          <line x1="40" y1="-20" x2="60" y2="340" />
          <line x1="110" y1="-20" x2="130" y2="340" />
        </g>
        <g>
          <circle cx="50" cy="120" r="14" fill="#FF3131" />
          <text x="50" y="124" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">P</text>
          <circle cx="115" cy="180" r="12" fill="#FFBF00" />
          <text x="115" y="183" textAnchor="middle" fill="#0F0F10" fontSize="9" fontWeight="700">Hoy</text>
          <circle cx="80" cy="240" r="11" fill="#0F0F10" />
          <text x="80" y="243" textAnchor="middle" fill="#FFBF00" fontSize="8" fontWeight="700">★</text>
          <circle cx="130" cy="90" r="10" fill="#FF3131" />
          <circle cx="30" cy="200" r="9" fill="#FFBF00" />
        </g>
      </svg>
      <div className="map-user-dot" />
      <div className="map-card">
        <div className="map-card-icon" />
        <div className="map-card-copy">
          <div className="map-card-title">Comercio local</div>
          <div className="map-card-meta">2 cuadras · promo activa</div>
        </div>
        <div className="map-card-action">Ir</div>
      </div>
    </div>
  );
}

function ShowcaseProfile() {
  return (
    <>
      <div className="profile-head">
        <div className="profile-avatar">L</div>
        <div>
          <div className="profile-name">Luli Rivas</div>
          <div className="hero-phone-meta">LULI · CONCORDIA</div>
        </div>
      </div>
      <div className="profile-savings">
        <div className="profile-meta">CANJES DE PRUEBA</div>
        <div className="profile-amount">3</div>
        <div className="profile-copy">beneficios usados en Concordia</div>
      </div>
      <div className="showcase-list profile-list">
        <div className="showcase-label">TUS CANJES</div>
        <div className="history-row">
          <div>
            <b>Comercio local</b>
            <div>Ayer · promo del día</div>
          </div>
          <span>Usada</span>
        </div>
        <div className="history-row">
          <div>
            <b>Heladería local</b>
            <div>Sáb · beneficio activo</div>
          </div>
          <span>Usada</span>
        </div>
      </div>
    </>
  );
}

function MiniCommerceCard({ icon, title, meta }: { icon: string; title: string; meta: string }) {
  return (
    <div className="mini-commerce-card">
      <div className="mini-commerce-icon">{icon}</div>
      <div className="mini-commerce-copy">
        <div className="mini-commerce-title">{title}</div>
        <div className="mini-commerce-meta">{meta}</div>
      </div>
      <div className="mini-commerce-action">Ver</div>
    </div>
  );
}

function MiniListRow({
  title,
  copy,
  tone,
}: {
  title: string;
  copy: string;
  tone: "yellow" | "pink";
}) {
  return (
    <div className="mini-list-row">
      <div className={`mini-list-chip ${tone}`} />
      <div className="mini-list-copy">
        <div>{title}</div>
        <div>{copy}</div>
      </div>
    </div>
  );
}

function StoreBadge({
  platform,
  small,
  title,
  celebrate = false,
}: {
  platform: "apple" | "google";
  small: string;
  title: string;
  celebrate?: boolean;
}) {
  const mailtoHref =
    platform === "apple"
      ? "mailto:hola@promy.app?subject=Beta%20PROMY%20iPhone&body=Hola%20PROMY%2C%20quiero%20pedir%20acceso%20a%20la%20beta%20de%20iPhone."
      : "mailto:hola@promy.app?subject=Beta%20PROMY%20Android&body=Hola%20PROMY%2C%20quiero%20pedir%20acceso%20a%20la%20beta%20de%20Android.";

  return (
    <a
      className="store-badge"
      href={mailtoHref}
      onClick={(event) => {
        if (celebrate) {
          launchPromoConfetti(event.currentTarget);
        }
      }}
    >
      {platform === "apple" ? <AppleIcon /> : <GooglePlayIcon />}
      <div>
        <small>{small}</small>
        <br />
        <b>{title}</b>
      </div>
    </a>
  );
}

function SvgDefs() {
  return null;
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function ArrowRightMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFBF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.04c-.03-2.9 2.37-4.3 2.48-4.37-1.35-1.98-3.45-2.25-4.2-2.28-1.79-.18-3.49 1.05-4.4 1.05-.91 0-2.31-1.02-3.8-1-1.95.03-3.76 1.14-4.76 2.88-2.04 3.52-.52 8.72 1.45 11.57.97 1.4 2.11 2.96 3.6 2.9 1.45-.06 2-.93 3.76-.93s2.25.93 3.79.9c1.56-.03 2.55-1.42 3.5-2.82 1.11-1.61 1.57-3.18 1.59-3.26-.03-.01-3.04-1.17-3.01-4.64zM14.3 3.54c.79-.96 1.33-2.29 1.18-3.62-1.14.05-2.53.76-3.35 1.71-.73.84-1.37 2.2-1.2 3.5 1.27.1 2.58-.64 3.37-1.59z" />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.6 1.6c-.4.4-.6 1-.6 1.8v17.2c0 .8.2 1.4.6 1.8l9.2-9.2L3.6 1.6zm10.6 10.8L5.4 21.2c.2.1.4.1.6.1.3 0 .6-.1.9-.3l10-5.7-2.7-2.9zm5.9-3.4-3.5-2L14 10.5l3 2.9 3.1-1.8c.8-.5.8-1.6 0-2zM5.4 2.8l8.8 8.8 2.6-2.9-10-5.7c-.5-.3-1-.3-1.4-.2z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0F0F10">
      <path d="M12 2a5 5 0 0 1 5 5v3h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h1V7a5 5 0 0 1 5-5z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 18a7 7 0 1 1 5-11.9l4.6 4.6-1.4 1.4-4.6-4.6A5 5 0 1 0 16 11h2a7 7 0 0 1-7 7z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 21-1.4-1.3C5.4 14.8 2 11.7 2 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 3.7-3.4 6.8-8.6 11.7z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M6 12h12" />
      <path d="M10 18h4" />
    </svg>
  );
}

export default App;
