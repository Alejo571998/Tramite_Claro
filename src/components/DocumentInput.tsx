// src/components/DocumentInput.tsx — foto (varias páginas), PDF o texto/descripción.
// Arrastrar, pegar (Ctrl+V) o usar la cámara. Si soltás un PDF en "Foto", cambia solo.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { MAX_PAGINAS, MAX_PDF_BYTES, blobToBase64, compressImage, formatBytes, isImage, isPdf } from "../lib/files";
import { readJSON, uid, writeJSON } from "../lib/storage";
import { useTaku } from "../taku/TakuContext";
import type { TraducirRequest } from "../types/tramite";

export type Modo = "foto" | "pdf" | "texto";

interface Page {
  id: string;
  file: File;
  url: string;
}

interface Props {
  onSubmit: (req: TraducirRequest, fuente: Modo) => void;
  busy?: boolean;
  /** Texto precargado (ej: "Usar el texto" de un ejemplo). Para re-aplicarlo, remontar con otra `key`. */
  initialText?: string;
}

const MODOS: { id: Modo; label: string; icon: IconName }[] = [
  { id: "foto", label: "Foto", icon: "camera" },
  { id: "pdf", label: "PDF", icon: "pdf" },
  { id: "texto", label: "Escribir", icon: "text" },
];
const MODE_KEY = "tc:input-mode";

