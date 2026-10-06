import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

import { validatePublicReleaseEnv } from "./releaseEnv";

export default defineConfig(({ command, mode }) => {
  if (command === "build" && mode === "release") {
    const env = loadEnv(mode, ".", "VITE_");
    const errors = validatePublicReleaseEnv(env);

    if (errors.length > 0) {
      throw new Error(
        [
          "PROMY: release público bloqueado por configuración incompleta o insegura:",
          ...errors.map((error) => `- ${error}`),
          "Usá .env.release.example como guía y completá .env.release con URLs HTTPS y datos legales reales.",
        ].join("\n"),
      );
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      host: "0.0.0.0",
    },
  };
});
