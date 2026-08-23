// src/components/LoadingState.tsx — skeleton, no spinner pelado
interface Props {
  variant?: "texto" | "foto";
}

export function LoadingState({ variant = "texto" }: Props) {
  const msg = variant === "foto" ? "Leyendo el documento…" : "Analizando…";
  const sub = variant === "foto"
    ? "La foto tarda más que texto — se comprime a 1600px y se lee con visión."
    : "Llamando a gemini-3.5-flash con responseSchema (thinkingLevel: low)…";

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, background: "#fafafa", marginTop: 16 }} aria-busy="true" aria-live="polite">
      <div style={{ height: 14, background: "#e5e5e5", borderRadius: 4, width: "60%", marginBottom: 10, animation: "pulse 1.2s infinite" }} />
      <div style={{ height: 14, background: "#e5e5e5", borderRadius: 4, width: "80%", marginBottom: 10 }} />
      <div style={{ height: 14, background: "#e5e5e5", borderRadius: 4, width: "70%", marginBottom: 10 }} />
      <div style={{ height: 10, background: "#eee", borderRadius: 4, width: "45%" }} />
      <p style={{ fontSize: 12, color: "#555", marginTop: 12, fontWeight: 600 }}>{msg}</p>
      <p style={{ fontSize: 11, color: "#777", margin: "4px 0 0" }}>{sub}</p>
    </div>
  );
}
