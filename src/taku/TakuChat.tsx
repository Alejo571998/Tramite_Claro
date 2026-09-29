// src/taku/TakuChat.tsx — panel de chat. Solo habla con la interfaz TakuChatProvider.
import { useEffect, useRef, useState } from "react";
import { useTaku } from "./TakuContext";
import { TakuAvatar } from "./TakuAvatar";

export function TakuChat({ onClose }: { onClose: () => void }) {
  const { messages, typing, ask, provider, chatContext, suggestions, mood, muted, setMuted } = useTaku();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chips = suggestions.length ? suggestions : provider.starters(chatContext);
  const send = (q: string) => {
    if (!q.trim() || typing) return;
    ask(q);
    setText("");
  };

  return (
    <section className="taku-chat" role="dialog" aria-label="Chat con Taku">
      <header className="taku-chat__head">
        <TakuAvatar mood={mood} size={40} />
        <div>
          <strong>Taku</strong>
          <span>{provider.live ? "Asistente de trámites" : "Asistente de trámites · beta"}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMuted(!muted)}
          aria-pressed={muted}
          aria-label={muted ? "Activar los consejos de Taku" : "Silenciar los consejos de Taku"}
          title={muted ? "Activar los consejos de Taku" : "Silenciar los consejos de Taku"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
            {muted && <path d="M3 3l18 18" />}
          </svg>
        </button>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="taku-chat__list" ref={listRef} aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`msg msg--${m.role}`}>
            {m.text}
          </div>
        ))}
        {typing && (
          <div className="msg msg--taku msg--typing" aria-label="Taku está escribiendo">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      {!typing && chips.length > 0 && (
        <div className="taku-chat__chips">
          {chips.map((c) => (
            <button key={c} type="button" className="chip" onClick={() => send(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <form
        className="taku-chat__form"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí tu pregunta…"
          aria-label="Tu pregunta para Taku"
          maxLength={500}
        />
        <button type="submit" className="btn btn--primary btn--icon" disabled={!text.trim() || typing} aria-label="Enviar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
        </button>
      </form>
      {!provider.live && <p className="taku-chat__note">Por ahora respondo con lo que dice tu trámite. Pronto voy a poder charlar de todo.</p>}
    </section>
  );
}
