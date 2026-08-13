import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { safeNavigate } from "../navigation/navigationRef";
import { extractValidationCodeFromUrl } from "../services/deepLinks";

function navigateFromValidationLink(role: string | undefined, url: string) {
  const validationCode = extractValidationCodeFromUrl(url);

  if (!validationCode) {
    return;
  }

  const openValidation = () => {
    if (role === "COMMERCE") {
      safeNavigate("CommerceRedemptions", { validationCode });
      return;
    }

    if (role === "CLIENT") {
      safeNavigate("Redemptions", { validationCode });
    }
  };

  // En cold start damos un margen minimo a que el navigator quede listo.
  setTimeout(openValidation, 180);
}

export default function DeepLinkBridge() {
  const { session } = useAuth();
  const lastHandledUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const handleUrl = (url: string | null | undefined) => {
      if (!url || lastHandledUrlRef.current === url) {
        return;
      }

      lastHandledUrlRef.current = url;
      navigateFromValidationLink(session?.user.role, url);
    };

    void Linking.getInitialURL().then(handleUrl).catch(() => undefined);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [session?.user.role]);

  return null;
}
