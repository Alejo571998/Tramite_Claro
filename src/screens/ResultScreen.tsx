// src/screens/ResultScreen.tsx — el trámite explicado: resumen, urgencia/plazo,
// pasos con progreso guardado, alertas, glosario, y acciones (escuchar, compartir, imprimir).
import { useEffect, useRef, useState } from "react";
import { ChecklistItem } from "../components/ChecklistItem";
import { AlertCard } from "../components/AlertCard";
import { Icon } from "../components/Icon";
import { UrgencyBadge, urgencyHelp } from "../components/UrgencyBadge";
import { DeadlineFact } from "../components/DeadlineFact";
import { OfficialLink } from "../components/OfficialLink";
import { DraftLetter } from "../components/DraftLetter";
import { FeedbackWidget } from "../components/FeedbackWidget";
import { findOrganismo } from "../lib/organismos";
import { useAuth } from "../auth/AuthContext";
import { tramitesStore, useTramites } from "../lib/tramitesStore";
import { navigate } from "../lib/router";
import { useTaku } from "../taku/TakuContext";
import type { TramiteTraducido } from "../types/tramite";

function toPlainText(t: TramiteTraducido) {
  const pasos = t.checklist.map((c, i) => `${i + 1}. ${c.paso}${c.detalle ? ` — ${c.detalle}` : ""}`).join("\n");
  const alertas = t.alertas.length ? `\n\nOjo:\n${t.alertas.map((a) => `• ${a.texto}`).join("\n")}` : "";
  return `${t.titulo || t.organismo} (${t.organismo})\n\n${t.resumen}${t.plazo ? `\n\nPlazo: ${t.plazo}` : ""}\n\nPasos:\n${pasos}${alertas}\n\n— Explicado con Trámite Claro · ${location.origin}`;
}

function useSpeech(text: string) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => void (supported && speechSynthesis.cancel()), [supported]);
  const toggle = () => {
    if (!supported) return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-AR";
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("es-AR")) ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
    if (voice) u.voice = voice;
    u.rate = 0.98;
    u.onend = u.onerror = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return { supported, speaking, toggle };
}

