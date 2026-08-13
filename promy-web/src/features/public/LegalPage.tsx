import { Link } from "react-router-dom";
import { PromyMark } from "../../components/Logo";
import { legalDocuments } from "./legalContent";

export default function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const document = legalDocuments[kind];
  const alternateKind = kind === "privacy" ? "terms" : "privacy";
  const alternateLabel = kind === "privacy" ? "Ver términos" : "Ver privacidad";

  return (
    <div className="legal-page-v2">
      <nav className="landing-nav legal-nav">
        <div className="landing-nav-start">
          <PromyMark size="sm" variant="default" />
          <span className="landing-nav-wordmark">PROMY</span>
        </div>
        <div className="landing-nav-end">
          <Link to="/" className="landing-btn landing-btn-ghost">
            Volver
          </Link>
          <Link to={`/${alternateKind}`} className="landing-btn landing-btn-primary">
            {alternateLabel}
          </Link>
        </div>
      </nav>

      <main className="legal-layout">
        <section className="legal-hero-card">
          <div className="legal-hero-copy">
            <div className="legal-eyebrow">{document.lawLabel}</div>
            <h1>{document.title}</h1>
            <p>{document.intro}</p>

            <div className="legal-meta-row">
              <div className="legal-meta-pill">
                <span>Actualización</span>
                <strong>{document.updatedAt}</strong>
              </div>
              <div className="legal-meta-pill">
                <span>Versión</span>
                <strong>{document.version}</strong>
              </div>
              <div className="legal-meta-pill">
                <span>Contacto</span>
                <strong>{document.contactEmail}</strong>
              </div>
            </div>
          </div>

          <div className="legal-summary-grid">
            {document.summary.map((item) => (
              <article key={item.label} className="legal-summary-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <div className="legal-content-grid">
          <aside className="legal-aside">
            <div className="legal-aside-card">
              <div className="legal-aside-title">Contenido</div>
              <div className="legal-toc">
                {document.sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="legal-toc-link">
                    <span>{section.number}</span>
                    <strong>{section.title}</strong>
                  </a>
                ))}
              </div>
            </div>

            <div className="legal-aside-card legal-aside-card-highlight">
              <div className="legal-aside-title">Contacto útil</div>
              <p>
                Si necesitás hacer una consulta legal o pedir acceso, rectificación o baja de datos,
                escribí a <strong>{document.contactEmail}</strong>.
              </p>
            </div>
          </aside>

          <section className="legal-article">
            {document.sections.map((section) => (
              <article key={section.id} id={section.id} className="legal-section-card">
                <div className="legal-section-top">
                  <span className="legal-section-number">{section.number}</span>
                  <h2>{section.title}</h2>
                </div>

                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {section.bullets?.length ? (
                  <ul className="legal-bullet-list">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}

            <div className="legal-footer-note">
              <strong>Nota final</strong>
              <p>{document.footer}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
