import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./App";
import { AuthProvider } from "./auth";
import { ThemeProvider } from "./context/ThemeContext";
import { initWebSentry } from "./lib/sentry";
import "./styles.css";

initWebSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div style={{ padding: 24 }}>Ocurrio un error inesperado.</div>}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
