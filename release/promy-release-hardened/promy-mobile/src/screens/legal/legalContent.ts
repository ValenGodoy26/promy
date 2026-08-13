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
  contactEmail: string;
  summary: Array<{ label: string; value: string }>;
  sections: MobileLegalSection[];
  footer: string;
};

export const mobileLegalDocuments: Record<MobileLegalDocument["kind"], MobileLegalDocument> = {
  privacy: {
    kind: "privacy",
    title: "Política de privacidad",
    shortTitle: "Privacidad",
    intro:
      "Esta política explica qué datos personales recolecta PROMY, para qué se usan, con quién se comparten, cuánto tiempo se conservan y qué derechos podés ejercer.",
    updatedAt: "6 de mayo de 2026",
    version: "1.0",
    lawLabel: "Ley 25.326 · AAIP · Argentina",
    contactEmail: "privacidad@promy.app",
    summary: [
      { label: "Responsable", value: "PROMY · Concordia, Entre Ríos" },
      { label: "Contacto", value: "privacidad@promy.app" },
      { label: "Derechos", value: "Acceso, rectificación, supresión y oposición" },
    ],
    sections: [
      {
        number: "01",
        title: "Responsable del tratamiento",
        paragraphs: [
          "El responsable del tratamiento de tus datos personales es PROMY, con domicilio en Concordia, Entre Ríos, Argentina.",
          "Si PROMY adopta una forma societaria formal, esta página se actualizará con esos datos.",
        ],
      },
      {
        number: "02",
        title: "Datos que recolectamos",
        bullets: [
          "Clientes: nombre, email, teléfono opcional, contraseña hasheada, fecha de nacimiento si la cargás, ciudad, tokens push y tokens de sesión.",
          "Uso de la app: ubicación GPS aproximada solo para mostrar promos cercanas, favoritos, historial de canjes, notificaciones y datos técnicos básicos.",
          "Comercios: datos del responsable, nombre comercial, descripción, dirección, coordenadas, ciudad, categoría, Instagram opcional, imágenes y promociones.",
          "No recolectamos tarjetas, datos bancarios, contactos, fotos o micrófono.",
        ],
      },
      {
        number: "03",
        title: "Finalidades de uso",
        bullets: [
          "Crear y proteger cuentas.",
          "Mostrar promociones cercanas.",
          "Generar y validar canjes.",
          "Enviar avisos operativos o notificaciones relevantes.",
          "Moderar comercios y promociones.",
          "Mejorar la plataforma con datos agregados.",
          "Cumplir obligaciones legales.",
        ],
        paragraphs: [
          "No usamos tus datos para publicidad de terceros ni para perfilamiento publicitario.",
        ],
      },
      {
        number: "04",
        title: "Con quién compartimos datos",
        bullets: [
          "Con el comercio que valida un canje: código, nombre y fecha/hora del canje.",
          "Con proveedores de hosting, base de datos, email, push notifications y almacenamiento de imágenes, solo para que PROMY funcione.",
          "Con autoridades cuando exista un requerimiento formal y legalmente válido.",
        ],
        paragraphs: [
          "PROMY no vende tus datos ni los cede para campañas publicitarias de terceros.",
        ],
      },
      {
        number: "05",
        title: "Conservación",
        bullets: [
          "Cuenta activa: mientras la cuenta siga operativa.",
          "Cuenta dada de baja: eliminación de datos personales identificables dentro de 30 días.",
          "Canjes: se pueden conservar en forma anónima para auditoría y estadísticas.",
          "Logs técnicos: hasta 12 meses.",
        ],
      },
      {
        number: "06",
        title: "Seguridad",
        bullets: [
          "Contraseñas protegidas con bcrypt.",
          "Tokens firmados, expiración corta y refresh rotativo.",
          "HTTPS en producción.",
          "Controles de abuso y validación de archivos.",
          "Acceso restringido al panel de administración.",
        ],
      },
      {
        number: "07",
        title: "Tus derechos ARCO",
        bullets: [
          "Acceso",
          "Rectificación",
          "Cancelación o supresión",
          "Oposición",
        ],
        paragraphs: [
          "Podés ejercerlos escribiendo a privacidad@promy.app desde el email registrado. El plazo estimado de respuesta es de 10 días corridos.",
        ],
      },
      {
        number: "08",
        title: "Menores y transferencias",
        paragraphs: [
          "PROMY no está dirigida a menores de 18 años.",
          "Algunos proveedores pueden operar fuera de Argentina, principalmente en Estados Unidos o Europa, bajo estándares reconocidos de seguridad y privacidad.",
        ],
      },
      {
        number: "09",
        title: "Cambios y contacto",
        paragraphs: [
          "Si esta política cambia de forma sustancial, PROMY lo avisará dentro de la app y/o por email antes de que el cambio entre en vigor.",
          "Contacto de privacidad: privacidad@promy.app · Domicilio: Concordia, Entre Ríos, Argentina.",
        ],
      },
    ],
    footer:
      "Al usar PROMY aceptás esta política. Si no estás de acuerdo con ella, no podés usar la plataforma.",
  },
  terms: {
    kind: "terms",
    title: "Términos y condiciones",
    shortTitle: "Términos",
    intro:
      "Estos términos regulan el uso de PROMY por clientes, comercios y administradores. Al usar la plataforma aceptás estas condiciones junto con la política de privacidad.",
    updatedAt: "6 de mayo de 2026",
    version: "1.0",
    lawLabel: "República Argentina · Defensa del consumidor",
    contactEmail: "soporte@promy.app",
    summary: [
      { label: "Rol de PROMY", value: "Intermediario tecnológico" },
      { label: "Edad mínima", value: "18 años o autorización válida" },
      { label: "Canjes", value: "Personales, únicos y sujetos a vigencia" },
    ],
    sections: [
      {
        number: "01",
        title: "Qué es PROMY",
        paragraphs: [
          "PROMY conecta personas que buscan promociones reales con comercios locales que las ofrecen.",
          "PROMY no vende productos ni servicios propios: facilita descubrimiento, validación y seguimiento de beneficios.",
        ],
      },
      {
        number: "02",
        title: "Quién puede usar PROMY",
        bullets: [
          "Clientes: mayores de 18 años o con autorización válida, con datos reales y email verificado antes de canjear.",
          "Comercios: actividad real y legal en Argentina, datos verdaderos y responsabilidad por sus promociones.",
        ],
      },
      {
        number: "03",
        title: "Cómo funciona el servicio",
        bullets: [
          "Clientes: se registran, verifican email, exploran promociones y generan un canje mediante código o QR.",
          "Comercios: se registran, completan perfil, esperan aprobación, cargan promociones y validan canjes.",
          "Cada promoción pasa por moderación antes de mostrarse a clientes.",
        ],
      },
      {
        number: "04",
        title: "Reglas para clientes",
        bullets: [
          "No se permiten cuentas falsas, múltiples cuentas ni emails desechables.",
          "Los códigos de canje son personales y no pueden venderse, transferirse ni regalarse.",
          "No se puede burlar el sistema ni intentar validar canjes ajenos.",
          "Cada promoción se puede canjear una sola vez por persona, salvo que se indique otra cosa.",
          "Las promociones dependen de vigencia, horarios y condiciones del comercio.",
        ],
      },
      {
        number: "05",
        title: "Reglas para comercios",
        bullets: [
          "Las promociones deben ser reales, claras y cumplibles.",
          "Cada canje válido debe respetarse dentro de la vigencia y condiciones publicadas.",
          "No se puede cobrar más por usar una promo de PROMY que el precio declarado.",
          "El comercio es responsable por stock, calidad, precios, productos y atención.",
        ],
      },
      {
        number: "06",
        title: "Qué hace y qué no hace PROMY",
        paragraphs: [
          "PROMY sí muestra promociones verificadas, genera códigos únicos, modera contenido y guarda historial de canjes.",
          "PROMY no procesa pagos, no garantiza la calidad del comercio y no reemplaza la relación comercial entre cliente y local.",
        ],
      },
      {
        number: "07",
        title: "Responsabilidad de PROMY",
        bullets: [
          "PROMY no responde por calidad, stock, atención o promesas del comercio.",
          "Tampoco responde por interrupciones causadas por proveedores externos o por problemas técnicos del dispositivo del usuario.",
          "La responsabilidad total de PROMY se limita al monto de promociones efectivamente canjeadas en los últimos 30 días o $10.000 ARS, lo que sea menor, en la máxima medida permitida por la ley.",
        ],
      },
      {
        number: "08",
        title: "Contenido, propiedad intelectual y moderación",
        bullets: [
          "Los comercios son responsables de textos, imágenes, precios y condiciones que publiquen.",
          "PROMY puede moderar, eliminar promociones, suspender comercios o bloquear cuentas ante abuso o incumplimientos.",
          "La marca, el logo, la app, el panel y el código fuente de PROMY son propiedad de la plataforma.",
        ],
      },
      {
        number: "09",
        title: "Bajas, cambios y jurisdicción",
        paragraphs: [
          "Podés pedir la baja de tu cuenta escribiendo a privacidad@promy.app desde el email registrado.",
          "PROMY puede suspender cuentas ante fraude, incumplimientos reiterados o requerimientos formales.",
          "Estos términos se rigen por las leyes de la República Argentina y, salvo norma protectoria aplicable, los conflictos se resolverán en los tribunales ordinarios de Concordia, Entre Ríos.",
        ],
      },
      {
        number: "10",
        title: "Contacto y aceptación",
        bullets: [
          "Soporte general: soporte@promy.app",
          "Moderación: moderacion@promy.app",
          "Privacidad: privacidad@promy.app",
        ],
        paragraphs: [
          "Al aceptar durante el registro declarás haber leído y entendido estos términos y la política de privacidad, ser mayor de 18 años o contar con autorización válida, y cargar datos reales.",
        ],
      },
    ],
    footer:
      "Estos términos se complementan con la Política de Privacidad de PROMY y ambos documentos forman parte del mismo acuerdo entre vos y la plataforma.",
  },
};