export function DocumentInput({ onSubmit, busy, initialText }: Props) {
  const { emit } = useTaku();
  const [modo, setModoState] = useState<Modo>(() => (initialText ? "texto" : readJSON<Modo>(MODE_KEY, "foto")));
  const [pages, setPages] = useState<Page[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [texto, setTexto] = useState(initialText ?? "");
  const [drag, setDrag] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const pagesRef = useRef<Page[]>([]);
  useLayoutEffect(() => {
    pagesRef.current = pages;
  });
  const ids = useId();

  const setModo = (m: Modo) => {
    setModoState(m);
    writeJSON(MODE_KEY, m);
    setProblem(null);
  };

  useEffect(() => {
    if (initialText) textRef.current?.focus({ preventScroll: true });
  }, [initialText]);

  // Liberar las URLs de preview al desmontar
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setProblem(null);

    const pdfs = files.filter(isPdf);
    if (pdfs.length) {
      const f = pdfs[0];
      if (f.size > MAX_PDF_BYTES) {
        setProblem(`Ese PDF pesa ${formatBytes(f.size)}. El máximo es ${formatBytes(MAX_PDF_BYTES)}: probá sacándole fotos a las páginas importantes.`);
        return;
      }
      setModo("pdf");
      setPdf(f);
      emit({ type: "input:files", fuente: "pdf", count: 1 });
      return;
    }

    const imgs = files.filter(isImage);
    if (!imgs.length) {
      setProblem("Ese formato no lo puedo leer. Usá una foto (JPG, PNG) o un PDF.");
      return;
    }
    setModo("foto");
    const room = MAX_PAGINAS - pagesRef.current.length;
    if (room <= 0) {
      setProblem(`Podés mandar hasta ${MAX_PAGINAS} páginas por vez.`);
      return;
    }
    if (imgs.length > room) setProblem(`Sumé ${room} de ${imgs.length}: el máximo es ${MAX_PAGINAS} páginas.`);
    const nuevas = imgs.slice(0, room).map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) }));
    const total = pagesRef.current.length + nuevas.length;
    pagesRef.current = [...pagesRef.current, ...nuevas];
    setPages((prev) => [...prev, ...nuevas]);
    emit({ type: "input:files", fuente: "foto", count: total });
  }

  function removePage(id: string) {
    setPages((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  // Pegar una captura con Ctrl+V
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length && (files.some(isImage) || files.some(isPdf))) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(true);
    },
    onDragLeave: () => setDrag(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      addFiles(e.dataTransfer.files);
    },
  };

  const ready = modo === "foto" ? pages.length > 0 : modo === "pdf" ? !!pdf : texto.trim().length >= 15;
  const disabled = !ready || busy || preparing;

  async function submit() {
    if (disabled) return;
    setProblem(null);
    if (modo === "texto") return onSubmit({ tipo: "texto", texto: texto.trim() }, "texto");
    setPreparing(true);
    try {
      if (modo === "pdf" && pdf) {
        onSubmit({ tipo: "archivos", fuente: "pdf", archivos: [{ mimeType: "application/pdf", data: await blobToBase64(pdf) }] }, "pdf");
      } else {
        const archivos = await Promise.all(
          pages.map(async (p) => {
            const blob = await compressImage(p.file);
            return { mimeType: blob.type || p.file.type || "image/jpeg", data: await blobToBase64(blob) };
          }),
        );
        onSubmit({ tipo: "archivos", fuente: "foto", archivos }, "foto");
      }
    } catch {
      setProblem("No pude preparar el archivo. Probá con otro.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="card doc-input">
      <div className="segmented segmented--lg" role="tablist" aria-label="Cómo querés mandar el trámite">
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`${ids}-${m.id}`}
            aria-selected={modo === m.id}
            aria-controls={`${ids}-panel`}
            className="segmented__item"
            onClick={() => setModo(m.id)}
          >
            <Icon name={m.icon} size={17} /> {m.label}
          </button>
        ))}
      </div>

      <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-${modo}`} className="doc-input__panel">
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        <input ref={galleryRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        <input ref={pdfRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />

        {modo === "foto" &&
          (pages.length === 0 ? (
            <div className={`dropzone${drag ? " is-drag" : ""}`} {...dropProps}>
              <span className="dropzone__icon">
                <Icon name="camera" size={26} />
              </span>
              <p className="dropzone__title">Sacale una foto al papel</p>
              <p className="dropzone__sub">De frente, con buena luz y que se vea la hoja entera. Si tiene varias hojas, sumalas todas.</p>
              <div className="dropzone__actions">
                <button type="button" className="btn btn--primary only-touch" onClick={() => camRef.current?.click()}>
                  <Icon name="camera" size={17} /> Sacar foto
                </button>
                <button type="button" className="btn btn--soft" onClick={() => galleryRef.current?.click()}>
                  <Icon name="image" size={17} /> Elegir de la galería
                </button>
              </div>
              <p className="dropzone__hint only-pointer">También podés arrastrarla acá o pegarla con Ctrl+V.</p>
            </div>
          ) : (
            <div className="pages" {...dropProps}>
              <ol className="pages__grid">
                {pages.map((p, i) => (
                  <li key={p.id} className="page-thumb">
                    <img src={p.url} alt={`Página ${i + 1}`} />
                    <span className="page-thumb__n">{i + 1}</span>
                    <button type="button" className="page-thumb__rm" onClick={() => removePage(p.id)} aria-label={`Quitar página ${i + 1}`}>
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
                {pages.length < MAX_PAGINAS && (
                  <li>
                    <button type="button" className="page-add" onClick={() => galleryRef.current?.click()}>
                      <Icon name="plus" size={20} />
                      <span>Sumar página</span>
                    </button>
                  </li>
                )}
              </ol>
              <p className="pages__tip">
                <Icon name="eye" size={15} /> Revisá que se lean las letras. Si una sale borrosa, sacala de nuevo.
              </p>
            </div>
          ))}

        {modo === "pdf" &&
          (!pdf ? (
            <div className={`dropzone${drag ? " is-drag" : ""}`} {...dropProps}>
              <span className="dropzone__icon">
                <Icon name="pdf" size={26} />
              </span>
              <p className="dropzone__title">Subí el PDF del trámite</p>
              <p className="dropzone__sub">El que te mandaron por mail o bajaste de la web del organismo. Hasta {formatBytes(MAX_PDF_BYTES)}.</p>
              <div className="dropzone__actions">
                <button type="button" className="btn btn--soft" onClick={() => pdfRef.current?.click()}>
                  <Icon name="folder" size={17} /> Elegir PDF
                </button>
              </div>
              <p className="dropzone__hint only-pointer">O arrastralo acá.</p>
            </div>
          ) : (
            <div className="file-row">
              <span className="file-row__icon">
                <Icon name="pdf" size={22} />
              </span>
              <div className="file-row__meta">
                <strong>{pdf.name}</strong>
                <span>{formatBytes(pdf.size)}</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPdf(null)} aria-label="Quitar PDF">
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}

        {modo === "texto" && (
          <div className="textarea-wrap">
            <label htmlFor={`${ids}-texto`} className="sr-only">
              Texto del trámite
            </label>
            <textarea
              ref={textRef}
              id={`${ids}-texto`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              placeholder={"Pegá el texto del trámite…\n\n…o contalo con tus palabras. Ej: «Me llegó una carta de ANSES que dice que tengo que presentar la libreta antes de diciembre y no sé qué es»."}
            />
            <div className="textarea-wrap__foot">
              <span>{texto.length > 0 && texto.trim().length < 15 ? "Contame un poquito más…" : `${texto.length.toLocaleString("es-AR")} caracteres`}</span>
              {texto && (
                <button type="button" className="btn btn--link" onClick={() => setTexto("")}>
                  Borrar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}

      <div className="doc-input__cta">
        <button type="button" className="btn btn--primary btn--lg btn--block" disabled={disabled} onClick={submit}>
          <Icon name="sparkles" size={18} /> {preparing ? "Preparando…" : "Explicámelo"}
        </button>
        <p className="doc-input__privacy">
          <Icon name="lock" size={13} /> Tu documento se usa solo para explicártelo: Trámite Claro no lo guarda.
        </p>
      </div>
    </div>
  );
}
