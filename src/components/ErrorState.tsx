// src/components/ErrorState.tsx — fallback prolijo si la API falla
interface Props {
  message: string;
  onRetry?: () => void;
  showFallbackHint?: boolean;
}

export function ErrorState({ message, onRetry, showFallbackHint = true }: Props) {
  const is429 = /429|quota|RESOURCE_EXHAUSTED/i.test(message);
  const is503 = /503|UNAVAILABLE|high demand|overloaded/i.test(message);
  const is404 = /404|NOT_FOUND|ya no está disponible/i.test(message);

  return (
    <div style={{ border: "1px solid #e57373", background: "#ffebee", borderRadius: 8, padding: 16, marginTop: 16 }} role="alert">
      <strong style={{ color: "#c62828", fontSize: 14 }}>No se pudo traducir</strong>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, margin: "8px 0 0", background: "white", padding: 8, borderRadius: 6, border: "1px solid #ffcdd2" }}>{message}</pre>

      {is429 && <p style={{ fontSize: 12, color: "#6d4c41", marginTop: 8 }}>Cuota free tier (20 req) excedida — esperá ~30s o usá &quot;Ver resultado&quot; del fallback estático.</p>}
      {is503 && <p style={{ fontSize: 12, color: "#6d4c41", marginTop: 8 }}>Modelo con alta demanda (503) — reintentá en 10s. El retry automático ya probó 2 veces.</p>}
      {is404 && <p style={{ fontSize: 12, color: "#6d4c41", marginTop: 8 }}>Modelo no disponible para esta key — verificá src/lib/gemini.ts:MODEL_ID (debe ser gemini-3.5-flash).</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #c62828", background: "white", color: "#c62828", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Reintentar
          </button>
        )}
        {showFallbackHint && <span style={{ fontSize: 11, color: "#666", alignSelf: "center" }}>Tip: en demo usá &quot;Ver resultado&quot; junto al ejemplo si la red falla.</span>}
      </div>

      {!is429 && !is503 && !is404 && (
        <p style={{ fontSize: 11, color: "#777", marginTop: 8 }}>Si es 400 con responseSchema, revisá el switch de config (thinkingLevel vs temperature).</p>
      )}
    </div>
  );
}
