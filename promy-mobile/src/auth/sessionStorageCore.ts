export const MOBILE_SESSION_STORAGE_KEY = "@promy/mobile-session";

type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type SecureKeyValueStorage = KeyValueStorage & {
  isAvailable: () => Promise<boolean>;
};

type SessionStorageOptions = {
  native: boolean;
  secure: SecureKeyValueStorage;
  browser: KeyValueStorage;
};

export class NativeSecureStorageUnavailableError extends Error {
  constructor(message = "SecureStore no está disponible en este dispositivo.") {
    super(message);
    this.name = "NativeSecureStorageUnavailableError";
  }
}

export function createSessionStorage({ native, secure, browser }: SessionStorageOptions) {
  const removeLegacy = () => browser.removeItem(MOBILE_SESSION_STORAGE_KEY).catch(() => undefined);

  const requireSecureStorage = async () => {
    const available = await secure.isAvailable().catch(() => false);
    if (!available) {
      await removeLegacy();
      throw new NativeSecureStorageUnavailableError();
    }
  };

  return {
    async write(value: string) {
      if (!native) {
        // Expo Web keeps its existing browser persistence explicitly. It is not
        // presented as secure storage and must never be used as a native fallback.
        await browser.setItem(MOBILE_SESSION_STORAGE_KEY, value);
        return;
      }

      await requireSecureStorage();
      try {
        await secure.setItem(MOBILE_SESSION_STORAGE_KEY, value);
      } catch (error) {
        await removeLegacy();
        throw error;
      }
      await removeLegacy();
    },

    async read() {
      if (!native) {
        return browser.getItem(MOBILE_SESSION_STORAGE_KEY);
      }

      try {
        await requireSecureStorage();
        const secureValue = await secure.getItem(MOBILE_SESSION_STORAGE_KEY);
        if (secureValue) {
          await removeLegacy();
          return secureValue;
        }

        const legacyValue = await browser.getItem(MOBILE_SESSION_STORAGE_KEY);
        if (!legacyValue) return null;

        // Migrate first, then remove. A failed migration deletes the insecure
        // legacy value and requires a fresh login instead of returning the secret.
        try {
          await secure.setItem(MOBILE_SESSION_STORAGE_KEY, legacyValue);
          await removeLegacy();
          return legacyValue;
        } catch (error) {
          await removeLegacy();
          throw error;
        }
      } catch (error) {
        await removeLegacy();
        throw error;
      }
    },

    async clear() {
      await removeLegacy();
      if (!native) return;

      const available = await secure.isAvailable().catch(() => false);
      if (available) {
        await secure.removeItem(MOBILE_SESSION_STORAGE_KEY).catch(() => undefined);
      }
    },
  };
}
