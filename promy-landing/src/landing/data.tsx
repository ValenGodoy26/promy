import type { CSSProperties, ReactElement } from "react";

export type DelayClass = "" | "delay-1" | "delay-2" | "delay-3";

export type Step = {
  title: string;
  description: string;
  delay?: DelayClass;
  icon: ReactElement;
  iconClassName?: string;
};

export type Category = {
  label: string;
  title: string;
  sample: string;
  description: string;
  delay?: DelayClass;
  icon: ReactElement;
  iconStyle?: CSSProperties;
  accent?: "yellow" | "rose" | "ink" | "cream";
  featured?: boolean;
};

export type LaunchNote = {
  quote: string;
  author: string;
  location: string;
  avatar: string;
  avatarStyle?: CSSProperties;
  delay?: DelayClass;
};

export type Faq = {
  question: string;
  answer: string;
  audience: "user" | "merchant";
};

export const steps: Step[] = [
  {
    title: "Entrás",
    description: "Pedís acceso, abrís PROMY en iPhone o Android y activás tu zona.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
      </svg>
    ),
  },
  {
    title: "Explorás",
    description: "Ves promociones por rubro, distancia y horario, cerca de donde estás.",
    delay: "delay-1",
    iconClassName: "step-icon soft",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 22s7-8 7-13a7 7 0 1 0-14 0c0 5 7 13 7 13z" />
      </svg>
    ),
  },
  {
    title: "Elegís",
    description: "Abrís la promo, revisás su vigencia y guardás la que querés aprovechar.",
    delay: "delay-2",
    iconClassName: "step-icon dark",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFBF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
      </svg>
    ),
  },
  {
    title: "Mostrás",
    description: "La mostrás en el local y el comercio valida el canje en segundos.",
    delay: "delay-3",
    iconClassName: "step-icon yellow",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export const categories: Category[] = [
  {
    label: "CAFETERÍAS",
    title: "Café y desayunos",
    sample: "2x1 en desayuno",
    description: "Café, medialunas, meriendas y beneficios para todos los días.",
    accent: "yellow",
    featured: true,
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
    accent: "cream",
    featured: true,
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
    accent: "rose",
    featured: true,
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
    accent: "yellow",
    featured: true,
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
    accent: "yellow",
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
    title: "Belleza y spa",
    sample: "Combo spa",
    description: "Belleza, uñas, estética y cuidado personal con promos locales.",
    delay: "delay-1",
    accent: "rose",
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
    title: "Corte y color",
    sample: "Corte promo",
    description: "Peluquerías y barberías con descuentos o beneficios por turno.",
    delay: "delay-2",
    accent: "ink",
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
    accent: "cream",
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

export const launchNotes: LaunchNote[] = [
  {
    quote: "Estamos preparando PROMY para su primera etapa interna en Concordia.",
    author: "Etapa actual",
    location: "CONCORDIA · PRE-PILOTO",
    avatar: "1",
  },
  {
    quote: "Los comercios podrán cargar promociones y validar cada canje desde su panel.",
    author: "Para comercios",
    location: "FLUJO EN VALIDACIÓN",
    avatar: "2",
    avatarStyle: { background: "var(--red)", color: "#fff" },
    delay: "delay-1",
  },
  {
    quote: "El acceso para usuarios se habilitará de forma gradual cuando el piloto esté listo.",
    author: "Para usuarios",
    location: "ACCESO PRIVADO",
    avatar: "3",
    avatarStyle: { background: "var(--ink)", color: "var(--yellow)" },
    delay: "delay-2",
  },
];

export const faqs: Faq[] = [
  {
    audience: "user",
    question: "¿Cómo uso una promoción?",
    answer:
      'Abrís la promoción que querés aprovechar, revisás su vigencia y elegís "Canjear". En el comercio mostrás el código o QR y la validación se hace en el momento desde PROMY.',
  },
  {
    audience: "user",
    question: "¿Tiene costo?",
    answer:
      "Las condiciones de acceso para usuarios se muestran de forma clara antes de registrarte. Si algo cambia, PROMY lo comunica antes de que afecte tu uso de la app.",
  },
  {
    audience: "user",
    question: "¿Funciona en mi ciudad?",
    answer:
      "PROMY empieza en Concordia, Entre Ríos. A medida que se habiliten nuevas ciudades, las vamos a comunicar desde la app y nuestros canales oficiales.",
  },
  {
    audience: "user",
    question: "¿Puedo usarla en iPhone y Android?",
    answer:
      "Sí. PROMY está preparada para iPhone y Android. En el acceso anticipado podés elegir tu plataforma para que te avisemos cuando se habilite.",
  },
  {
    audience: "merchant",
    question: "¿Cómo me sumo como comercio?",
    answer:
      'Tocá "Soy comercio" para registrarte. Te pedimos los datos básicos del local y, después de la revisión administrativa, podés cargar tus promociones desde el panel.',
  },
  {
    audience: "merchant",
    question: "¿Cómo valido un canje?",
    answer:
      "Cada canje es único. Desde el panel del comercio verificás el código o QR del usuario y lo validás en el momento, respetando la vigencia y las condiciones de la promoción.",
  },
  {
    audience: "merchant",
    question: "¿Cuánto cuesta para mi comercio?",
    answer:
      "Las condiciones comerciales se informan de forma clara antes de activar la cuenta del comercio. No se aplican cambios sin comunicarlos previamente.",
  },
];

export const rotatingHeroWords = ["reales", "cerca", "locales", "hoy", "simples"];
export const konamiSequence = [
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

export const commerceLogos = [
  "Cafeterias",
  "Bares",
  "Heladerías",
  "Peluquerias",
  "Gimnasios",
  "Estetica",
  "Gastronomia",
  "Servicios",
  "Comercios de barrio",
  "Promos locales",
];

export const mapDemoPromos = [
  { id: 1, x: 24, y: 28, title: "2x1 en café + medialuna", commerce: "Café del centro", tag: "CAFÉ", tone: "red" },
  { id: 2, x: 46, y: 44, title: "Beneficio gastronómico", commerce: "Local de Concordia", tag: "GASTRO", tone: "yellow" },
  { id: 3, x: 67, y: 30, title: "Happy hour del día", commerce: "Bar de la zona", tag: "BAR", tone: "ink" },
  { id: 4, x: 78, y: 62, title: "15% OFF en cucuruchos", commerce: "Heladería local", tag: "HELADERÍA", tone: "red" },
  { id: 5, x: 35, y: 72, title: "Corte promo del día", commerce: "Peluquería local", tag: "PELUQUERÍA", tone: "yellow" },
];
