// src/components/OfficialLink.tsx — "Dónde se hace": link oficial verificado (nunca uno del modelo)
import { Icon } from "./Icon";
import type { Organismo } from "../lib/organismos";

export function OfficialLink({ org, organismo }: { org: Organismo | null; organismo: string }) {
  if (!org) {
    if (!organismo || organismo === "No identificado") return null;
    return (
      <div className="official official--unknown">
        <span className="official__icon">
          <Icon name="building" size={18} />
        </span>
        <div>
          <strong>Dónde se hace</strong>
          <p>
            Es de <b>{organismo}</b>. Buscá su web oficial (termina en <b>.gob.ar</b> o <b>.gov.ar</b>) y desconfiá de gestores que te cobran por trámites gratuitos.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="official">
      <span className="official__icon">
        <Icon name="building" size={18} />
      </span>
      <div>
        <strong>Dónde se hace: {org.nombre}</strong>
        <p>{org.descripcion}</p>
        <span className="official__verified">
          <Icon name="shield" size={13} /> Link oficial verificado por Trámite Claro
        </span>
      </div>
      <a className="btn btn--soft btn--sm" href={org.url} target="_blank" rel="noopener noreferrer">
        Web oficial <Icon name="external" size={14} />
      </a>
    </div>
  );
}
