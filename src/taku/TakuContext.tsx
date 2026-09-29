// src/taku/TakuContext.tsx — estado global de Taku.
// Las pantallas solo emiten eventos de producto (emit) y publican contexto
// (setChatContext). Taku decide cómo reaccionar según src/taku/script.ts.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { reactionFor } from "./script";
import type { TakuBubbleAction, TakuChatContext, TakuEvent, TakuMood } from "./types";
import { createChatProvider, type ChatMessage, type TakuChatProvider } from "./chat/provider";
import { readJSON, uid, writeJSON } from "../lib/storage";

export interface TakuBubble {
  id: string;
  createdAt: number;
  text: string;
  actions?: TakuBubbleAction[];
  priority: number;
}

interface TakuState {
  mood: TakuMood;
  bubble: TakuBubble | null;
  muted: boolean;
  /** Otra instancia de Taku ocupa el escenario (ej: pantalla de carga): el dock se oculta. */
  onStage: boolean;
  chatOpen: boolean;
  messages: ChatMessage[];
  typing: boolean;
  suggestions: string[];
  provider: TakuChatProvider;
  chatContext: TakuChatContext;
  emit: (e: TakuEvent) => void;
  say: (text: string, mood?: TakuMood, actions?: TakuBubbleAction[]) => void;
  dismissBubble: () => void;
  /** Al cambiar de pantalla: descarta globos viejos (no los que se acaban de emitir para la pantalla nueva). */
  onNavigate: () => void;
  setMuted: (m: boolean) => void;
  setOnStage: (v: boolean) => void;
  openChat: (ask?: string) => void;
  closeChat: () => void;
  ask: (text: string) => void;
  setChatContext: (c: TakuChatContext) => void;
}

const Ctx = createContext<TakuState | null>(null);
const MUTE_KEY = "tc:taku-muted";
const BUBBLE_MS = 7000;
const REPEAT_WINDOW_MS = 30_000;