export function ResultScreen({ id }: { id: string }) {
  useTramites(); // re-render al cambiar el store
  const t = tramitesStore.get(id);
  const { user } = useAuth();
  const { emit, say, openChat, setChatContext } = useTaku();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const data = t?.data;
  const done = new Set(t?.done ?? []);
  const total = data?.checklist.length ?? 0;
  const firstPending = data ? data.checklist.findIndex((_, i) => !done.has(i)) : -1;
  const pct = total ? (done.size / total) * 100 : 0;
  const complete = total > 0 && done.size === total;

  const speechText = data
    ? `${data.titulo ?? ""}. ${data.resumen}. ${data.plazo ? `Plazo: ${data.plazo}.` : ""} Los pasos son: ${data.checklist.map((c, i) => `${i + 1}: ${c.paso}.`).join(" ")}`
    : "";
  const speech = useSpeech(speechText);

  // Contexto para el chat de Taku
  const nombre = user?.nombre.split(" ")[0];
  const org = data ? findOrganismo(data.organismo, data.titulo) : null;
  useEffect(() => {
    setChatContext({ tramite: data ?? null, progreso: { done: done.size, total }, nombre, oficial: org ? { nombre: org.nombre, url: org.url } : null });
  }, [data, done.size, total, nombre, org, setChatContext]);
  useEffect(() => () => setChatContext({ nombre }), [setChatContext, nombre]);

  // "Seguimos donde quedaste" al volver a un trámite
  useEffect(() => {
    if (t && Date.now() - t.createdAt > 5000) emit({ type: "result:revisit", done: t.done.length, total: t.data.checklist.length });
    // solo al abrir
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t || !data) {
    return (
      <main className="page">
        <div className="card empty">
          <h1 className="empty__title">No encontré ese trámite</h1>
          <p>Puede que lo hayas borrado o que esté guardado en otro dispositivo.</p>
          <a className="btn btn--primary" href="#/">
            Explicar un trámite nuevo
          </a>
        </div>
      </main>
    );
  }

  const showToast = (msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  function toggle(i: number) {
    const next = new Set(done);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    tramitesStore.setDone(t!.id, [...next].sort((a, b) => a - b));
    if (!done.has(i)) {
      if (next.size === total) emit({ type: "checklist:complete", titulo: data!.titulo || data!.organismo });
      else emit({ type: "checklist:progress", done: next.size, total });
    }
  }

  async function share() {
    const text = toPlainText(data!);
    if (navigator.share) {
      try {
        await navigator.share({ title: data!.titulo || "Trámite", text });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copiado. Pegalo donde quieras (WhatsApp, mail…).");
    } catch {
      showToast("No pude copiar. Probá con «Imprimir».");
    }
  }

  return (
    <main className="page result">
      <div className="result__bar no-print">
        <button type="button" className="btn btn--link" onClick={() => (history.length > 1 ? history.back() : navigate({ name: "inicio" }))}>
          <Icon name="arrow-left" size={16} /> Volver
        </button>
        <div className="result__actions">
          {speech.supported && (
            <button type="button" className={`btn btn--soft btn--sm${speech.speaking ? " is-on" : ""}`} onClick={speech.toggle} aria-pressed={speech.speaking}>
              <Icon name={speech.speaking ? "stop" : "volume"} size={16} /> <span>{speech.speaking ? "Parar" : "Escuchar"}</span>
            </button>
          )}
          <button type="button" className="btn btn--soft btn--sm" onClick={share}>
            <Icon name="share" size={16} /> <span>Compartir</span>
          </button>
          <button type="button" className="btn btn--soft btn--sm hide-sm" onClick={() => window.print()}>
            <Icon name="print" size={16} /> <span>Imprimir</span>
          </button>
        </div>
      </div>

      <article className="card result-hero">
        <div className="result-hero__meta">
          <span className="org">
            <Icon name="building" size={15} /> {data.organismo}
          </span>
          <UrgencyBadge urgencia={data.urgencia} />
        </div>
        <h1 className="result-hero__title">{data.titulo || data.organismo}</h1>
        <p className="result-hero__summary">{data.resumen}</p>
      </article>

      <div className="facts">
        <DeadlineFact data={data} />
        <div className={`fact fact--${data.urgencia}`}>
          <span className="fact__icon">
            <Icon name={data.urgencia === "alta" ? "alert" : "info"} size={18} />
          </span>
          <div>
            <span className="fact__label">¿Qué tan urgente es?</span>
            <strong className="fact__value">{urgencyHelp(data.urgencia)}</strong>
          </div>
        </div>
      </div>

      <OfficialLink org={org} organismo={data.organismo} />

      <section className="section" aria-labelledby="pasos-title">
        <div className="progress-head">
          <div>
            <h2 id="pasos-title" className="section__title">
              Qué tenés que hacer
            </h2>
            <p className="section__sub">{complete ? "¡Listo! Completaste todos los pasos." : "Tocá cada paso cuando lo termines. Guardo tu avance."}</p>
          </div>
          <div className="progress-ring" role="img" aria-label={`${done.size} de ${total} pasos hechos`} style={{ "--p": pct } as React.CSSProperties}>
            <span>
              {done.size}/{total}
            </span>
          </div>
        </div>
        {total > 0 ? (
          <ol className="steps">
            {data.checklist.map((c, i) => (
              <ChecklistItem key={i} index={i} paso={c.paso} detalle={c.detalle} done={done.has(i)} isActual={i === firstPending} onToggle={() => toggle(i)} />
            ))}
          </ol>
        ) : (
          <p className="muted">No encontré pasos concretos en este documento.</p>
        )}
      </section>

      {data.alertas.length > 0 && (
        <section className="section" aria-labelledby="alertas-title">
          <h2 id="alertas-title" className="section__title">
            Ojo con esto
          </h2>
          <div className="stack">
            {data.alertas.map((a, i) => (
              <AlertCard key={i} texto={a.texto} severidad={a.severidad} />
            ))}
          </div>
        </section>
      )}

      {data.glosario && data.glosario.length > 0 && (
        <section className="section" aria-labelledby="glosario-title">
          <h2 id="glosario-title" className="section__title">
            <Icon name="book" size={18} /> Palabras difíciles, traducidas
          </h2>
          <dl className="glossary">
            {data.glosario.map((g) => (
              <div key={g.termino} className="glossary__item">
                <dt>{g.termino}</dt>
                <dd>{g.significado}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <DraftLetter data={data} />

      <section className="card ask-taku no-print">
        <span className="ask-taku__icon">
          <Icon name="chat" size={20} />
        </span>
        <div>
          <strong>¿Te quedó alguna duda?</strong>
          <p>Preguntale a Taku sobre este trámite: qué hacer primero, qué llevar, qué significa algo.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => openChat()}>
          Preguntar
        </button>
      </section>

      <FeedbackWidget
        id={t.id}
        data={data}
        fuente={t.fuente}
        onRated={(r) =>
          r === "up" ? say("¡Qué bueno que te sirvió! 💚", "happy") : say("Perdón, lo voy a hacer mejor. ¿Me contás qué falló?", "concerned")
        }
      />

      <p className="disclaimer">
        <Icon name="info" size={14} /> Taku puede equivocarse. Confirmá plazos y requisitos en la web oficial de {data.organismo !== "No identificado" ? data.organismo : "el organismo"} antes de hacer el trámite.
      </p>

      {import.meta.env.DEV && (
        <details className="debug no-print" translate="no">
          <summary>JSON (solo en desarrollo)</summary>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </details>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
