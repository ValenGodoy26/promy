export type MercadoPagoCardForm = {
  getCardFormData: () => { token?: string | null };
  unmount?: () => void;
};

export type MercadoPagoCardFormOptions = {
  amount: string;
  iframe: true;
  form: { id: string; [key: string]: string | { id: string } };
  callbacks: {
    onFormMounted: (error?: unknown) => void;
    onSubmit: (event: SubmitEvent) => void;
  };
};

export type MercadoPagoConstructor = new (
  publicKey: string,
  options: { locale: "es-AR" },
) => { cardForm: (options: MercadoPagoCardFormOptions) => MercadoPagoCardForm };

let sdkLoader: Promise<MercadoPagoConstructor> | null = null;

export function getMercadoPagoPublicKey() {
  return import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY?.trim() || null;
}

export function loadMercadoPagoSdk() {
  if (typeof window.MercadoPago === "function") return Promise.resolve(window.MercadoPago as MercadoPagoConstructor);
  if (sdkLoader) return sdkLoader;
  sdkLoader = new Promise<MercadoPagoConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-promy-mercado-pago-sdk="true"]');
    const onLoad = () => typeof window.MercadoPago === "function"
      ? resolve(window.MercadoPago as MercadoPagoConstructor)
      : reject(new Error("Mercado Pago SDK unavailable"));
    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", () => reject(new Error("Mercado Pago SDK unavailable")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.promyMercadoPagoSdk = "true";
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("Mercado Pago SDK unavailable")), { once: true });
    document.head.append(script);
  }).catch((error) => { sdkLoader = null; throw error; });
  return sdkLoader;
}

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}
