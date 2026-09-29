// src/components/ErrorState.tsx — error explicado en humano + qué hacer ahora
import { Icon } from "./Icon";
import type { ErrorCode } from "../lib/api";

const TIPS: Partial<Record<ErrorCode, string>> = {
  quota: "Esperá medio minuto y volvé a intentar. Mientras tanto, podés mirar un ejemplo resuelto.",
  busy: "Suele resolverse solo en unos segundos.",
  network: "Revisá tu conexión a internet.",
  too_large: "Probá con menos páginas o un archivo más liviano.",
  unreadable: "Probá con una foto con más luz, de frente y sin cortar bordes. O pegá el texto.",
  config: "Es un problema de configuración del servidor, no tuyo.",
};

export function ErrorState({ code, message, onRetry }: { code: ErrorCode; message: string; onRetry?: () => void }) {
  return (
    <div className="card error-state" role="alert">
      <span className="error-state__icon">
        <Icon name="alert" size={20} />
      </span>
      <div className="error-state__body">
        <strong>No pude leer el trámite</strong>
        <p>{message}</p>
        {TIPS[code] && <p className="error-state__tip">{TIPS[code]}</p>}
        {onRetry && (
          <button type="button" className="btn btn--soft btn--sm" onClick={onRetry}>
            <Icon name="refresh" size={15} /> Probar de nuevo
          </button>
        )}
      </div>
    </div>
  );
}
