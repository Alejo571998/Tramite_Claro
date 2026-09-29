// src/App.tsx — providers + rutas
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { TakuProvider, useTaku } from "./taku/TakuContext";
import { TakuDock } from "./taku/TakuDock";
import { AppHeader } from "./components/AppHeader";
import { AuthScreen } from "./screens/AuthScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { navigate, parse, useHash } from "./lib/router";

function Routes() {
  const hash = useHash();
  const route = parse(hash);
  const { user, guest, ready } = useAuth();
  const isAuthRoute = route.name === "ingresar" || route.name === "crear-cuenta";
  const needsAuth = ready && !user && !guest && !isAuthRoute;
  const { onNavigate } = useTaku();

  useEffect(() => {
    onNavigate();
  }, [hash, onNavigate]);

  useEffect(() => {
    if (needsAuth) navigate({ name: "ingresar" }, { replace: true });
    else if (user && isAuthRoute) navigate({ name: "inicio" }, { replace: true });
  }, [needsAuth, user, isAuthRoute]);

  useEffect(() => {
    const titles: Record<string, string> = { ingresar: "Ingresar", "crear-cuenta": "Crear cuenta", "mis-tramites": "Mis trámites", tramite: "Tu trámite" };
    document.title = titles[route.name] ? `${titles[route.name]} · Trámite Claro` : "Trámite Claro — Los trámites, en palabras simples";
  }, [route.name]);

  if (!ready)
    return (
      <div className="boot" aria-busy="true" aria-label="Cargando">
        <span className="boot__dot" />
      </div>
    );
  if (isAuthRoute) return <AuthScreen key={route.name} mode={route.name as "ingresar" | "crear-cuenta"} />;
  if (needsAuth) return null;

  return (
    <div className="shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <AppHeader route={route} />
      <div id="contenido" className="shell__content">
        {route.name === "tramite" ? (
          <ResultScreen key={route.id} id={route.id} />
        ) : route.name === "mis-tramites" ? (
          <HistoryScreen />
        ) : (
          <HomeScreen />
        )}
      </div>
      <footer className="app-footer no-print">
        <span>Trámite Claro · Taku te ayuda, pero confirmá siempre en la web oficial.</span>
      </footer>
      <TakuDock />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TakuProvider>
        <Routes />
      </TakuProvider>
    </AuthProvider>
  );
}
