export type MobileLegalSection = {
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type MobileLegalDocument = {
  kind: "terms" | "privacy";
  title: string;
  shortTitle: string;
  intro: string;
  updatedAt: string;
  version: string;
  lawLabel: string;
  contactEmail: string | null;
  summary: Array<{ label: string; value: string }>;
  sections: MobileLegalSection[];
  footer: string;
};

const prePilotNotice =
  "PROMY está en etapa pre-piloto. Este documento describe el funcionamiento técnico conocido y no reemplaza la revisión jurídica pendiente.";

export const mobileLegalDocuments: Record<MobileLegalDocument["kind"], MobileLegalDocument> = {
  privacy: {
    kind: "privacy",
    title: "Política de privacidad",
    shortTitle: "Privacidad",
    intro:
      "Explica qué datos usa PROMY para operar cuentas, mostrar promociones y validar canjes durante la etapa pre-piloto.",
    updatedAt: "14 de septiembre de 2026",
    version: "1.1-prepiloto",
    lawLabel: "Estado técnico pre-piloto · Argentina",
    contactEmail: null,
    summary: [
      { label: "Responsable", value: "Pendiente de definición antes del piloto" },
      { label: "Contacto", value: "Canal oficial pendiente antes del piloto" },
      { label: "Datos", value: "Uso técnico necesario para operar PROMY" },
    ],
    sections: [
      {
        number: "01",
        title: "Estado actual",
        paragraphs: [
          prePilotNotice,
          "La identidad jurídica responsable, el domicilio legal y el canal oficial para privacidad deben publicarse antes de incorporar usuarios externos.",
        ],
      },
      {
        number: "02",
        title: "Datos y uso técnico",
        bullets: [
          "Clientes: datos de cuenta, credenciales protegidas, ciudad declarada, sesiones, notificaciones y canjes.",
          "Ubicación: se usa durante la consulta para ordenar resultados cercanos; PROMY no conserva un historial GPS en el backend.",
          "Comercios: datos de onboarding, catálogo, ubicación del local, imágenes y estadísticas de canjes.",
          "No se procesan pagos ni datos de tarjetas desde PROMY.",
        ],
      },
      {
        number: "03",
        title: "Compartición y seguridad",
        paragraphs: [
          "Un comercio que valida un canje recibe solamente la información necesaria para esa operación. No accede al contacto ni al historial del cliente.",
        ],
        bullets: [
          "Contraseñas hasheadas, sesiones con expiración y rotación de refresh tokens.",
          "Validaciones, límites de uso y sanitización de telemetría para reducir exposición de datos.",
          "Proveedores técnicos se usan únicamente para operar infraestructura, email, notificaciones e imágenes cuando estén configurados.",
        ],
      },
      {
        number: "04",
        title: "Baja y datos que permanecen",
        bullets: [
          "La app permite la baja de una cuenta CLIENT: elimina identidad, credenciales, sesiones, tokens push, notificaciones y canjes no consumados.",
          "Los canjes SUCCESS permanecen sin vínculo con la identidad eliminada para conservar cupos y métricas comerciales.",
          "Las decisiones definitivas sobre logs, backups, solicitudes beta y retención histórica siguen pendientes antes del piloto.",
        ],
      },
      {
        number: "05",
        title: "Tus derechos y contacto",
        paragraphs: [
          "El canal oficial para solicitudes de acceso, rectificación o supresión debe definirse y verificarse antes del piloto. Mientras no exista, PROMY no debe abrir registro público en un entorno real.",
          "Los procedimientos, responsables y plazos aplicables requieren revisión jurídica argentina.",
        ],
      },
    ],
    footer:
      "Esta es una comunicación técnica pre-piloto. Antes de usar PROMY con usuarios externos se publicarán el responsable, el canal oficial y la versión jurídica revisada.",
  },
  terms: {
    kind: "terms",
    title: "Términos y condiciones",
    shortTitle: "Términos",
    intro:
      "Resume las reglas técnicas actuales para clientes, comercios y administradores mientras PROMY se prepara para un piloto controlado.",
    updatedAt: "14 de septiembre de 2026",
    version: "1.1-prepiloto",
    lawLabel: "Estado técnico pre-piloto · Argentina",
    contactEmail: null,
    summary: [
      { label: "Rol de PROMY", value: "Intermediario tecnológico" },
      { label: "Canjes", value: "Únicos y sujetos a vigencia" },
      { label: "Contacto", value: "Canales oficiales pendientes antes del piloto" },
    ],
    sections: [
      {
        number: "01",
        title: "Estado y alcance",
        paragraphs: [
          prePilotNotice,
          "PROMY conecta personas con promociones de comercios locales. No procesa pagos ni reemplaza la relación comercial entre cliente y comercio.",
        ],
      },
      {
        number: "02",
        title: "Cómo funciona",
        bullets: [
          "Clientes exploran promociones, generan un código o QR y el comercio valida el canje.",
          "Comercios completan onboarding, esperan aprobación y publican promociones sujetas a moderación.",
          "Las promociones dependen de su vigencia, horarios y condiciones informadas.",
        ],
      },
      {
        number: "03",
        title: "Reglas de uso",
        bullets: [
          "Los datos y promociones deben ser reales, claros y cumplibles.",
          "No se permiten cuentas falsas, transferencia de códigos, fraude ni intentos de burlar validaciones.",
          "PROMY puede moderar contenido y restringir cuentas ante abuso o incumplimientos.",
        ],
      },
      {
        number: "04",
        title: "Aceptación y cambios pendientes",
        paragraphs: [
          "Las pantallas de registro solicitan aceptar estos términos y la política de privacidad. PROMY no declara actualmente conservar IP, fecha, hora ni versión como evidencia verificable de esa aceptación.",
          "Responsable, domicilio, canales de soporte, moderación, privacidad y alcance jurídico definitivo deben definirse antes del piloto.",
        ],
      },
    ],
    footer:
      "Estos términos técnicos pre-piloto se actualizarán luego de la revisión jurídica y la definición de canales oficiales.",
  },
};
