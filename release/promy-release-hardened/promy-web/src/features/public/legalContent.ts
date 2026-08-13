export type LegalSection = {
  id: string;
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalSummaryCard = {
  label: string;
  value: string;
};

export type LegalDocument = {
  kind: "terms" | "privacy";
  title: string;
  shortTitle: string;
  intro: string;
  lawLabel: string;
  updatedAt: string;
  version: string;
  contactEmail: string;
  summary: LegalSummaryCard[];
  sections: LegalSection[];
  footer: string;
};

export const legalDocuments: Record<LegalDocument["kind"], LegalDocument> = {
  privacy: {
    kind: "privacy",
    title: "Política de privacidad",
    shortTitle: "Privacidad",
    intro:
      'PROMY ("PROMY", "la plataforma", "nosotros") trata datos personales para operar cuentas, mostrar promociones reales y validar canjes. Esta política explica qué datos recolectamos, para qué se usan, con quién se comparten, cuánto tiempo se conservan y qué derechos podés ejercer.',
    lawLabel: "Ley 25.326 · AAIP · República Argentina",
    updatedAt: "6 de mayo de 2026",
    version: "1.0",
    contactEmail: "privacidad@promy.app",
    summary: [
      { label: "Responsable", value: "PROMY · Concordia, Entre Ríos, Argentina" },
      { label: "Contacto", value: "privacidad@promy.app" },
      { label: "Derechos", value: "Acceso, rectificación, supresión y oposición" },
      { label: "Regla clave", value: "PROMY no vende tus datos personales" },
    ],
    sections: [
      {
        id: "responsable",
        number: "01",
        title: "Quién es responsable de tus datos",
        paragraphs: [
          "El responsable del tratamiento de los datos personales es PROMY, con domicilio en Concordia, Entre Ríos, Argentina.",
          "Si en el futuro PROMY adopta una forma societaria específica, esos datos identificatorios se actualizarán en esta misma página.",
        ],
        bullets: [
          "Nombre / razón social: PROMY",
          "Domicilio: Concordia, Entre Ríos, Argentina",
          "Contacto de privacidad: privacidad@promy.app",
        ],
      },
      {
        id: "datos",
        number: "02",
        title: "Qué datos recolectamos",
        paragraphs: [
          "Los datos varían según el rol y la forma de uso de la plataforma.",
        ],
        bullets: [
          "Clientes: nombre completo, email, teléfono opcional, contraseña hasheada, fecha de nacimiento si se carga, ciudad declarada, tokens de notificaciones y sesión.",
          "Uso de la app: ubicación GPS aproximada solo para ordenar resultados por cercanía, favoritos, historial de canjes, notificaciones y datos técnicos básicos del dispositivo.",
          "Comercios: datos del responsable, nombre comercial, descripción, dirección, coordenadas, ciudad, categoría, Instagram opcional, imágenes, promociones y estadísticas de canjes.",
          "No recolectamos datos bancarios ni de tarjetas, no accedemos a contactos, fotos o micrófono y solo usamos la cámara cuando un comercio necesita escanear un QR.",
        ],
      },
      {
        id: "finalidades",
        number: "03",
        title: "Para qué usamos tus datos",
        bullets: [
          "Crear cuentas, autenticar usuarios y operar la plataforma.",
          "Mostrar promociones cercanas según ubicación o ciudad activa.",
          "Generar y validar canjes mediante códigos únicos y QR.",
          "Enviar notificaciones operativas o relevantes para el uso de PROMY.",
          "Moderar comercios y promociones para sostener calidad y confianza.",
          "Mejorar la plataforma con datos agregados y anónimos.",
          "Cumplir obligaciones legales o requerimientos válidos de autoridad competente.",
        ],
        paragraphs: [
          "PROMY no usa tus datos para publicidad de terceros ni para perfilamiento publicitario.",
        ],
      },
      {
        id: "comparticion",
        number: "04",
        title: "Con quién compartimos tus datos",
        bullets: [
          "Con el comercio que valida un canje: código de canje, tu nombre y fecha/hora del canje. No ve tu email, teléfono, dirección ni tu historial con otros comercios.",
          "Con proveedores técnicos como hosting, base de datos, email transaccional, push notifications y almacenamiento de imágenes, exclusivamente para cumplir su función.",
          "Con autoridades competentes cuando exista requerimiento formal y obligación legal de entregar información.",
        ],
        paragraphs: [
          "PROMY no vende datos, no los cede para campañas publicitarias de terceros y no cruza información con redes sociales sin consentimiento explícito.",
        ],
      },
      {
        id: "conservacion",
        number: "05",
        title: "Cuánto tiempo guardamos tus datos",
        bullets: [
          "Cuenta activa: mientras tu cuenta siga operativa.",
          "Cuenta dada de baja: eliminación de datos personales identificables dentro de los 30 días.",
          "Registros de canjes: pueden conservarse en forma anónima para estadísticas y auditoría.",
          "Logs técnicos y de seguridad: hasta 12 meses.",
          "Obligaciones legales: los plazos pueden extenderse si una norma lo exige.",
        ],
      },
      {
        id: "seguridad",
        number: "06",
        title: "Seguridad de los datos",
        bullets: [
          "Contraseñas almacenadas con bcrypt.",
          "Tokens firmados, expiración corta y rotación de refresh tokens.",
          "HTTPS en producción.",
          "Rate limiting e intentos controlados para prevenir abuso.",
          "Validación real de archivos subidos y acceso restringido al backoffice.",
        ],
        paragraphs: [
          "Ningún sistema es invulnerable. Si ocurriera una brecha relevante, PROMY notificará a los usuarios afectados y a la AAIP conforme a la normativa aplicable.",
        ],
      },
      {
        id: "derechos",
        number: "07",
        title: "Tus derechos ARCO",
        bullets: [
          "Acceso: podés pedirnos qué datos tenemos sobre vos.",
          "Rectificación: podés corregir datos inexactos.",
          "Cancelación o supresión: podés pedir la baja de tu cuenta y la eliminación de tus datos cuando corresponda.",
          "Oposición: podés oponerte a determinados usos, por ejemplo notificaciones.",
        ],
        paragraphs: [
          "Para ejercer estos derechos, escribinos desde el email registrado a privacidad@promy.app. El plazo de respuesta previsto es de 10 días corridos.",
          "Si entendés que tu pedido no fue bien respondido, podés reclamar ante la Agencia de Acceso a la Información Pública (AAIP).",
        ],
      },
      {
        id: "menores",
        number: "08",
        title: "Menores de edad",
        paragraphs: [
          "PROMY no está dirigida a menores de 18 años y no recolecta conscientemente datos de menores.",
          "Si detectás una cuenta creada por un menor, podés escribir a privacidad@promy.app para solicitar su eliminación.",
        ],
      },
      {
        id: "transferencias",
        number: "09",
        title: "Servidores y transferencias internacionales",
        paragraphs: [
          "Algunos proveedores pueden operar con infraestructura fuera de Argentina, principalmente en Estados Unidos y Europa.",
          "PROMY procura elegir servicios con estándares reconocidos de seguridad y privacidad, como GDPR, SOC 2 o ISO 27001.",
        ],
      },
      {
        id: "cambios",
        number: "10",
        title: "Cambios en esta política",
        paragraphs: [
          "Si modificamos esta política de forma sustancial, te lo vamos a avisar dentro de la app y/o por email antes de que el cambio entre en vigor.",
          "La versión vigente se publica en https://promy.app/privacidad junto con la fecha de última actualización.",
        ],
      },
      {
        id: "contacto",
        number: "11",
        title: "Contacto",
        bullets: [
          "Email: privacidad@promy.app",
          "Domicilio: Concordia, Entre Ríos, Argentina",
        ],
        paragraphs: [
          "Esta política fue redactada conforme a la Ley 25.326 de Protección de los Datos Personales y normativa concordante de la República Argentina.",
        ],
      },
    ],
    footer:
      "Al usar PROMY aceptás esta política. Si no estás de acuerdo con sus términos, no podés usar la plataforma.",
  },
  terms: {
    kind: "terms",
    title: "Términos y condiciones",
    shortTitle: "Términos",
    intro:
      "Estos términos regulan el uso de PROMY para clientes, comercios y administradores. Al crear una cuenta, navegar el catálogo, canjear una promoción o publicar promociones, aceptás expresamente estas condiciones.",
    lawLabel: "República Argentina · Defensa del consumidor · Concordia",
    updatedAt: "6 de mayo de 2026",
    version: "1.0",
    contactEmail: "soporte@promy.app",
    summary: [
      { label: "Rol de PROMY", value: "Intermediario tecnológico, no vendedor" },
      { label: "Edad mínima", value: "18 años o autorización válida" },
      { label: "Canjes", value: "Personales, únicos y sujetos a vigencia" },
      { label: "Contacto", value: "soporte@promy.app · moderacion@promy.app" },
    ],
    sections: [
      {
        id: "que-es",
        number: "01",
        title: "Qué es PROMY",
        paragraphs: [
          "PROMY es una plataforma digital que conecta personas interesadas en promociones reales con comercios locales que las ofrecen.",
          "PROMY no vende productos ni servicios propios: actúa como intermediario tecnológico para facilitar descubrimiento, validación y seguimiento de beneficios.",
        ],
        bullets: [
          "App mobile para clientes",
          "Panel web para comercios",
          "Web pública y panel de administración interna",
        ],
      },
      {
        id: "quien-puede-usar",
        number: "02",
        title: "Quién puede usar PROMY",
        bullets: [
          "Clientes: deben ser mayores de 18 años o contar con autorización válida, usar datos reales y verificar su email antes de canjear promociones.",
          "Comercios: deben representar una actividad real y legal en Argentina, registrarse con datos ciertos y asumir la veracidad de sus promociones.",
          "PROMY puede pedir validación adicional a un comercio antes de aprobarlo.",
        ],
      },
      {
        id: "funcionamiento",
        number: "03",
        title: "Cómo funciona el servicio",
        bullets: [
          "Clientes: se registran, verifican email, exploran promociones, generan un canje, muestran código o QR y el comercio lo valida.",
          "Comercios: se registran, completan su perfil, esperan aprobación, cargan promociones y validan canjes desde el panel.",
          "Cada promoción pasa por moderación antes de volverse visible para clientes.",
        ],
      },
      {
        id: "reglas-clientes",
        number: "04",
        title: "Reglas para clientes",
        bullets: [
          "No se permiten cuentas falsas, múltiples cuentas ni emails desechables.",
          "Los códigos de canje son personales y no pueden venderse, transferirse ni regalarse.",
          "No se puede intentar burlar el sistema, hackear códigos o validar canjes ajenos.",
          "Cada promoción puede canjearse una sola vez por persona, salvo que se indique expresamente lo contrario.",
          "Las promociones están sujetas a vigencia, horarios y condiciones específicas del comercio.",
        ],
      },
      {
        id: "reglas-comercios",
        number: "05",
        title: "Reglas para comercios",
        bullets: [
          "Las promociones deben ser reales, claras, cumplibles y sin letra chica engañosa.",
          "El comercio debe honrar cada canje válido dentro de la vigencia y condiciones publicadas.",
          "No puede cobrarse más por usar una promo de PROMY que el precio efectivamente declarado.",
          "Los precios, stock, productos, calidad y atención son responsabilidad exclusiva del comercio.",
          "No se permiten productos o servicios prohibidos por ley o sin habilitación correspondiente.",
        ],
      },
      {
        id: "que-hace",
        number: "06",
        title: "Qué hace PROMY y qué no hace",
        paragraphs: [
          "PROMY sí muestra promociones verificadas, genera códigos únicos, modera contenido, guarda historial de canjes y envía notificaciones operativas cuando corresponde.",
          "PROMY no procesa pagos, no garantiza la calidad o el stock del comercio y no reemplaza la relación comercial entre cliente y comercio.",
        ],
      },
      {
        id: "responsabilidad",
        number: "07",
        title: "Responsabilidad de PROMY",
        paragraphs: [
          "PROMY aplica medidas razonables para mantener la plataforma operativa, segura y moderada.",
        ],
        bullets: [
          "No responde por calidad, precio, stock, atención o promesas comerciales del comercio.",
          "No responde por interrupciones causadas por proveedores externos o problemas técnicos del dispositivo del usuario.",
          "La responsabilidad total de PROMY, en la máxima medida permitida por la ley, se limita al monto de promociones efectivamente canjeadas en los últimos 30 días o $10.000 ARS, lo que sea menor.",
        ],
      },
      {
        id: "contenido",
        number: "08",
        title: "Contenido publicado por comercios",
        paragraphs: [
          "Los comercios son únicos responsables por textos, imágenes, precios, condiciones y demás contenido que publiquen.",
          "PROMY puede moderar, eliminar promociones, suspender comercios o bloquear cuentas cuando detecte abuso, falsedad o incumplimientos.",
        ],
        bullets: [
          "Canal de denuncias: moderacion@promy.app",
        ],
      },
      {
        id: "propiedad-intelectual",
        number: "09",
        title: "Propiedad intelectual",
        bullets: [
          "La marca PROMY, su logo, diseño, código fuente y textos propios pertenecen a PROMY.",
          "Los logos e imágenes de comercios pertenecen a cada comercio, que otorga licencia para mostrarlos dentro de la plataforma.",
          "No está permitido copiar, redistribuir ni hacer ingeniería inversa de la app, panel o API sin autorización escrita.",
        ],
      },
      {
        id: "bajas",
        number: "10",
        title: "Suspensión y baja de cuentas",
        paragraphs: [
          "Podés solicitar la baja voluntaria de tu cuenta escribiendo a privacidad@promy.app desde el email registrado. PROMY procesará la solicitud dentro de los 30 días.",
          "También podemos suspender o cerrar cuentas ante fraude, incumplimientos reiterados, reclamos fundados o requerimientos formales de autoridad.",
        ],
      },
      {
        id: "cambios",
        number: "11",
        title: "Cambios en estos términos",
        paragraphs: [
          "Si los cambios son sustanciales, PROMY los comunicará por aviso en pantalla y/o por email antes de su entrada en vigor.",
          "La versión vigente se publica en https://promy.app/terminos junto con su fecha de actualización.",
        ],
      },
      {
        id: "jurisdiccion",
        number: "12",
        title: "Ley aplicable y jurisdicción",
        paragraphs: [
          "Estos términos se rigen por las leyes de la República Argentina.",
          "Los conflictos se resolverán en los tribunales ordinarios de Concordia, Entre Ríos, salvo que una norma protectoria del consumidor establezca otro fuero aplicable.",
        ],
      },
      {
        id: "contacto",
        number: "13",
        title: "Contacto",
        bullets: [
          "Soporte general: soporte@promy.app",
          "Reclamos y moderación: moderacion@promy.app",
          "Privacidad y datos personales: privacidad@promy.app",
          "Domicilio: Concordia, Entre Ríos, Argentina",
        ],
      },
      {
        id: "aceptacion",
        number: "14",
        title: "Aceptación",
        bullets: [
          "Declarás haber leído y entendido estos términos.",
          "Declarás haber leído y entendido la política de privacidad.",
          "Aceptás ambos documentos como parte del acuerdo vinculante con PROMY.",
          "Declarás ser mayor de 18 años o contar con autorización válida.",
          "Confirmás que los datos ingresados son reales.",
        ],
        paragraphs: [
          "PROMY conserva un registro de aceptación con fecha, hora, IP y versión del documento aceptado.",
        ],
      },
    ],
    footer:
      "Estos términos se complementan con la Política de Privacidad de PROMY y ambos documentos forman parte del mismo acuerdo entre vos y la plataforma.",
  },
};
