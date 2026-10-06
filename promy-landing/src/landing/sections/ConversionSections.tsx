import type { ChangeEvent, FormEvent } from "react";

import { faqs } from "../data";
import { buildPanelUrl } from "../runtime";
import { AppleIcon, ArrowRightIcon, ArrowRightMini, GooglePlayIcon, PlusIcon, PromyMark } from "../components";

export function MerchantSection() {
  return (
<section className="merch" id="merch">
        <div className="container">
          <div className="merch-inner reveal">
            <div className="merch-copy">
              <div className="eyebrow light">Para comercios</div>
              <h2>
                ¿Tenés un comercio?
                <br />
                Sumate a PROMY.
              </h2>
              <p>
                Publicá promociones desde el panel, recibí canjes y hacé que tu comercio aparezca
                frente a personas que ya están buscando qué aprovechar cerca.
              </p>
            </div>

            <a href={buildPanelUrl("/register-commerce")} className="btn-primary">
              Quiero sumar mi comercio
              <ArrowRightIcon />
            </a>
          </div>
        </div>
      </section>
  );
}

type AccessSectionProps = {
  platform: "iPhone" | "Android";
  email: string;
  submitting: boolean;
  success: string | null;
  error: string | null;
  onPlatformChange: (value: "iPhone" | "Android") => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function AccessSection({
  platform,
  email,
  submitting,
  success,
  error,
  onPlatformChange,
  onEmailChange,
  onSubmit,
}: AccessSectionProps) {
  return (
    <section className="final" id="cta">
      <div className="container final-container">
        <div className="final-stage reveal">
          <div className="final-copy">
            <div className="pill final-pill">
              <span className="dot" />
              Acceso anticipado · Concordia
            </div>

            <h2>
              <span className="final-title-line">Tu próxima promoción</span>
              <em>
                <span>está a unas</span>
                <span>cuadras.</span>
              </em>
            </h2>

            <p className="final-sub">
              PROMY llega primero a Concordia. Elegí tu plataforma y dejanos tu email para avisarte
              apenas habilitemos el acceso.
            </p>

            <p className="final-city-note">
              <span className="final-city-dot" />
              Primero Concordia. Después, nuevas ciudades.
            </p>
          </div>

          <div className="final-visual" aria-hidden="true" data-parallax="0.012">
            <img
              src="/promy-p-mail.webp"
              alt=""
              width={640}
              height={640}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="final-signup-panel">
            <div className="final-signup-head">
              <span>Acceso</span>
              <strong>Entrá primero.</strong>
            </div>

            <form className="beta-form final-access-form" onSubmit={onSubmit}>
              <fieldset className="final-platform-fieldset">
                <legend>Elegí tu plataforma</legend>
                <div className="final-platforms">
                  <button
                    type="button"
                    className={`final-platform-option ${platform === "iPhone" ? "selected" : ""}`.trim()}
                    aria-pressed={platform === "iPhone"}
                    onClick={() => onPlatformChange("iPhone")}
                  >
                    <span className="final-platform-icon" aria-hidden="true">
                      <AppleIcon />
                    </span>
                    <span>iPhone</span>
                  </button>

                  <button
                    type="button"
                    className={`final-platform-option ${platform === "Android" ? "selected" : ""}`.trim()}
                    aria-pressed={platform === "Android"}
                    onClick={() => onPlatformChange("Android")}
                  >
                    <span className="final-platform-icon" aria-hidden="true">
                      <GooglePlayIcon />
                    </span>
                    <span>Android</span>
                  </button>
                </div>
              </fieldset>

              <div className="final-access-row">
                <label className="final-email-field">
                  <span className="sr-only">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => onEmailChange(event.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-describedby="access-legal-note"
                    required
                  />
                </label>

                <button type="submit" className="btn-primary final-submit" disabled={submitting}>
                  {submitting ? "Guardando..." : "Avisame"}
                  <ArrowRightIcon />
                </button>
              </div>
            </form>

            {success ? <p className="beta-form-status success" role="status" aria-live="polite">{success}</p> : null}
            {error ? <p className="beta-form-status error" role="alert">{error}</p> : null}

            <p className="final-legal" id="access-legal-note">
              Al anotarte aceptás nuestras{" "}
              <a href="/terms" className="faq-mail">
                condiciones de uso
              </a>{" "}
              y la{" "}
              <a href="/privacy" className="faq-mail">
                política de privacidad
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ activeFaq, onActiveFaqChange }: { activeFaq: number; onActiveFaqChange: (index: number) => void }) {
  const userFaqs = faqs
    .map((faq, index) => ({ faq, index }))
    .filter(({ faq }) => faq.audience === "user");
  const merchantFaqs = faqs
    .map((faq, index) => ({ faq, index }))
    .filter(({ faq }) => faq.audience === "merchant");

  const renderFaq = ({ faq, index }: { faq: (typeof faqs)[number]; index: number }) => {
    const isOpen = activeFaq === index;
    const answerId = `faq-answer-${index}`;
    const questionId = `faq-question-${index}`;

    return (
      <div key={faq.question} className={`faq-entry ${isOpen ? "open" : ""}`.trim()}>
        <button
          id={questionId}
          type="button"
          className="faq-item"
          aria-expanded={isOpen}
          aria-controls={answerId}
          onClick={() => onActiveFaqChange(isOpen ? -1 : index)}
        >
          <span className="faq-q">
            <span>{faq.question}</span>
            <span className="faq-toggle" aria-hidden="true">
              <PlusIcon />
            </span>
          </span>
        </button>

        <div
          id={answerId}
          className="faq-a"
          role="region"
          aria-labelledby={questionId}
          hidden={!isOpen}
        >
          {faq.answer}
        </div>
      </div>
    );
  };

  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="faq-head reveal">
          <div>
            <div className="eyebrow">FAQ</div>
            <h2 className="faq-title">
              Preguntas
              <br />
              frecuentes.
            </h2>
          </div>

          <p className="faq-intro">
            Lo importante antes de usar PROMY, tanto si buscás promociones como si tenés un comercio.
            Sin vueltas y con respuestas claras.
          </p>
        </div>

        <div className="faq-groups reveal delay-1">
          <article className="faq-group faq-group--users">
            <div className="faq-group-head">
              <span className="faq-group-kicker">Para usuarios</span>
            </div>
            <div className="faq-list">{userFaqs.map(renderFaq)}</div>
          </article>

          <article className="faq-group faq-group--merchant">
            <div className="faq-group-head">
              <span className="faq-group-kicker">Para comercios</span>
            </div>
            <div className="faq-list">{merchantFaqs.map(renderFaq)}</div>

            <div className="faq-contact">
              <span>¿Te quedó alguna duda?</span>
              <a href="mailto:hola@promy.app">
                hola@promy.app <ArrowRightMini />
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-col foot-col--brand">
            <div className="nav-logo footer-brand">
              <span className="nav-logo-mark">
                <PromyMark simple />
              </span>
              <span>PROMY</span>
            </div>

            <div className="foot-brand-tag">
              <span>Promos reales,</span>
              <em>cerca tuyo.</em>
            </div>

            <p className="foot-brand-copy">
              Promociones locales para descubrir y aprovechar cerca de donde estás.
            </p>
          </div>

          <div className="foot-col">
            <div className="foot-title">Producto</div>
            <ul>
              <li><a href="#how">Cómo funciona</a></li>
              <li><a href="#beneficios">Beneficios</a></li>
              <li><a href="#app">La app</a></li>
              <li><a href="#promos">Promos</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>

          <div className="foot-col">
            <div className="foot-title">Para comercios</div>
            <ul>
              <li><a href="#merch">Soy comercio</a></li>
              <li><a href={buildPanelUrl("/register-commerce")}>Crear cuenta</a></li>
              <li><a href={buildPanelUrl("/login")}>Ingresar al panel</a></li>
            </ul>
          </div>
        </div>

        <div className="foot-bottom">
          <div>© 2026 PROMY · Concordia, Argentina</div>
          <div className="foot-bottom-links">
            <a href="/terms">Términos</a>
            <a href="/privacy">Privacidad</a>
            <a href="mailto:hola@promy.app">hola@promy.app</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
