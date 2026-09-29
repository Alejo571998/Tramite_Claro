/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "local" (default) | "remote" — ver src/taku/chat/provider.ts */
  readonly VITE_TAKU_CHAT_MODE?: string;
  readonly VITE_TAKU_CHAT_ENDPOINT?: string;
}