export function TakuProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<TakuMood>("idle");
  const [bubble, setBubble] = useState<TakuBubble | null>(null);
  const [muted, setMutedState] = useState<boolean>(() => readJSON(MUTE_KEY, false));
  const [onStage, setOnStage] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  // sugerencias dinámicas que devuelve el proveedor (aparte de los mensajes)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chatContext, setChatContext] = useState<TakuChatContext>({});
  const provider = useMemo(() => createChatProvider(), []);

  const moodTimer = useRef<number | undefined>(undefined);
  const bubbleTimer = useRef<number | undefined>(undefined);
  const recent = useRef(new Map<string, number>());
  const bubbleRef = useRef<TakuBubble | null>(null);
  const chatOpenRef = useRef(false);
  const mutedRef = useRef(muted);
  const ctxRef = useRef(chatContext);
  const messagesRef = useRef(messages);
  const abortRef = useRef<AbortController | null>(null);
  const tramiteKeyRef = useRef("");
  // "latest ref": los callbacks estables leen siempre el último valor
  useLayoutEffect(() => {
    bubbleRef.current = bubble;
    chatOpenRef.current = chatOpen;
    mutedRef.current = muted;
    ctxRef.current = chatContext;
    messagesRef.current = messages;
  });

  const setMoodFor = useCallback((m: TakuMood, ms: number) => {
    window.clearTimeout(moodTimer.current);
    setMood(m);
    if (m !== "idle" && ms > 0) moodTimer.current = window.setTimeout(() => setMood("idle"), ms);
  }, []);

  const dismissBubble = useCallback(() => {
    window.clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  const onNavigate = useCallback(() => {
    const b = bubbleRef.current;
    if (b && Date.now() - b.createdAt > 1200) {
      window.clearTimeout(bubbleTimer.current);
      bubbleRef.current = null;
      setBubble(null);
    }
  }, []);

  const showBubble = useCallback((text: string, actions: TakuBubbleAction[] | undefined, priority: number) => {
    if (mutedRef.current || chatOpenRef.current) return;
    const cur = bubbleRef.current;
    if (cur && cur.priority > priority) return;
    const last = recent.current.get(text);
    if (last && Date.now() - last < REPEAT_WINDOW_MS) return;
    recent.current.set(text, Date.now());
    window.clearTimeout(bubbleTimer.current);
    const b = { id: uid(), createdAt: Date.now(), text, actions, priority };
    bubbleRef.current = b;
    setBubble(b);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), BUBBLE_MS + text.length * 25);
  }, []);

  const emit = useCallback(
    (e: TakuEvent) => {
      const r = reactionFor(e);
      if (!r) return;
      setMoodFor(r.mood, r.ms);
      if (r.message) showBubble(r.message, r.actions, r.priority ?? 0);
    },
    [setMoodFor, showBubble],
  );

  const say = useCallback(
    (text: string, m: TakuMood = "greet", actions?: TakuBubbleAction[]) => {
      setMoodFor(m, 1600);
      showBubble(text, actions, 1);
    },
    [setMoodFor, showBubble],
  );

  const setMuted = useCallback(
    (m: boolean) => {
      writeJSON(MUTE_KEY, m);
      setMutedState(m);
      if (m) dismissBubble();
    },
    [dismissBubble],
  );

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q) return;
      const userMsg: ChatMessage = { id: uid(), role: "user", text: q, ts: Date.now() };
      const history = [...messagesRef.current, userMsg];
      messagesRef.current = history;
      setMessages(history);
      setTyping(true);
      setMood("thinking");
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const reply = await provider.send(history, ctxRef.current, ac.signal);
        setMessages((prev) => [...prev, { id: uid(), role: "taku", text: reply.text, ts: Date.now() }]);
        setSuggestions(reply.suggestions ?? []);
        setMoodFor("happy", 900);
      } catch {
        if (!ac.signal.aborted) {
          setMessages((prev) => [...prev, { id: uid(), role: "taku", text: "Uy, me trabé. ¿Me lo preguntás de nuevo?", ts: Date.now() }]);
          setMoodFor("concerned", 1200);
        }
      } finally {
        if (abortRef.current === ac) setTyping(false);
      }
    },
    [provider, setMoodFor],
  );

  const openChat = useCallback(
    (question?: string) => {
      dismissBubble();
      setChatOpen(true);
      if (messagesRef.current.length === 0) {
        const c = ctxRef.current;
        const hello = c.tramite
          ? `¡Hola${c.nombre ? `, ${c.nombre}` : ""}! Estoy mirando «${c.tramite.titulo || c.tramite.organismo}». Preguntame lo que quieras sobre este trámite.`
          : `¡Hola${c.nombre ? `, ${c.nombre}` : ""}! Soy Taku, tu ayudante con los trámites. ¿En qué te doy una mano?`;
        setMessages([{ id: uid(), role: "taku", text: hello, ts: Date.now() }]);
        setSuggestions([]);
      }
      if (question) void ask(question);
    },
    [ask, dismissBubble],
  );

  const closeChat = useCallback(() => {
    setChatOpen(false);
    abortRef.current?.abort();
    setTyping(false);
    setMood("idle");
  }, []);

  // Si cambia el trámite en contexto, la charla anterior ya no aplica.
  const updateChatContext = useCallback((c: TakuChatContext) => {
    const key = c.tramite?.resumen ?? "";
    if (key !== tramiteKeyRef.current) {
      tramiteKeyRef.current = key;
      messagesRef.current = [];
      setMessages([]);
      setSuggestions([]);
    }
    ctxRef.current = c;
    setChatContext(c);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(moodTimer.current);
    window.clearTimeout(bubbleTimer.current);
  }, []);

  const value = useMemo<TakuState>(
    () => ({
      mood,
      bubble,
      muted,
      onStage,
      chatOpen,
      messages,
      typing,
      provider,
      chatContext,
      suggestions,
      emit,
      say,
      dismissBubble,
      onNavigate,
      setMuted,
      setOnStage,
      openChat,
      closeChat,
      ask,
      setChatContext: updateChatContext,
    }),
    [mood, bubble, muted, onStage, chatOpen, messages, typing, provider, chatContext, suggestions, emit, say, dismissBubble, onNavigate, setMuted, openChat, closeChat, ask, updateChatContext],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useTaku() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTaku fuera de TakuProvider");
  return v;
}

/** Una pantalla que muestra su propio Taku grande (ej: carga) lo "sube al escenario" y oculta el dock. */
// eslint-disable-next-line react/only-export-components
export function useTakuOnStage(active: boolean) {
  const { setOnStage } = useTaku();
  useEffect(() => {
    if (!active) return;
    setOnStage(true);
    return () => setOnStage(false);
  }, [active, setOnStage]);
}
