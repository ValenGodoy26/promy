import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { categories, steps } from "../data";
import { buildPanelUrl } from "../runtime";
import {
  ArrowRightIcon,
  ArrowRightMini,
  HeroProductShot,
  InteractivePromoMap,
  PlayIcon,
  PromyMark,
  PlatformAccessTag,
} from "../components";

export function LandingNav({ scrolled }: { scrolled: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileMenuOpen(false);
      window.requestAnimationFrame(() => mobileToggleRef.current?.focus());
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 981px)");
    const closeOnDesktop = (event?: MediaQueryListEvent) => {
      const isDesktop = event ? event.matches : desktopQuery.matches;
      if (isDesktop) setMobileMenuOpen(false);
    };

    closeOnDesktop();
    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleMobileAnchorClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const hash = event.currentTarget.getAttribute("href");
    setMobileMenuOpen(false);

    if (!hash?.startsWith("#")) return;

    window.requestAnimationFrame(() => {
      const section = document.querySelector<HTMLElement>(hash);
      if (!section) return;

      const destination = section.querySelector<HTMLElement>("h1, h2, h3") ?? section;
      const previousTabIndex = destination.getAttribute("tabindex");
      destination.setAttribute("tabindex", "-1");
      destination.focus({ preventScroll: true });

      const restoreTabIndex = () => {
        if (previousTabIndex === null) destination.removeAttribute("tabindex");
        else destination.setAttribute("tabindex", previousTabIndex);
      };

      destination.addEventListener("blur", restoreTabIndex, { once: true });
    });
  };

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`} id="nav" aria-label="Navegación principal">
      <div className="nav-inner">
        <a href="#hero" className="nav-logo" aria-label="PROMY" onClick={closeMobileMenu}>
          <span className="nav-logo-mark">
            <PromyMark simple />
          </span>
          <span>PROMY</span>
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

        <a href="#cta" className="nav-cta" onClick={closeMobileMenu}>
          Solicitar acceso
        </a>

        <button
          type="button"
          ref={mobileToggleRef}
          className="nav-mobile-toggle"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-panel"
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="nav-mobile-panel" id="mobile-nav-panel" hidden={!mobileMenuOpen}>
        <a href="#how" onClick={handleMobileAnchorClick}>Cómo funciona</a>
        <a href="#app" onClick={handleMobileAnchorClick}>La app</a>
        <a href="#promos" onClick={handleMobileAnchorClick}>Promos</a>
        <a href="#faq" onClick={handleMobileAnchorClick}>Preguntas frecuentes</a>
        <a href={buildPanelUrl("/register-commerce")} className="nav-mobile-commerce" onClick={closeMobileMenu}>
          Soy comercio <ArrowRightMini />
        </a>
      </div>
    </nav>
  );
}

export function HeroSection() {
  return (
<header className="hero" id="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="pill reveal">
                <span className="dot" />
                Acceso anticipado para iPhone y Android
              </div>

              <h1 className="hero-title reveal delay-1">
                <span className="hero-title-line hero-title-kicker">Promos locales,</span>
                <span className="hero-title-impact marker-smear">
                  <span className="hero-title-impact-light">cerca</span>{" "}
                  <span className="hero-title-impact-strong">tuyo.</span>
                </span>
              </h1>

              <p className="hero-sub reveal delay-2">
                PROMY te muestra promociones reales de comercios de Concordia. Sin cupones
                raros ni vueltas: abrís la app, elegís y canjeás.
              </p>

              <div className="hero-ctas reveal delay-3">
                <a href="#cta" className="btn-primary">
                  Solicitar acceso
                  <ArrowRightIcon />
                </a>
                <a href="#how" className="btn-ghost">
                  <PlayIcon />
                  Cómo funciona
                </a>
              </div>

              <div className="hero-platforms reveal delay-4">
                <span className="hero-platforms-label">Disponible para</span>
                <div className="hero-platform-tags" aria-label="Plataformas previstas para el acceso anticipado">
                  <PlatformAccessTag platform="apple" label="iPhone" />
                  <PlatformAccessTag platform="google" label="Android" />
                </div>
              </div>
              <p className="subtle reveal delay-4" style={{ marginTop: 10 }}>
                Elegí tu plataforma y dejanos tu email. Te avisamos cuando abramos nuevos accesos.
              </p>

              <div className="availability reveal delay-4" data-motion-loop>
                <span className="blip" />
                Primero en Concordia · pre-lanzamiento
              </div>
            </div>

            <div className="hero-visual reveal delay-2" id="heroVisual" data-parallax="0.018">
              <HeroProductShot />
            </div>
          </div>
        </div>
      </header>
  );
}

export function HowSection() {
  return (
<section className="how" id="how">
        <div className="container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">Cómo funciona</div>
              <h2>
                <span className="h2-soft">Cuatro pasos.</span>
                <br />
                <span className="scribble-word impact-word">Cero</span> vueltas.
              </h2>
            </div>
            <p>
              Abrís la app, activás tu zona y explorás promociones con fecha, distancia y una
              acción clara para canjearlas.
            </p>
          </div>

          <div className="steps reveal delay-1" data-motion-loop>
            {steps.map((step, index) => (
              <article key={step.title} className={`step step-${index + 1}`}>
                <div className="step-node" aria-hidden="true">
                  <span className={step.iconClassName ?? "step-icon"}>{step.icon}</span>
                </div>
                <div className="step-copy">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                {index < steps.length - 1 ? (
                  <span className="step-connector" aria-hidden="true" />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
  );
}

export function BenefitsSection() {
  return (
<section className="benefits" id="beneficios">
        <div className="container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">Beneficios</div>
              <h2>
                Promos <span className="scribble-word">que</span> sí vas a <span className="impact-word">usar.</span>
              </h2>
            </div>
            <p>
              Sin puntos imposibles ni códigos eternos. PROMY junta promociones locales,
              claras y vigentes en un solo lugar.
            </p>
          </div>

          <div className="benefits-manifesto reveal delay-1">
            <section className="benefit-main">
              <div className="benefit-main-brand benefit-main-brand--phone" aria-hidden="true" data-parallax="-0.014">
                <img
                  src="/promy-p-phone.webp"
                  alt=""
                  width={640}
                  height={640}
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="benefit-label">LOCAL</div>
              <h3>
                <span>Comercios reales,</span>
                <br />
                <em>cerca de donde</em>
                <br />
                <em>estás.</em>
              </h3>
              <p>
                PROMY empieza por Concordia: cafés, bares, gimnasios, peluquerías,
                gastronomía, estética y servicios de la ciudad.
              </p>

              <div className="benefit-rubros" aria-label="Rubros disponibles en PROMY">
                <span>Cafés</span>
                <span>Bares</span>
                <span>Gimnasios</span>
                <span>Belleza</span>
                <span>Gastronomía</span>
                <span>Servicios</span>
              </div>
            </section>

            <div className="benefit-side">
              <article className="benefit-point benefit-point--near">
                <div className="benefit-label">CERCA</div>
                <h3>Promos de tu zona.</h3>
                <p>
                  Descubrís opciones por distancia y ubicación, sin perder tiempo buscando
                  entre lugares que te quedan lejos.
                </p>
                <div className="benefit-distance" aria-hidden="true">
                  <span className="benefit-distance-dot" />
                  400 m
                  <span className="benefit-distance-line" />
                  3 min
                </div>
              </article>

              <article className="benefit-point benefit-point--simple">
                <div className="benefit-label">SIMPLE</div>
                <h3>Sin puntos. Sin códigos. Sin vueltas.</h3>
                <p>
                  Abrís una promoción, revisás su vigencia y la mostrás en el local. Nada más.
                </p>
              </article>
            </div>

          </div>
        </div>
      </section>
  );
}

export function ProductSection() {
  return (
<section className="showcase" id="app">
        <div className="blob yellow" />
        <div className="blob red" />

        <div className="container showcase-container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow light">Dentro de la app</div>
              <h2 className="showcase-title">
                Hecha para <span className="scribble-word">usarse,</span>
                <br />
                no para <span className="impact-word">mirar.</span>
              </h2>
            </div>
            <p className="showcase-intro-copy">
              <span>Todo lo importante, sin complicación.</span>
              <span>Diseñada para Concordia:</span>
              <span>promos fáciles de encontrar y usar.</span>
            </p>
          </div>

          <InteractivePromoMap />
        </div>
      </section>
  );
}

export function CategoriesSection() {
  const [showAllMobileCategories, setShowAllMobileCategories] = useState(false);
  const featuredCategories = categories.filter((category) => category.featured);
  const secondaryCategories = categories.filter((category) => !category.featured);

  return (
<section className="cats" id="promos">
        <div className="container">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">Promos cerca tuyo</div>
              <h2>
                Rubros claros.
                <br />
                <span className="impact-word">Promos simples.</span>
              </h2>
            </div>
            <p>
              Cafés, bares, peluquerías, gimnasios, estética, gastronomía y servicios,
              ordenados para encontrar rápido lo que te sirve.
            </p>
          </div>

          <div className="cats-editorial reveal delay-1">
            <div className="cats-featured-grid">
              {featuredCategories.map((category) => (
                <article
                  key={category.title}
                  className={`promo-lane promo-lane--${category.accent ?? "cream"}`}
                >
                  <div className="promo-lane-head">
                    <small>{category.label}</small>
                    <span className="promo-lane-sample">{category.sample}</span>
                  </div>

                  <div className="promo-lane-body">
                    <div className="promo-lane-icon" style={category.iconStyle}>
                      {category.icon}
                    </div>

                    <div className="promo-lane-copy">
                      <h3>{category.title}</h3>
                      <p>{category.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div id="cats-secondary-mobile" className={`cats-secondary-grid ${showAllMobileCategories ? "mobile-expanded" : ""}`.trim()}>
              {secondaryCategories.map((category) => (
                <article
                  key={category.title}
                  className={`promo-mini promo-mini--${category.accent ?? "cream"}`}
                >
                  <div className="promo-mini-top">
                    <div className="promo-mini-icon" style={category.iconStyle}>
                      {category.icon}
                    </div>
                    <span className="promo-mini-sample">{category.sample}</span>
                  </div>

                  <div className="promo-mini-copy">
                    <small>{category.label}</small>
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="cats-mobile-toggle"
              aria-expanded={showAllMobileCategories}
              aria-controls="cats-secondary-mobile"
              onClick={() => setShowAllMobileCategories((visible) => !visible)}
            >
              {showAllMobileCategories ? "Ver menos categorías" : "Ver más categorías"}
              <span aria-hidden="true">{showAllMobileCategories ? "↑" : "↓"}</span>
            </button>
          </div>
        </div>
      </section>
  );
}
