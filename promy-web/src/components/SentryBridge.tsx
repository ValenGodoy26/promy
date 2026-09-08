import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { setWebSentryRouteContext, setWebSentryUserContext } from "../lib/sentry";

export default function SentryBridge() {
  const { session } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setWebSentryUserContext(session?.user ?? null);
  }, [session]);

  useEffect(() => {
    setWebSentryRouteContext(location.pathname);
  }, [location.pathname]);

  return null;
}
