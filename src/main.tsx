import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.tsx";
import { installErrorReporting } from "./lib/telemetry";
import { registerPWA } from "./lib/pwa";

installErrorReporting();
registerPWA();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
