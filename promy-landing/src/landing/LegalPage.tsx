import { useEffect } from "react";

import { PromyMark } from "./components";
import { legalDocuments, type LegalDocument } from "./legalContent";

type LegalKind = LegalDocument["kind"];

function setMetaContent(selector: string, value: string) {
  const element = window.document.querySelector<HTMLMetaElement>(selector);
  if (element) element.content = value;
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const legalDocument = legalDocuments[kind];
  const alternateKind = kind === "privacy" ? "terms" : "privacy";
  const alternateLabel = kind === "privacy" ? "Ver términos" : "Ver privacidad";

  useEffect(() => {
    const canonicalUrl = `https://promy.app/${kind}`;
    const title = `${legalDocument.title} · PROMY`;
    const description = legalDocument.intro;

    window.document.title = title;
    window.document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
  }, [legalDocument.intro, legalDocument.title, kind]);

  return (
    <div className="landing-legal-page">
      <header className="landing-legal-nav-wrap">
        <nav className="landing-legal-nav" aria-label="Navegación legal">
          <a href="/" className="landing-legal-brand" aria-label="Volver a PROMY">
            <span className="landing-legal-brand-mark">
              <PromyMark simple />
            </span>
            <span>PROMY</span>
          </a>

          <div className="landing-legal-nav-actions">
            <a href="/" className="landing-legal-back">
              Volver a PROMY
            </a>
            <a href={`/${alternateKind}`} className="landing-legal-switch">
              {alternateLabel}
            </a>
          </div>
        </nav>
      </header>

      <main className="landing-legal-layout">
        <section className="landing-legal-hero">
          <div className="landing-legal-hero-copy">
            <div className="landing-legal-eyebrow">{legalDocument.lawLabel}</div>
            <h1>{legalDocument.title}</h1>
            <p>{legalDocument.intro}</p>

            <div className="landing-legal-meta">
              <div>
                <span>Actualización</span>
                <strong>{legalDocument.updatedAt}</strong>
              </div>
              <div>
                <span>Versión</span>
                <strong>{legalDocument.version}</strong>
              </div>
              <div>
                <span>Contacto</span>
                <strong>{legalDocument.contactEmail || "Canal oficial pendiente antes del piloto"}</strong>
              </div>
            </div>
          </div>

          <div className="landing-legal-summary" aria-label="Resumen del documento">
            {legalDocument.summary.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <div className="landing-legal-content-grid">
          <aside className="landing-legal-aside">
            <div className="landing-legal-aside-card">
              <div className="landing-legal-aside-title">Contenido</div>
              <nav className="landing-legal-toc" aria-label="Contenido del documento">
                {legalDocument.sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`}>
                    <span>{section.number}</span>
                    <strong>{section.title}</strong>
                  </a>
                ))}
              </nav>
            </div>

            <div className="landing-legal-aside-card landing-legal-aside-card--accent">
              <div className="landing-legal-aside-title">Contacto útil</div>
              <p>
                Si necesitás hacer una consulta legal o pedir acceso, rectificación o baja de datos,{" "}
                {legalDocument.contactEmail ? (
                  <>escribí a <strong>{legalDocument.contactEmail}</strong>.</>
                ) : (
                  <>el canal oficial se publicará antes de habilitar usuarios externos.</>
                )}
              </p>
            </div>
          </aside>

          <section className="landing-legal-article">
            {legalDocument.sections.map((section) => (
              <article key={section.id} id={section.id} className="landing-legal-section">
                <div className="landing-legal-section-head">
                  <span>{section.number}</span>
                  <h2>{section.title}</h2>
                </div>

                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {section.bullets?.length ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}

            <div className="landing-legal-footer-note">
              <strong>Nota final</strong>
              <p>{legalDocument.footer}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
