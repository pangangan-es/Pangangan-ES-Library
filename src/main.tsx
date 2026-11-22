import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/app/App";
import { ConfigError } from "@/components/ConfigError";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { configError } from "@/lib/env";
import "@/index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

createRoot(container).render(
  <StrictMode>
    {configError ? (
      <ConfigError message={configError} />
    ) : (
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    )}
  </StrictMode>,
);

// Register Progressive Web App (PWA) Service Worker
if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("PWA Service Worker registered successfully with scope:", registration.scope);
      })
      .catch((error) => {
        console.warn("PWA Service Worker registration failed:", error);
      });
  });
}
