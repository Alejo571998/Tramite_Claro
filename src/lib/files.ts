// src/lib/files.ts — preparación de fotos y PDFs antes de mandarlos

export const MAX_PAGINAS = 5;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;

/** Comprime a ~1600px de lado mayor en JPEG: ahorra cuota, latencia y entra en el límite de 4.5 MB. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // HEIC u otros formatos que el navegador no decodifica: se mandan tal cual
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob ?? file;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const isImage = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
export const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

export function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ── Control de calidad de fotos (punto 9) ───────────────────────────────
// Se analiza una versión chica en escala de grises: brillo medio y nitidez
// (varianza del Laplaciano). Solo advierte: nunca bloquea el envío.

export interface ImageQuality {
  brightness: number; // 0-255
  sharpness: number; // varianza del Laplaciano (más alto = más nítido)
  width: number;
  height: number;
  issues: ("oscura" | "borrosa" | "chica")[];
}

export const QUALITY = { minBrightness: 55, maxBrightness: 245, minSharpness: 90, minSide: 700 };

/** Métricas sobre píxeles en escala de grises (función pura, testeable). */
export function grayMetrics(gray: Uint8ClampedArray | number[], w: number, h: number) {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  const brightness = gray.length ? sum / gray.length : 0;
  let n = 0;
  let mean = 0;
  let m2 = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      n++;
      const d = lap - mean;
      mean += d / n;
      m2 += d * (lap - mean);
    }
  }
  return { brightness, sharpness: n > 1 ? m2 / (n - 1) : 0 };
}

export function qualityIssues(m: { brightness: number; sharpness: number; width: number; height: number }): ImageQuality["issues"] {
  const issues: ImageQuality["issues"] = [];
  if (m.brightness < QUALITY.minBrightness) issues.push("oscura");
  if (m.sharpness < QUALITY.minSharpness) issues.push("borrosa");
  if (Math.max(m.width, m.height) < QUALITY.minSide) issues.push("chica");
  return issues;
}

export async function analyzeImage(file: Blob, sample = 512): Promise<ImageQuality | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null; // HEIC u otro formato no decodificable: sin análisis
  }
  const scale = Math.min(1, sample / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(3, Math.round(bitmap.width * scale));
  const h = Math.max(3, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { width, height } = bitmap;
  bitmap.close();
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) gray[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  const m = grayMetrics(gray, w, h);
  return { ...m, width, height, issues: qualityIssues({ ...m, width, height }) };
}
