import { useState, useCallback, useRef, useEffect } from "react";
import { EJEMPLOS } from "./lib/examples";
import { traducirTramite } from "./lib/gemini";
import { FALLBACK_RESPONSES } from "./lib/fallbackResponses";
import { PhotoCapture } from "./components/PhotoCapture";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { ChecklistItem } from "./components/ChecklistItem";
import { AlertCard } from "./components/AlertCard";
import type { TramiteTraducido } from "./types/tramite";

type Tab = "foto" | "texto";

// Icon helpers (inline SVG)
function IconCamera() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
}
function IconClipboard() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>;
}
function IconPdf() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M10 13H8v5h2"/><path d="M14 13c1 0 2 .8 2 2s-1 2-2 2h-1v1h-1v-5h2z"/></svg>;
}
function IconLock() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}
function IconSparkles() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M5 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>;
}
function IconEye() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

// chipLabels ya no se usa — el título viene directo de EJEMPLOS[].titulo
// Fallback permanece en src/lib/fallbackResponses.ts (comentario, no UI)

export default function App() {
  const [tab, setTab] = useState<Tab>("foto");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<TramiteTraducido | null>(null);
  const [raw, setRaw] = useState<string>("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());
  const pdfBtnRef = useRef<HTMLButtonElement>(null);
  const pdfPopRef = useRef<HTMLDivElement>(null);

  const handleTraducir = useCallback(async () => {
    if (!texto.trim()) return;
    setLoading(true);
    setError(null);
    setResultado(null);
    setRaw("");
    setDoneSet(new Set());
    try {
      const data = await traducirTramite(texto);
      setResultado(data);
      setRaw(JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [texto]);

  function cargarEjemplo(id: string) {
    const ej = EJEMPLOS.find((x) => x.id === id);
    if (ej) {
      setTexto(ej.texto);
      setTab("texto");
      setResultado(null);
      setRaw("");
      setError(null);
    }
  }
  function verFallback(id: string) {
    const fb = FALLBACK_RESPONSES[id];
    if (!fb) return;
    const ej = EJEMPLOS.find((x) => x.id === id);
    if (ej) setTexto(ej.texto);
    setResultado(fb);
    setRaw(JSON.stringify(fb, null, 2));
    setError(null);
    setDoneSet(new Set());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetAll() {
    setResultado(null);
    setRaw("");
    setTexto("");
    setError(null);
    setDoneSet(new Set());
  }

  // Reset progreso cuando cambia el resultado (nueva traducción)
  useEffect(() => {
    setDoneSet(new Set());
  }, [raw]);

  // PDF popover: close on outside / Escape
  useEffect(() => {
    if (!pdfOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pdfPopRef.current && !pdfPopRef.current.contains(e.target as Node) && pdfBtnRef.current && !pdfBtnRef.current.contains(e.target as Node)) {
        setPdfOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPdfOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [pdfOpen]);

  const hasKey = Boolean((import.meta as unknown as { env: Record<string,string> }).env.VITE_GEMINI_API_KEY && (import.meta as unknown as { env: Record<string,string> }).env.VITE_GEMINI_API_KEY !== "your_api_key_here");

  // Result view
  if (resultado) {
    const urgenciaBg = resultado.urgencia === "alta" ? { bg: "#FBEAF0", border: "#ED93B1", ink: "#72243E" } : resultado.urgencia === "media" ? { bg: "#FDF3E7", border: "#F0D4A8", ink: "#633806" } : { bg: "#EAF3EF", border: "#B7D9C8", ink: "#0F6B5C" };
    return (
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header — V2 con logo propio + wordmark híbrido + slideDown/popIn/drawCheck */}
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 12px", animation: "slideDown 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
          <div style={{ width: 32, height: 32, flexShrink: 0, animation: "popIn 0.6s cubic-bezier(0.22,1,0.36,1) both" }}>
            <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
              <rect width="34" height="34" rx="9" fill="#0F6B5C" />
              <path d="M9 17.5 L14.5 23 L25 11" stroke="#EAF3EF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: "drawCheck 0.4s ease-out 0.35s both" }} />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: 19, animation: "slideDown 0.4s ease-out 0.55s both" }}>
            <span style={{ fontFamily: "var(--font-voice, Fraunces, serif)", fontStyle: "italic", fontWeight: 500, color: "#1C1B1A" }}>Trámite</span>
            <span style={{ fontFamily: "var(--font-voice, Fraunces, serif)", fontWeight: 600, color: "#0F6B5C" }}> Claro</span>
          </p>
          <button onClick={resetAll} style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "white", cursor: "pointer", color: "var(--ink-soft)" }}>← Volver</button>
        </header>

        {/* Resumen card — 22px weight 600 */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginTop: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 600, marginBottom: 8 }}>
            {resultado.organismo} · {resultado.checklist.length} pasos
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, lineHeight: 1.45, color: "var(--ink)", fontWeight: 600 }}>{resultado.resumen}</div>
        </div>

        {/* Urgencia + Plazo — 2 col desktop, 1 col mobile */}
        <div className="grid-2" style={{ marginTop: 10 }}>
          <div style={{ background: urgenciaBg.bg, border: `1px solid ${urgenciaBg.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: urgenciaBg.ink, opacity: 0.8 }}>Urgencia</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: urgenciaBg.ink, marginTop: 4, textTransform: "capitalize" }}>{resultado.urgencia}</div>
          </div>
          <div style={{ background: resultado.plazo ? "var(--urgencia-bg)" : "white", border: `1px solid ${resultado.plazo ? "var(--urgencia-border)" : "var(--border)"}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: resultado.plazo ? "var(--urgencia-ink)" : "var(--muted)" }}>Plazo</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: resultado.plazo ? "var(--urgencia-ink)" : "var(--muted)", marginTop: 4 }}>{resultado.plazo || "—"}</div>
          </div>
        </div>

        {/* Progreso — barra verde sello */}
        {(() => {
          const total = resultado.checklist.length;
          const doneCount = doneSet.size;
          const pct = total ? (doneCount / total) * 100 : 0;
          return (
            <div style={{ background: "#0F6B5C", borderRadius: 10, padding: "14px 16px", marginTop: 10, color: "#EAF3EF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.02em" }}>Tu progreso</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{doneCount} de {total}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.22)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#EAF3EF", borderRadius: 999, transition: "width 0.3s ease" }} />
              </div>
            </div>
          );
        })()}

        {/* Checklist con jerarquía completado/actual/pendiente */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 700, marginBottom: 10 }}>Qué tenés que hacer</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(() => {
              // Cálculo robusto del primer no completado — recalcula en cada render
              const total = resultado.checklist.length;
              let firstPending = -1;
              for (let i = 0; i < total; i++) if (!doneSet.has(i)) { firstPending = i; break; }
              return resultado.checklist.map((c, i) => {
                const done = doneSet.has(i);
                const isActual = !done && i === firstPending;
                return (
                  <ChecklistItem
                    key={`${resultado.organismo}-${i}-${done ? "d" : isActual ? "a" : "p"}`}
                    index={i}
                    paso={c.paso}
                    detalle={c.detalle}
                    done={done}
                    isActual={isActual}
                    onToggle={() => setDoneSet((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                  />
                );
              });
            })()}
          </div>
        </div>

        {/* Alertas */}
        {resultado.alertas.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {resultado.alertas.map((a, i) => (
              <AlertCard key={i} texto={a.texto} severidad={a.severidad} />
            ))}
          </div>
        )}

        <details style={{ marginTop: 16 }} className="notranslate" translate="no">
          <summary style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>Ver JSON crudo</summary>
          <pre translate="no" className="notranslate" style={{ background: "#1C1B1A", color: "#F1EFE8", padding: 14, borderRadius: 8, overflowX: "auto", fontSize: 11, marginTop: 8 }}>{raw}</pre>
        </details>

        <footer style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}><IconLock /> Tus datos no se guardan. La clave queda en el cliente solo para la demo.</footer>
      </div>
    );
  }

  // Input view
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 10px", animation: "slideDown 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, animation: "popIn 0.6s cubic-bezier(0.22,1,0.36,1) both" }}>
          <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
            <rect width="34" height="34" rx="9" fill="#0F6B5C" />
            <path d="M9 17.5 L14.5 23 L25 11" stroke="#EAF3EF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: "drawCheck 0.4s ease-out 0.35s both" }} />
          </svg>
        </div>
        <p style={{ margin: 0, fontSize: 19, animation: "slideDown 0.4s ease-out 0.55s both" }}>
          <span style={{ fontFamily: "var(--font-voice, Fraunces, serif)", fontStyle: "italic", fontWeight: 500, color: "#1C1B1A" }}>Trámite</span>
          <span style={{ fontFamily: "var(--font-voice, Fraunces, serif)", fontWeight: 600, color: "#0F6B5C" }}> Claro</span>
        </p>
      </header>

      <h1 style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: "6px 0 16px", lineHeight: 1.25 }}>Pegá el texto, sacale una foto, o subí el PDF.</h1>

      {!hasKey && (
        <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", padding: 10, borderRadius: 8, fontSize: 12, color: "#6d4c41", marginBottom: 12 }}>
          ⚠️ <code>VITE_GEMINI_API_KEY</code> no seteada — definila en <code>.env.local</code> y reiniciá.
        </div>
      )}

      {/* 3 botones — responsive: 3 col en desktop, 1 col en 640px */}
      <div className="grid-actions" style={{ position: "relative" }}>
        <button
          onClick={() => setTab("foto")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 10px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
            border: tab === "foto" ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: tab === "foto" ? "var(--accent)" : "var(--card-soft)",
            color: tab === "foto" ? "white" : "var(--ink)",
          }}
        ><IconCamera /> Foto</button>

        <button
          onClick={() => setTab("texto")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 10px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
            border: "1px solid var(--border)", background: tab === "texto" ? "white" : "var(--card-soft)",
            color: "var(--ink)", boxShadow: tab === "texto" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
          }}
        ><IconClipboard /> Texto</button>

        <button
          ref={pdfBtnRef}
          onClick={() => setPdfOpen(!pdfOpen)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 10px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
            border: "1px dashed var(--border-dashed)", background: "white", color: "var(--muted)",
          }}
        ><IconPdf /> PDF</button>

        {pdfOpen && (
          <div
            ref={pdfPopRef}
            style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0, width: 300,
              background: "#1C1B1A", color: "white", borderRadius: 12, padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 20,
            }}
          >
            <button onClick={() => setPdfOpen(false)} style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.12)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</button>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0F6B5C", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, color: "#EAF3EF" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3 3h3a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h6z"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Próximamente</div>
            <div style={{ fontSize: 13, lineHeight: 1.4, color: "#E5E3DC" }}>Vas a poder subir el PDF del trámite directo, sin copiar ni pegar nada. Toda la burocracia, resuelta en palabras simples.</div>
          </div>
        )}
      </div>

      {/* Zona según tab */}
      <div style={{ marginTop: 12 }}>
        {tab === "foto" ? (
          <div>
            <PhotoCapture
              disabled={loading}
              onResult={(data, rawJson) => { setResultado(data); setRaw(rawJson); setError(null); }}
              onError={(msg) => setError(msg)}
            />
          </div>
        ) : (
          <div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pegá acá el texto burocrático de AFIP/ANSES/municipalidad…"
              rows={10}
              style={{
                width: "100%", boxSizing: "border-box", padding: 14,
                fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.5,
                border: "1px solid var(--border)", borderRadius: 10, resize: "vertical",
                background: "white", color: "var(--ink)",
              }}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleTraducir}
                disabled={loading || !texto.trim()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "14px 22px", borderRadius: 10, border: "none",
                  background: loading || !texto.trim() ? "#B4B2A9" : "var(--accent)",
                  color: "white", cursor: loading || !texto.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15,
                  boxShadow: loading || !texto.trim() ? "none" : "0 4px 12px rgba(15,107,92,0.25)",
                }}
              ><IconSparkles /> {loading ? "Analizando…" : "Traducir trámite"}</button>
              <button onClick={() => { setTexto(""); setError(null); }} style={{ padding: "8px 4px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--muted)", textDecoration: "underline", textUnderlineOffset: 3 }}>Limpiar</button>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{texto.length} caracteres</span>
            </div>
          </div>
        )}
      </div>

      {/* Separador + chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 12px" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>o probá con un ejemplo</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {EJEMPLOS.map((ej) => (
          <div
            key={ej.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)",
              background: "var(--card)", cursor: "pointer",
            }}
            onClick={() => cargarEjemplo(ej.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") cargarEjemplo(ej.id); }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ink-soft)", fontSize: 12 }}>›</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>{ej.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.02em" }}>{ej.organismo}</div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); verFallback(ej.id); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 10px", borderRadius: 999, border: "none",
                background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              }}
            ><IconEye /> Ver resultado</button>
          </div>
        ))}
      </div>
      {/* Fallback es solo para demo sin red — ver src/lib/fallbackResponses.ts */}

      {loading && tab === "texto" && <LoadingState variant="texto" />}
      {error && <ErrorState message={error} onRetry={tab === "texto" && texto.trim() ? handleTraducir : undefined} />}

      {raw && !resultado && (
        <pre translate="no" className="notranslate" style={{ background: "#1C1B1A", color: "#F1EFE8", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 11, marginTop: 12 }}>{raw}</pre>
      )}

      <footer style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", justifyContent: "center" }}>
        <IconLock /> Tus documentos no se guardan. Procesamiento privado en el dispositivo.
      </footer>
    </div>
  );
}
