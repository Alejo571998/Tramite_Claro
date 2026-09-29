import { defineConfig, loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";

// Sirve /api/traducir en `vite dev` y `vite preview` con el mismo núcleo que la
// Vercel Function (api/_lib/traducir.ts), así la API key nunca llega al cliente.
function apiDevPlugin(apiKey: string | undefined): Plugin {
  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

  const mount = (server: ViteDevServer | PreviewServer, load: () => Promise<{ traducir: (b: unknown, k?: string) => Promise<{ status: number; body: unknown }> }>) => {
    server.middlewares.use("/api/traducir", async (req: IncomingMessage, res: ServerResponse) => {
      res.setHeader("Content-Type", "application/json");
      if (req.method !== "POST") {
        res.statusCode = 405;
        return res.end(JSON.stringify({ error: { code: "bad_input", message: "Usá POST." } }));
      }
      let body: unknown = null;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        /* body inválido: lo valida el núcleo */
      }
      const { traducir } = await load();
      const out = await traducir(body, apiKey);
      res.statusCode = out.status;
      res.end(JSON.stringify(out.body));
    });
  };

  return {
    name: "tramite-claro-api-dev",
    configureServer(server) {
      mount(server, () => server.ssrLoadModule("/api/_lib/traducir.ts") as never);
    },
    configurePreviewServer(server) {
      mount(server, () => import("./api/_lib/traducir.ts") as never);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), apiDevPlugin(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY)],
  };
});
