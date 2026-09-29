// src/components/AppHeader.tsx
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";
import { useAuth } from "../auth/AuthContext";
import { navigate, type Route } from "../lib/router";
import { useTramites } from "../lib/tramitesStore";

export function AppHeader({ route }: { route: Route }) {
  const { user, logout } = useAuth();
  const tramites = useTramites();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const pendientes = tramites.filter((t) => t.done.length < t.data.checklist.length).length;

  return (
    <header className="app-header">
      <BrandMark />
      <nav className="app-header__nav" aria-label="Principal">
        <a className={`nav-link${route.name === "mis-tramites" ? " is-active" : ""}`} href="#/mis-tramites">
          <Icon name="folder" size={17} />
          <span>Mis trámites</span>
          {pendientes > 0 && <span className="badge" aria-label={`${pendientes} en curso`}>{pendientes}</span>}
        </a>
        {user ? (
          <div className="user-menu" ref={menuRef}>
            <button type="button" className="avatar-btn" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" aria-label={`Cuenta de ${user.nombre}`}>
              {user.nombre.trim().charAt(0).toUpperCase()}
            </button>
            {menu && (
              <div className="menu" role="menu">
                <div className="menu__who">
                  <strong>{user.nombre}</strong>
                  <span>{user.email}</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="menu__item"
                  onClick={async () => {
                    setMenu(false);
                    await logout();
                    navigate({ name: "ingresar" }, { replace: true });
                  }}
                >
                  <Icon name="logout" size={16} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <a className="btn btn--soft btn--sm" href="#/ingresar">
            Ingresar
          </a>
        )}
      </nav>
    </header>
  );
}
