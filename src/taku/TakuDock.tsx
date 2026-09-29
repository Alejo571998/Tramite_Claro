// src/taku/TakuDock.tsx — Taku en la esquina inferior izquierda: globo contextual +
// puerta de entrada al chat. Se esconde cuando otro Taku está "en escena" o
// cuando el teclado del celular está abierto, para no tapar contenido.
import { useEffect, useRef, useState } from "react";
import { useTaku } from "./TakuContext";
import { TakuAvatar } from "./TakuAvatar";
import { TakuChat } from "./TakuChat";

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "file", "button"].includes((el as HTMLInputElement).type)));
    const onIn = (e: FocusEvent) => {
      if (isField(e.target) && !(e.target as HTMLElement).closest(".taku-chat")) setOpen(true);
    };
    const onOut = () => setOpen(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return open;
}

/** En pantallas chicas el globo se cierra apenas la persona scrollea o toca otra cosa:
 *  está usando la app y el globo no debe taparle contenido. */
function useDismissOnInteraction(active: boolean, dismiss: () => void, bubbleRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!active || !window.matchMedia("(max-width: 640px)").matches) return;
    const startY = window.scrollY;
    const onScroll = () => Math.abs(window.scrollY - startY) > 40 && dismiss();
    const onDown = (e: PointerEvent) => {
      if (!bubbleRef.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest(".taku-dock")) dismiss();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [active, dismiss, bubbleRef]);
}

export function TakuDock() {
  const { mood, bubble, dismissBubble, onStage, chatOpen, openChat, closeChat, muted, setMuted } = useTaku();
  const keyboardOpen = useKeyboardOpen();
  const bubbleRef = useRef<HTMLDivElement>(null);
  useDismissOnInteraction(!!bubble, dismissBubble, bubbleRef);
  const hidden = onStage && !chatOpen;

  return (
    <div className={`taku-dock${hidden ? " is-hidden" : ""}${keyboardOpen ? " is-keyboard" : ""}${chatOpen ? " is-chat" : ""}`}>
      {chatOpen && <TakuChat onClose={closeChat} />}

      {bubble && !chatOpen && (
        <div className="taku-bubble" role="status" aria-live="polite" key={bubble.id} ref={bubbleRef}>
          <p>{bubble.text}</p>
          {bubble.actions?.length ? (
            <div className="taku-bubble__actions">
              {bubble.actions.map((a) => (
                <button key={a.label} type="button" className="chip chip--taku" onClick={() => openChat(a.ask)}>
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className="taku-bubble__close" onClick={dismissBubble} aria-label="Cerrar mensaje de Taku">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      <div className="taku-dock__launcher">
        <button
          type="button"
          className="taku-dock__button"
          onClick={() => (chatOpen ? closeChat() : openChat())}
          aria-label={chatOpen ? "Cerrar chat con Taku" : "Abrir chat con Taku, tu asistente"}
          aria-expanded={chatOpen}
        >
          <TakuAvatar mood={mood} size={92} />
          <span className="taku-dock__shadow" />
          {!chatOpen && <span className="taku-dock__label">Preguntale a Taku</span>}
        </button>
        <button
          type="button"
          className="taku-dock__mute"
          onClick={() => setMuted(!muted)}
          aria-pressed={muted}
          title={muted ? "Activar los consejos de Taku" : "Silenciar los consejos de Taku"}
          aria-label={muted ? "Activar los consejos de Taku" : "Silenciar los consejos de Taku"}
        >
          {muted ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              <path d="M3 3l18 18" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
