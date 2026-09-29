// src/screens/HomeScreen.tsx — entrada del trámite + recientes + ejemplos
import { useEffect, useRef, useState } from "react";
import { DocumentInput, type Modo } from "../components/DocumentInput";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { TramiteCard } from "../components/TramiteCard";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { traducir, TraducirError, type ErrorCode } from "../lib/api";
import { navigate } from "../lib/router";
import { tramitesStore, useTramites } from "../lib/tramitesStore";
import { EJEMPLOS, EJEMPLOS_EXTRA } from "../lib/examples";
import { FALLBACK_RESPONSES } from "../lib/fallbackResponses";
import { readJSON, writeJSON } from "../lib/storage";
import { useTaku } from "../taku/TakuContext";
import type { TraducirRequest } from "../types/tramite";

const VISITED_KEY = "tc:visited";
// Saludo una sola vez por carga de página (no cada vez que volvés al inicio).
let greeted = false;

export function HomeScreen() {
  const { user } = useAuth();
  const { emit } = useTaku();
  const tramites = useTramites();
  const [phase, setPhase] = useState<{ s: "idle" } | { s: "loading"; fuente: Modo } | { s: "error"; code: ErrorCode; message: string }>({ s: "idle" });
  const [prefill, setPrefill] = useState<{ key: string; texto: string } | null>(null);
  const [lastReq, setLastReq] = useState<{ req: TraducirRequest; fuente: Modo } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const nombre = user?.nombre.split(" ")[0];

  useEffect(() => {
    if (greeted) return;
    const t = window.setTimeout(() => {
      greeted = true;
      const firstVisit = !readJSON(VISITED_KEY, false);
      writeJSON(VISITED_KEY, true);
      emit({ type: "welcome", nombre, firstVisit });
    }, 600);
    return () => window.clearTimeout(t);
  }, [emit, nombre]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function analyze(req: TraducirRequest, fuente: Modo) {
    setLastReq({ req, fuente });
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ s: "loading", fuente });
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const data = await traducir(req, ac.signal);
      const saved = tramitesStore.save(data, fuente);
      emit({ type: "analyze:success", urgencia: data.urgencia, plazo: data.plazo, pasos: data.checklist.length });
      navigate({ name: "tramite", id: saved.id });
    } catch (e) {
      const err = e instanceof TraducirError ? e : new TraducirError("unknown", "Algo salió mal.");
      if (err.code === "aborted") {
        setPhase({ s: "idle" });
        return;
      }
      setPhase({ s: "error", code: err.code, message: err.message });
      emit({ type: "analyze:error", code: err.code });
    }
  }

  function verEjemplo(id: string) {
    const existing = tramitesStore.list().find((t) => t.ejemploId === id);
    if (existing) return navigate({ name: "tramite", id: existing.id });
    const fb = FALLBACK_RESPONSES[id];
    if (!fb) return;
    const extra = EJEMPLOS_EXTRA[id];
    const saved = tramitesStore.save({ ...fb, titulo: extra?.titulo ?? fb.titulo, glosario: extra?.glosario ?? fb.glosario }, "ejemplo", id);
    emit({ type: "input:example" });
    navigate({ name: "tramite", id: saved.id });
  }

  function usarTexto(id: string) {
    const ej = EJEMPLOS.find((x) => x.id === id);
    if (!ej) return;
    setPrefill({ key: `${id}-${Date.now()}`, texto: ej.texto });
    setPhase({ s: "idle" });
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const recientes = tramites.filter((t) => t.fuente !== "ejemplo").slice(0, 3);
  const loading = phase.s === "loading";

  return (
    <main className="page home">
      <section className="hero">
        {nombre && <p className="hero__hi">Hola, {nombre}</p>}
        <h1 className="hero__title">
          ¿Te llegó un trámite que no se entiende? <em>Te lo explico fácil.</em>
        </h1>
        <p className="hero__lead">Mandá una foto, el PDF o contalo con tus palabras. En segundos tenés qué es, qué hacer paso a paso y hasta cuándo.</p>
      </section>

      <div ref={inputRef} className="home__input">
        {/* El formulario queda montado (oculto) durante la carga: si falla, no se pierde lo que cargaste. */}
        {loading && <LoadingState fuente={phase.fuente} onCancel={() => abortRef.current?.abort()} />}
        <div hidden={loading}>
          <>
            {phase.s === "error" && (
              <ErrorState
                code={phase.code}
                message={phase.message}
                onRetry={lastReq && phase.code !== "too_large" && phase.code !== "bad_input" ? () => analyze(lastReq.req, lastReq.fuente) : undefined}
              />
            )}
            <DocumentInput key={prefill?.key ?? "base"} onSubmit={analyze} initialText={prefill?.texto} busy={loading} />
          </>
        </div>
      </div>

      {recientes.length > 0 && !loading && (
        <section className="section" aria-labelledby="recientes-title">
          <div className="section__head">
            <h2 id="recientes-title" className="section__title">
              Seguí donde quedaste
            </h2>
            <a className="btn btn--link" href="#/mis-tramites">
              Ver todos <Icon name="arrow-right" size={15} />
            </a>
          </div>
          <div className="stack">
            {recientes.map((t) => (
              <TramiteCard key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section className="section" aria-labelledby="ejemplos-title">
          <div className="section__head">
            <h2 id="ejemplos-title" className="section__title">
              ¿No tenés uno a mano? Mirá un ejemplo
            </h2>
          </div>
          <div className="examples">
            {EJEMPLOS.map((ej) => (
              <article key={ej.id} className="example">
                <span className="example__org">{ej.organismo}</span>
                <h3 className="example__title">{EJEMPLOS_EXTRA[ej.id]?.titulo ?? ej.titulo}</h3>
                <div className="example__actions">
                  <button type="button" className="btn btn--soft btn--sm" onClick={() => verEjemplo(ej.id)}>
                    <Icon name="eye" size={15} /> Ver cómo queda
                  </button>
                  <button type="button" className="btn btn--link btn--sm" onClick={() => usarTexto(ej.id)}>
                    Usar el texto
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="how" aria-label="Cómo funciona">
        <div className="how__item">
          <span className="how__n">1</span>
          <div>
            <strong>Mandalo</strong>
            <p>Foto, PDF o contalo como te salga.</p>
          </div>
        </div>
        <div className="how__item">
          <span className="how__n">2</span>
          <div>
            <strong>Entendelo</strong>
            <p>Qué es, urgencia, plazo y palabras raras.</p>
          </div>
        </div>
        <div className="how__item">
          <span className="how__n">3</span>
          <div>
            <strong>Resolvelo</strong>
            <p>Tildá los pasos. Guardamos tu avance.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
