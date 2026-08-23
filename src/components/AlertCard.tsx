// src/components/AlertCard.tsx — diferenciación por severidad
interface Props {
  texto: string;
  severidad: "info" | "importante" | "critico";
}

export function AlertCard({ texto, severidad }: Props) {
  const styles = {
    critico: { bg: "#FBEAF0", border: "#ED93B1", ink: "#72243E", iconBg: "#72243E", label: "Ojo — crítico" },
    importante: { bg: "#FDF3E7", border: "#F0D4A8", ink: "#633806", iconBg: "#C98A2B", label: "Importante" },
    info: { bg: "#F1F3F0", border: "#E5E3DC", ink: "#5F5E5A", iconBg: "#888780", label: "Dato" },
  } as const;
  const s = styles[severidad] ?? styles.info;
  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div style={{ width: 20, height: 20, borderRadius: 999, background: s.iconBg, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 12 }}>{severidad === "info" ? "·" : "⚠"}</div>
      <div>
        <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: s.ink, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
        <div style={{ fontSize: 13, color: s.ink, lineHeight: 1.4 }}>{texto}</div>
      </div>
    </div>
  );
}
