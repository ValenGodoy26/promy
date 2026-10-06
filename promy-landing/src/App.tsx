import { useState, type FormEvent } from "react";

import { API_BASE_URL, fetchJsonWithDeadline } from "./landing/runtime";
import { useKonamiEgg, useLandingParallax, useNavScrolled, usePauseOffscreenMotion, useRevealOnScroll } from "./landing/hooks";
import {
  BenefitsSection,
  CategoriesSection,
  HeroSection,
  HowSection,
  LandingNav,
  ProductSection,
} from "./landing/sections/DiscoverySections";
import {
  AccessSection,
  FaqSection,
  LandingFooter,
  MerchantSection,
} from "./landing/sections/ConversionSections";
import { KonamiBurst } from "./landing/components";
import { LegalPage } from "./landing/LegalPage";

function LandingHome() {
  const navScrolled = useNavScrolled();
  const [activeFaq, setActiveFaq] = useState(-1);
  const [betaPlatform, setBetaPlatform] = useState<"iPhone" | "Android">("iPhone");
  const [betaEmail, setBetaEmail] = useState("");
  const [betaSubmitting, setBetaSubmitting] = useState(false);
  const [betaSuccess, setBetaSuccess] = useState<string | null>(null);
  const [betaError, setBetaError] = useState<string | null>(null);
  const konamiActive = useKonamiEgg();
  useRevealOnScroll();
  usePauseOffscreenMotion();
  useLandingParallax();

  const handleBetaRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = betaEmail.trim();
    if (!normalizedEmail) {
      setBetaError("Necesitamos un email válido para avisarte apenas habilitemos el acceso.");
      return;
    }

    try {
      setBetaSubmitting(true);
      setBetaError(null);
      setBetaSuccess(null);

      const { response, data } = await fetchJsonWithDeadline<{ ok?: boolean; message?: string }>(
        `${API_BASE_URL}/beta/access-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          city: "Concordia",
          platform: betaPlatform === "iPhone" ? "IPHONE" : "ANDROID",
          source: "landing",
        }),
        },
      );

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.message || "No pudimos guardar tu pedido ahora. Probá de nuevo en un rato.",
        );
      }

      setBetaSuccess(
        data.message ||
          "Listo. Te vamos a avisar apenas habilitemos el acceso en Concordia.",
      );
      setBetaEmail("");
    } catch (error) {
      setBetaError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar tu pedido ahora. Probá de nuevo en un rato.",
      );
    } finally {
      setBetaSubmitting(false);
    }
  };

  return (
    <>
      {konamiActive ? <KonamiBurst /> : null}

      <LandingNav scrolled={navScrolled} />

      <main id="main-content">
        <HeroSection />

        <HowSection />

        <BenefitsSection />

        <ProductSection />

        <CategoriesSection />

        <MerchantSection />

        <AccessSection
          platform={betaPlatform}
          email={betaEmail}
          submitting={betaSubmitting}
          success={betaSuccess}
          error={betaError}
          onPlatformChange={setBetaPlatform}
          onEmailChange={setBetaEmail}
          onSubmit={handleBetaRequestSubmit}
        />

        <FaqSection activeFaq={activeFaq} onActiveFaqChange={setActiveFaq} />
      </main>

      <LandingFooter />
    </>
  );
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/terms" || pathname === "/terminos") {
    return <LegalPage kind="terms" />;
  }

  if (pathname === "/privacy" || pathname === "/privacidad") {
    return <LegalPage kind="privacy" />;
  }

  return <LandingHome />;
}

export default App;

