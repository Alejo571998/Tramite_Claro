import { defineConfig, loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";

type Core = (body: unknown, req: { ip: string; origin?: string; host?: string }) => Promise<{ status: number; body: unknown; headers?: Record<string, string> }>;

// Rutas /api/* → [módulo, export]. Son los mismos núcleos que usan las Vercel Functions
// de api/*.ts, así que dev y producción se comportan igual (y la key nunca va al cliente).
const ROUTES: Record<string, [string, string]> = {
  "/api/traducir": ["/api/_lib/traducir.ts", "traducir"],
  "/api/taku": ["/api/_lib/taku.ts", "taku"],
  "/api/redactar": ["/api/_lib/redactar.ts", "redactar"],
  "/api/feedback": ["/api/_lib/telemetry.ts", "feedback"],
  "/api/log": ["/api/_lib/telemetry.ts", "logError"],
};

function apiDevPlugin(env: Record<string, string>): Plugin {
  // Los núcleos leen process.env (igual que en Vercel)
  for (const k of ["GEMINI_API_KEY", "VITE_GEMINI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"])
    if (env[k] && !process.env[k]) process.env[k] = env[k];

  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

  const mount = (server: ViteDevServer | PreviewServer, load: (file: string) => Promise<Record<string, Core>>) => {
    for (const [route, [file, fn]] of Object.entries(ROUTES)) {
      server.middlewares.use(route, async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
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
        const core = (await load(file))[fn];
        const out = await core(body, { ip: req.socket.remoteAddress ?? "local", origin: req.headers.origin, host: req.headers.host });
        for (const [k, v] of Object.entries(out.headers ?? {})) res.setHeader(k, v);
        res.statusCode = out.status;
        res.end(JSON.stringify(out.body));
      });
    }
  };

  return {
    name: "tramite-claro-api-dev",
    configureServer(server) {
      mount(server, (file) => server.ssrLoadModule(file) as never);
    },
    configurePreviewServer(server) {
      mount(server, (file) => import(/* @vite-ignore */ `.${file}`) as never);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), apiDevPlugin(env)],
    define: { __APP_RELEASE__: JSON.stringify(new Date().toISOString().slice(0, 16)) },
    test: {
      include: ["tests/unit/**/*.test.ts"],
      environment: "node",
    },
  };
});
