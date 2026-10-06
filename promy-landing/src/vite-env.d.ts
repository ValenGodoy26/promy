/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_PANEL_BASE_URL: string;
  readonly VITE_LEGAL_RESPONSIBLE?: string;
  readonly VITE_LEGAL_ADDRESS?: string;
  readonly VITE_PRIVACY_EMAIL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_COMPLAINTS_EMAIL?: string;
  readonly VITE_LEGAL_REVIEWED?: string;
  readonly VITE_RETENTION_POLICY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
