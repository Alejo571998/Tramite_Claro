// src/taku/TakuAvatar.tsx — la imagen original de Taku + animación según el estado.
// El arte no se toca: solo se mueve/rota/escala el contenedor.
import taku240 from "../assets/taku/taku-240.webp";
import taku480 from "../assets/taku/taku-480.webp";
import type { TakuMood } from "./types";

interface Props {
  mood?: TakuMood;
  size: number;
  className?: string;
  /** Carga prioritaria (pantallas donde Taku es protagonista). */
  eager?: boolean;
}

export function TakuAvatar({ mood = "idle", size, className = "", eager }: Props) {
  return (
    <span className={`taku-avatar ${className}`} data-mood={mood} style={{ "--taku-size": `${size}px` } as React.CSSProperties} aria-hidden="true">
      <span className="taku-avatar__body">
        <img
          src={size > 140 ? taku480 : taku240}
          srcSet={`${taku240} 240w, ${taku480} 480w`}
          sizes={`${size}px`}
          width={size}
          height={size}
          alt=""
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      </span>
      {mood === "thinking" && (
        <span className="taku-avatar__dots">
          <i />
          <i />
          <i />
        </span>
      )}
      {mood === "alert" && <span className="taku-avatar__bang">!</span>}
      {mood === "celebrate" && (
        <span className="taku-avatar__confetti">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </span>
      )}
    </span>
  );
}
