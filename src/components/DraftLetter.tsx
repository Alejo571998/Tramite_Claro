// src/components/DraftLetter.tsx — "¿Necesitás escribirles?": borradores de notas
// (consulta, prórroga, reclamo, descargo) generados con el trámite como contexto.
import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { redactarNota, TraducirError, type Borrador, type TipoNota } from "../lib/api";
import type { TramiteTraducido } from "../types/tramite";

const TIPOS: { id: TipoNota; label: string; help: string }[] = [
  { id: "consulta", label: "Hacer una consulta", help: "Pedir información o que te aclaren algo." },
  { id: "prorroga", label: "Pedir más tiempo", help: "Solicitar una prórroga del plazo." },
  { id: "reclamo", label: "Hacer un reclamo", help: "Si creés que lo que te piden no corresponde." },
  { id: "descargo", label: "Presentar un descargo", help: "Explicar tu situación ante una intimación." },
];

export function DraftLetter({ data }: { data: TramiteTraducido }) {
  const [tipo, setTipo] = useState<TipoNota | null>(null);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Borrador | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generar() {
    if (!tipo) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setError(null);
    try {
      setDraft(await redactarNota(tipo, data, extra, ac.signal));
    } catch (e) {
      if (e instanceof TraducirError && e.code === "aborted") return;
      setError(e instanceof Error ? e.message : "No pude armar la nota.");
    } finally {
      setBusy(false);
    }
  }

  const fullText = draft ? `${draft.asunto ? `Asunto: ${draft.asunto}\n\n` : ""}${draft.cuerpo}` : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles: el texto igual se puede seleccionar */
    }
  }

  return (
    <section className="section no-print" aria-labelledby="nota-title">
      <h2 id="nota-title" className="section__title">
        <Icon name="pen" size={18} /> ¿Necesitás escribirles?
      </h2>
      {!draft ? (
        <div className="card draft">
          <p className="draft__lead">Te armo un borrador de nota para presentar. Vos completás tus datos donde dice [entre corchetes].</p>
          <div className="draft__tipos" role="radiogroup" aria-label="Tipo de nota">
            {TIPOS.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} className={`draft__tipo${tipo === t.id ? " is-on" : ""}`} onClick={() => setTipo(t.id)}>
                <strong>{t.label}</strong>
                <span>{t.help}</span>
              </button>
            ))}
          </div>
          {tipo && (
            <>
              <label className="draft__label" htmlFor="nota-extra">
                ¿Algo que quieras decir? <span>(opcional, con tus palabras)</span>
              </label>
              <textarea
                id="nota-extra"
                className="draft__extra"
                rows={3}
                maxLength={600}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Ej: estuve internado y no pude presentarlo a tiempo."
              />
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button type="button" className="btn btn--primary" onClick={generar} disabled={busy}>
                <Icon name="sparkles" size={16} /> {busy ? "Escribiendo…" : "Armar borrador"}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="card draft">
          {draft.asunto && (
            <p className="draft__asunto">
              <span>Asunto:</span> {draft.asunto}
            </p>
          )}
          <label className="sr-only" htmlFor="nota-cuerpo">
            Borrador de la nota
          </label>
          <textarea
            id="nota-cuerpo"
            className="draft__cuerpo"
            value={draft.cuerpo}
            onChange={(e) => setDraft({ ...draft, cuerpo: e.target.value })}
            rows={14}
          />
          {draft.notas.length > 0 && (
            <ul className="draft__notas">
              {draft.notas.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <div className="draft__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={copiar}>
              <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copiado" : "Copiar"}
            </button>
            <a className="btn btn--soft btn--sm" href={`mailto:?subject=${encodeURIComponent(draft.asunto)}&body=${encodeURIComponent(draft.cuerpo)}`}>
              <Icon name="mail" size={15} /> Abrir en el mail
            </a>
            <button type="button" className="btn btn--link btn--sm" onClick={() => setDraft(null)}>
              Hacer otra
            </button>
          </div>
          <p className="draft__disclaimer">
            <Icon name="info" size={13} /> Es un borrador orientativo: no reemplaza el consejo de un abogado o contador. Revisalo antes de presentarlo.
          </p>
        </div>
      )}
    </section>
  );
}
