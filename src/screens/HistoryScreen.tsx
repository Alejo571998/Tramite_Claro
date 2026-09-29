// src/screens/HistoryScreen.tsx — "Mis trámites": en curso y resueltos
import { useEffect, useState } from "react";
import { TramiteCard } from "../components/TramiteCard";
import { Icon } from "../components/Icon";
import { tramitesStore, useTramites } from "../lib/tramitesStore";
import { useAuth } from "../auth/AuthContext";
import { useTaku } from "../taku/TakuContext";

export function HistoryScreen() {
  const tramites = useTramites();
  const { user } = useAuth();
  const { emit } = useTaku();
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    emit({ type: "history:open", count: tramitesStore.list().length });
  }, [emit]);

  const enCurso = tramites.filter((t) => t.done.length < t.data.checklist.length);
  const resueltos = tramites.filter((t) => t.data.checklist.length > 0 && t.done.length >= t.data.checklist.length);

  const del = (id: string) => (
    <div className="tramite-card__del">
      {confirm === id ? (
        <>
          <span>¿Borrar?</span>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => (tramitesStore.remove(id), setConfirm(null))}>
            Sí, borrar
          </button>
          <button type="button" className="btn btn--link btn--sm" onClick={() => setConfirm(null)}>
            No
          </button>
        </>
      ) : (
        <button type="button" className="icon-btn" onClick={() => setConfirm(id)} aria-label="Borrar trámite">
          <Icon name="trash" size={16} />
        </button>
      )}
    </div>
  );

  return (
    <main className="page">
      <div className="page__head">
        <h1 className="page__title">Mis trámites</h1>
        <a className="btn btn--primary btn--sm" href="#/">
          <Icon name="plus" size={16} /> Nuevo
        </a>
      </div>
      {!user && tramites.length > 0 && (
        <p className="notice">
          <Icon name="info" size={16} /> Estás sin cuenta: tus trámites se guardan en este navegador.{" "}
          <a href="#/crear-cuenta">Creá una cuenta</a> para ponerles tu nombre.
        </p>
      )}

      {tramites.length === 0 ? (
        <div className="card empty">
          <span className="empty__icon">
            <Icon name="folder" size={28} />
          </span>
          <h2 className="empty__title">Todavía no hay trámites</h2>
          <p>Cuando Taku te explique uno, queda guardado acá con tu progreso.</p>
          <a className="btn btn--primary" href="#/">
            Explicar mi primer trámite
          </a>
        </div>
      ) : (
        <>
          {enCurso.length > 0 && (
            <section className="section" aria-labelledby="encurso-title">
              <h2 id="encurso-title" className="section__title">
                En curso <span className="count">{enCurso.length}</span>
              </h2>
              <div className="stack">
                {enCurso.map((t) => (
                  <TramiteCard key={t.id} t={t} actions={del(t.id)} />
                ))}
              </div>
            </section>
          )}
          {resueltos.length > 0 && (
            <section className="section" aria-labelledby="resueltos-title">
              <h2 id="resueltos-title" className="section__title">
                Resueltos <span className="count">{resueltos.length}</span>
              </h2>
              <div className="stack">
                {resueltos.map((t) => (
                  <TramiteCard key={t.id} t={t} actions={del(t.id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
