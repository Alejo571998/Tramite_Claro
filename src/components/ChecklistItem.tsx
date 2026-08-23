// src/components/ChecklistItem.tsx — V2 fix: actual bien destacado
interface Props {
  paso: string;
  detalle: string;
  index: number;
  done: boolean;
  isActual: boolean;
  onToggle: () => void;
}

export function ChecklistItem({ paso, detalle, done, isActual, onToggle }: Props) {
  let bg = "#FFFFFF";
  let border = "1px solid #E5E3DC";
  let opacity: number | undefined = undefined;
  let shadow: string | undefined = undefined;

  if (done) {
    bg = "#EAF3EF";
    border = "1px solid #0F6B5C";
    opacity = 1;
  } else if (isActual) {
    bg = "#FFFFFF";
    border = "2px solid #0F6B5C";
    shadow = "0 4px 14px rgba(15,107,92,0.18)";
    opacity = 1;
  } else {
    bg = "#F8F8F6";
    border = "1px solid #E5E3DC";
    opacity = 0.62;
  }

  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: bg,
        border,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.15s",
        opacity,
        boxShadow: shadow,
      }}
    >
      <div
        aria-checked={done}
        role="checkbox"
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          border: `1.5px solid ${done ? "#0F6B5C" : isActual ? "#0F6B5C" : "#B4B2A9"}`,
          background: done ? "#0F6B5C" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
          transform: done ? "rotate(-3deg)" : "none",
          boxShadow: done ? "0 1px 4px rgba(15,107,92,0.3)" : "none",
        }}
      >
        {done ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span style={{ fontSize: 10, color: isActual ? "#0F6B5C" : "#1C1B1A", fontWeight: 700 }}>{/* index+1 */}</span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: 14,
            fontWeight: 600,
            color: done ? "#5F5E5A" : "#1C1B1A",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {paso}
        </div>
        {detalle && <div style={{ fontSize: 13, color: "#5F5E5A", marginTop: 2, lineHeight: 1.4 }}>{detalle}</div>}
      </div>
    </div>
  );
}
