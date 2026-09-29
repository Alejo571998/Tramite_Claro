// tests/e2e/app.spec.ts — flujos principales con la API simulada.
import { expect, test, type Page } from "@playwright/test";

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TRAMITE = {
  titulo: "Presentación de Libreta AUH",
  resumen: "Tenés que presentar la libreta para cobrar el 20% retenido.",
  organismo: "ANSES",
  urgencia: "alta",
  checklist: [
    { paso: "Descargá el formulario", detalle: "Es el PS 1.47." },
    { paso: "Hacé firmar la escuela", detalle: "" },
    { paso: "Presentá la libreta", detalle: "Online o en una oficina." },
  ],
  alertas: [{ texto: "Si no la presentás, perdés el 20% acumulado.", severidad: "critico" }],
  plazo: "Hasta dentro de 5 días",
  fecha_limite: inDays(5),
  glosario: [{ termino: "Libreta AUH", significado: "Formulario de salud y escuela." }],
};

// Sin red externa en los tests (fuentes de Google): más rápido y sin flakiness.
test.beforeEach(async ({ page }) => {
  await page.route(/fonts.(googleapis|gstatic).com/, (r) => r.abort());
});

async function asGuest(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Probar sin cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Te lo explico fácil");
}

async function mockApi(page: Page, overrides: Partial<Record<"traducir" | "taku" | "redactar", (body: unknown) => { status: number; json: unknown }>> = {}) {
  const calls: Record<string, unknown[]> = { traducir: [], taku: [], redactar: [], feedback: [] };
  await page.route("**/api/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    const body = route.request().postDataJSON();
    (calls[name] ??= []).push(body);
    const custom = overrides[name as keyof typeof overrides];
    if (custom) {
      const r = custom(body);
      return route.fulfill({ status: r.status, json: r.json });
    }
    if (name === "traducir") return route.fulfill({ json: TRAMITE });
    if (name === "taku") return route.fulfill({ json: { text: "Lo primero es descargar el formulario PS 1.47.", suggestions: ["¿Dónde lo presento?"] } });
    if (name === "redactar")
      return route.fulfill({ json: { asunto: "Solicitud de prórroga", cuerpo: "Ciudad, [Fecha]\n\nSeñores de ANSES:\nSolicito una prórroga…\n\n[Nombre y apellido]\n[DNI]", notas: ["Pedí constancia de recepción."] } });
    return route.fulfill({ json: { ok: true } });
  });
  return calls;
}

