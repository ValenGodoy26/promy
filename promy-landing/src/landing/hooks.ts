import { useEffect, useRef, useState } from "react";

import { konamiSequence } from "./data";

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useKonamiEgg() {
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

export function useNavScrolled() {
  const [scrolled, setScrolled] = useState(false);
  const lastValueRef = useRef(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const next = window.scrollY > 20;
      if (next !== lastValueRef.current) {
        lastValueRef.current = next;
        setScrolled(next);
      }
    };

    const handleScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return scrolled;
}

export function useRevealOnScroll() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!elements.length) return;

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
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
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

export function usePauseOffscreenMotion() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-motion-loop]"),
    );
    if (!elements.length) return;

    const setPaused = (element: HTMLElement, paused: boolean) => {
      element.classList.toggle("motion-paused", paused);
    };

    if (prefersReducedMotion()) {
      elements.forEach((element) => setPaused(element, true));
      return;
    }

    if (!("IntersectionObserver" in window)) return;

    const visible = new Map<HTMLElement, boolean>();
    const syncDocumentVisibility = () => {
      elements.forEach((element) => {
        setPaused(element, document.hidden || visible.get(element) === false);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          visible.set(element, entry.isIntersecting);
          setPaused(element, document.hidden || !entry.isIntersecting);
        });
      },
      { rootMargin: "160px 0px", threshold: 0.01 },
    );

    elements.forEach((element) => {
      visible.set(element, true);
      observer.observe(element);
    });
    document.addEventListener("visibilitychange", syncDocumentVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncDocumentVisibility);
    };
  }, []);
}

export function useLandingParallax() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    if (!elements.length) return;

    if (prefersReducedMotion()) {
      elements.forEach((element) => element.style.setProperty("--parallax-y", "0px"));
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const viewportCenter = window.innerHeight / 2;

      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -160 || rect.top > window.innerHeight + 160) return;

        const factor = Number(element.dataset.parallax || "0.02");
        const elementCenter = rect.top + rect.height / 2;
        const rawOffset = (viewportCenter - elementCenter) * factor;
        const offset = Math.max(-22, Math.min(22, rawOffset));
        element.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
      });
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}
