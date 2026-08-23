// src/components/PhotoCapture.tsx — dropzone dashed + preview + validación §5.4
import { useRef, useState } from "react";
import { traducirTramiteDesdeImagen } from "../lib/gemini";
import { LoadingState } from "./LoadingState";
import type { TramiteTraducido } from "../types/tramite";

interface Props {
  onResult: (data: TramiteTraducido, rawJson: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export function PhotoCapture({ onResult, onError, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      onError("El archivo debe ser una imagen (JPG/PNG).");
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function clear() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    try {
      const data = await traducirTramiteDesdeImagen(file);
      onResult(data, JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || loading}
        style={{ display: "none" }}
      />

      {!previewUrl ? (
        <div
          onClick={() => !disabled && !loading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) {
              const ev = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleFileChange(ev);
            }
          }}
          style={{
            border: `1px dashed ${dragOver ? "#0F6B5C" : "#B4B2A9"}`,
            background: dragOver ? "#EAF3EF" : "white",
            borderRadius: 10,
            padding: "28px 16px",
            textAlign: "center",
            cursor: disabled || loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: dragOver ? "#0F6B5C" : "#B4B2A9" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Subí la foto del trámite</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Buscá que se lea bien: sin sombras y sin inclinar la hoja</div>
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 6 }}>JPG o PNG · se comprime a ~1600px antes de enviar</div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, background: "white" }}>
          <img
            src={previewUrl}
            alt="Preview del documento"
            style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", display: "block", background: "var(--bg)" }}
          />
          <p style={{ fontSize: 12, color: "#633806", margin: "10px 0 8px", background: "#FDF3E7", border: "1px solid #F0D4A8", padding: "8px 10px", borderRadius: 8, lineHeight: 1.4 }}>
            Verificá que se lea bien antes de continuar — mala luz o foto inclinada puede hacer que el modelo alucine contenido.
          </p>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
            {file!.name} — {(file!.size / 1024).toFixed(0)} KB · {file!.type || "imagen"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: loading ? "#B4B2A9" : "#0F6B5C",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {loading ? "Leyendo el documento…" : "Confirmar y traducir"}
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={loading}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, color: "var(--ink-soft)" }}
            >
              Cambiar foto
            </button>
          </div>
          {loading && <div style={{ marginTop: 10 }}><LoadingState variant="foto" /></div>}
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            Plan B demo: si la foto falla por luz del lugar, usá el flujo de texto pegado — está a un clic.
          </p>
        </div>
      )}
    </div>
  );
}