async function explainText(page: Page) {
  await page.getByRole("tab", { name: /Escribir/ }).click();
  await page.locator("textarea").first().fill("Me llegó una carta de ANSES que dice que tengo que presentar la Libreta AUH.");
  await page.getByRole("button", { name: /Explicámelo/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TRAMITE.titulo);
}

test("invitado: ejemplo resuelto con glosario, link oficial y progreso guardado", async ({ page }) => {
  await mockApi(page);
  await asGuest(page);
  await page.getByRole("button", { name: "Ver cómo queda" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recategorización de Monotributo");
  await expect(page.getByText("Palabras difíciles, traducidas")).toBeVisible();
  const oficial = page.getByRole("link", { name: /Web oficial/ });
  await expect(oficial).toHaveAttribute("href", "https://www.arca.gob.ar");

  await page.getByRole("checkbox").first().click();
  await expect(page.getByRole("img", { name: "1 de 5 pasos hechos" })).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("img", { name: "1 de 5 pasos hechos" })).toBeVisible();
});

test("texto → resultado con cuenta regresiva y recordatorio", async ({ page }) => {
  const calls = await mockApi(page);
  await asGuest(page);
  await explainText(page);
  expect(calls.traducir).toHaveLength(1);
  await expect(page.getByText("Faltan 5 días")).toBeVisible();
  await page.getByRole("button", { name: /Agendar recordatorio/ }).click();
  const gcal = page.getByRole("menuitem", { name: /Google Calendar/ });
  await expect(gcal).toHaveAttribute("href", /calendar\.google\.com/);
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /\.ics/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^vence-\d{4}-\d{2}-\d{2}\.ics$/);

  // aparece en "Mis trámites" con la cuenta regresiva
  await page.goto("/#/mis-tramites", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(TRAMITE.titulo)).toBeVisible();
  await expect(page.getByText("Faltan 5 días")).toBeVisible();
});

test("error del servicio: mensaje claro y el texto no se pierde", async ({ page }) => {
  await mockApi(page, { traducir: () => ({ status: 503, json: { error: { code: "busy", message: "El servicio de lectura está saturado." } } }) });
  await asGuest(page);
  await page.getByRole("tab", { name: /Escribir/ }).click();
  const texto = "Me llegó una intimación de ARCA por una deuda del monotributo.";
  await page.locator("textarea").first().fill(texto);
  await page.getByRole("button", { name: /Explicámelo/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No pude leer el trámite" })).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue(texto);
  await expect(page.getByRole("button", { name: /Probar de nuevo/ })).toBeVisible();
});

test("límite de uso: explica que hay que esperar", async ({ page }) => {
  await mockApi(page, { traducir: () => ({ status: 429, json: { error: { code: "rate_limited", message: "Vas muy rápido. Esperá un minutito y probá de nuevo." } } }) });
  await asGuest(page);
  await page.getByRole("tab", { name: /Escribir/ }).click();
  await page.locator("textarea").first().fill("Me llegó una carta de ANSES por la libreta.");
  await page.getByRole("button", { name: /Explicámelo/ }).click();
  await expect(page.getByText("Vas muy rápido")).toBeVisible();
});

test("chat real con Taku: manda el trámite y el link oficial como contexto", async ({ page }) => {
  const calls = await mockApi(page);
  await asGuest(page);
  await explainText(page);
  await page.getByRole("button", { name: "Preguntar" }).click();
  await page.getByRole("textbox", { name: "Tu pregunta para Taku" }).fill("¿Qué hago primero?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Lo primero es descargar el formulario PS 1.47.")).toBeVisible();
  const sent = calls.taku[0] as { messages: { role: string; text: string }[]; context: { tramite: { titulo: string }; oficial: { url: string } } };
  expect(sent.context.tramite.titulo).toBe(TRAMITE.titulo);
  expect(sent.context.oficial.url).toBe("https://www.anses.gob.ar");
  expect(sent.messages.at(-1)?.text).toBe("¿Qué hago primero?");
});

test("borrador de nota y feedback", async ({ page }) => {
  const calls = await mockApi(page);
  await asGuest(page);
  await explainText(page);
  await page.getByRole("radio", { name: /Pedir más tiempo/ }).click();
  await page.getByRole("button", { name: /Armar borrador/ }).click();
  await expect(page.getByRole("textbox", { name: "Borrador de la nota" })).toHaveValue(/Solicito una prórroga/);
  expect((calls.redactar[0] as { tipo: string }).tipo).toBe("prorroga");

  await page.getByRole("button", { name: /No mucho/ }).click();
  await page.getByRole("button", { name: "No se entiende" }).click();
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText("¡Gracias! Tu opinión")).toBeVisible();
  await expect.poll(() => calls.feedback.length).toBe(1);
  expect(calls.feedback[0]).toMatchObject({ rating: "down", motivo: "No se entiende", organismo: "ANSES" });
});

test("cuenta local: registro, sesión y cierre", async ({ page }) => {
  await mockApi(page);
  await page.goto("/#/crear-cuenta", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Tu nombre").fill("Ana");
  await page.getByLabel("Mail").fill(`ana.${Date.now()}@example.com`);
  await page.getByLabel("Contraseña", { exact: true }).fill("prueba-local-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Hola, Ana")).toBeVisible();
  await page.getByRole("button", { name: /Cuenta de Ana/ }).click();
  await page.getByRole("menuitem", { name: /Cerrar sesión/ }).click();
  await expect(page).toHaveURL(/#\/ingresar/);
});
