export const theme = {
  colors: {
    // ── Fondos ─────────────────────────────
    background: "#FFFDF8",
    surface: "#FFFFFF",
    surfaceAlt: "#FFF3DE",
    surfaceWarm: "#FFF8EA",
    surfaceMuted: "#F6EACD",
    border: "#F0DFC0",

    // ── Dark tokens (headers, hero cards, panels oscuros) ─
    headerDark: "#0F0F10",
    cardDark: "#17181A",
    cardDarkAlt: "#1E1F22",
    mutedOnDark: "rgba(255,255,255,0.66)",
    softOnDark: "rgba(255,255,255,0.42)",
    dividerOnDark: "rgba(255,255,255,0.08)",

    // ── Tipografía ─────────────────────────
    text: "#111111",
    blackSoft: "#111111",
    graphite: "#111111",
    textMuted: "#6A6256",
    textSoft: "#A59A88",
    white: "#FFFFFF",

    // ── Brand ──────────────────────────────
    primary: "#FFBF00",         // amarillo (energía / highlights)
    primaryDark: "#C58A00",
    primarySoft: "#FFE6A0",
    primaryBg: "#FFF8EA",

    accentRed: "#FF3131",        // rojo (acción / descuentos / CTAs)
    accentRedDark: "#E8372A",
    accentRedSoft: "#FFE6E6",

    success: "#24A865",
    successSoft: "#EAF9F1",
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },

  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },

  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 24,
    xxl: 34,
  },

  shadow: {
    soft: {
      shadowColor: "#111111",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    card: {
      shadowColor: "#111111",
      shadowOpacity: 0.10,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    strong: {
      shadowColor: "#111111",
      shadowOpacity: 0.14,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    },
  },
};
