function optionalEnv(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name]?.trim();
  return value || null;
}

export const legalConfig = {
  responsible: optionalEnv("VITE_LEGAL_RESPONSIBLE"),
  address: optionalEnv("VITE_LEGAL_ADDRESS"),
  privacyEmail: optionalEnv("VITE_PRIVACY_EMAIL"),
  supportEmail: optionalEnv("VITE_SUPPORT_EMAIL"),
  complaintsEmail: optionalEnv("VITE_COMPLAINTS_EMAIL"),
  reviewed: import.meta.env.VITE_LEGAL_REVIEWED?.trim().toLowerCase() === "true",
  retentionPolicy: optionalEnv("VITE_RETENTION_POLICY"),
};

export const legalIdentityReady = Boolean(
  legalConfig.responsible &&
    legalConfig.address &&
    legalConfig.privacyEmail &&
    legalConfig.supportEmail &&
    legalConfig.complaintsEmail,
);
