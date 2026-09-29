// src/lib/router.ts — router mínimo por hash (sin dependencias, sin rewrites en Vercel)
import { useSyncExternalStore } from "react";

export type Route =
  | { name: "ingresar" }
  | { name: "crear-cuenta" }
  | { name: "inicio" }
  | { name: "tramite"; id: string }
  | { name: "mis-tramites" };

export function parse(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  const [, first, second] = path.split("/");
  switch (first) {
    case "ingresar":
      return { name: "ingresar" };
    case "crear-cuenta":
      return { name: "crear-cuenta" };
    case "mis-tramites":
      return { name: "mis-tramites" };
    case "tramite":
      return second ? { name: "tramite", id: decodeURIComponent(second) } : { name: "inicio" };
    default:
      return { name: "inicio" };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case "tramite":
      return `#/tramite/${encodeURIComponent(r.id)}`;
    case "inicio":
      return "#/";
    default:
      return `#/${r.name}`;
  }
}

export function navigate(r: Route, { replace = false } = {}) {
  const h = href(r);
  if (replace) history.replaceState(null, "", h);
  else if (location.hash !== h) history.pushState(null, "", h);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.scrollTo({ top: 0 });
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
};

export function useHash() {
  return useSyncExternalStore(subscribe, () => location.hash);
}
