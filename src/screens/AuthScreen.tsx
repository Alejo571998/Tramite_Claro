// src/screens/AuthScreen.tsx — ingreso / registro con Taku asomado detrás de la tarjeta.
// Reacciones: se esconde cuando escribís la contraseña, saluda al leer tu nombre,
// se preocupa ante un error y salta cuando entrás.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { AuthError } from "../auth/authService";
import { navigate } from "../lib/router";
import { TakuAvatar } from "../taku/TakuAvatar";
import type { TakuMood } from "../taku/types";
import { BrandMark } from "../components/BrandMark";
import { Icon } from "../components/Icon";

type Mode = "ingresar" | "crear-cuenta";
type Peek = "up" | "shy" | "jump";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AuthScreen({ mode }: { mode: Mode }) {
  const { login, register, continueAsGuest, cloud, googleAvailable, loginWithGoogle } = useAuth();
  const [info, setInfo] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ nombre?: string; email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [peek, setPeek] = useState<Peek>("up");
  const isRegister = mode === "crear-cuenta";
  // Se monta de nuevo al cambiar de pestaña (key en App), así arranca saludando.
  const [mood, setMood] = useState<TakuMood>("greet");
  const [bubble, setBubble] = useState<string | null>(
    isRegister ? "¡Sumate! Así guardo tus trámites y tu progreso." : "¡Hola de nuevo! Te estaba esperando.",
  );
  const moodTimer = useRef<number | undefined>(undefined);

  const react = (m: TakuMood, text: string | null, ms = 1600) => {
    window.clearTimeout(moodTimer.current);
    setMood(m);
    setBubble(text);
    moodTimer.current = window.setTimeout(() => setMood("idle"), ms);
  };

  useEffect(() => {
    moodTimer.current = window.setTimeout(() => setMood("idle"), 2000);
    return () => window.clearTimeout(moodTimer.current);
  }, []);

  // Saluda por el nombre cuando terminás de escribirlo.
  useEffect(() => {
    if (!isRegister) return;
    const n = nombre.trim().split(/\s+/)[0];
    if (n.length < 2) return;
    const t = window.setTimeout(() => react("happy", `¡Un gusto, ${n}!`, 1200), 700);
    return () => window.clearTimeout(t);
  }, [nombre, isRegister]);

  const onPassFocus = () => {
    if (showPass) return;
    setPeek("shy");
    setBubble("No miro, tranqui.");
  };
  const onPassBlur = () => {
    setPeek("up");
    setBubble(null);
  };

  function validate() {
    const e: typeof errors = {};
    if (isRegister && nombre.trim().length < 2) e.nombre = "Contanos cómo te llamás.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Revisá el mail, parece incompleto.";
    if (password.length < 6) e.password = "La contraseña necesita al menos 6 caracteres.";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setPeek("up");
      react("concerned", "Me parece que falta algo. Fijate lo marcado en rojo.", 1400);
      return;
    }
    setBusy(true);
    try {
      const u = isRegister ? await register(nombre, email, password) : await login(email, password);
      setPeek("jump");
      react("celebrate", `¡Adelante, ${u.nombre.split(" ")[0]}!`, 1400);
      window.setTimeout(() => navigate({ name: "inicio" }, { replace: true }), 700);
    } catch (err) {
      if (err instanceof AuthError && err.kind === "confirm") {
        setInfo(err.message);
        setErrors({});
        react("happy", "¡Revisá tu mail! Ahí te espera el link para confirmar.", 1600);
        return;
      }
      const msg = err instanceof Error ? err.message : "No pudimos completar el ingreso.";
      const field = err instanceof AuthError ? err.field : undefined;
      setErrors(field ? { [field]: msg } : { form: msg });
      setPeek("up");
      react("concerned", "Uy, algo no coincide. Probemos de nuevo.", 1400);
    } finally {
      setBusy(false);
    }
  }

  const guest = () => {
    continueAsGuest();
    navigate({ name: "inicio" }, { replace: true });
  };

  return (
    <main className="auth">
      <section className="auth__pitch" aria-labelledby="auth-pitch-title">
        <BrandMark />
        <h1 id="auth-pitch-title" className="auth__title">
          Los trámites, <em>en palabras simples.</em>
        </h1>
        <p className="auth__lead">Sacale una foto a ese papel que no entendés. Taku te lo explica y te arma los pasos para resolverlo.</p>
        <ul className="auth__benefits">
          <li>
            <Icon name="camera" /> Foto, PDF o contalo con tus palabras
          </li>
          <li>
            <Icon name="list" /> Lista de pasos que podés ir tildando
          </li>
          <li>
            <Icon name="clock" /> Plazos y riesgos, bien a la vista
          </li>
        </ul>
      </section>

      <section className="auth__stage">
        <div className={`auth-peek auth-peek--${peek}`}>
          <TakuAvatar mood={peek === "shy" ? "shy" : mood} size={200} eager />
        </div>
        {bubble && (
          <div className="auth-bubble" role="status" aria-live="polite" key={bubble}>
            {bubble}
          </div>
        )}

        <form className="card auth-card" onSubmit={onSubmit} noValidate>
          <div className="segmented" role="tablist" aria-label="Ingresar o crear cuenta">
            <a role="tab" aria-selected={!isRegister} className="segmented__item" href="#/ingresar">
              Ingresar
            </a>
            <a role="tab" aria-selected={isRegister} className="segmented__item" href="#/crear-cuenta">
              Crear cuenta
            </a>
          </div>

          <h2 className="auth-card__title">{isRegister ? "Creá tu cuenta" : "Qué bueno verte"}</h2>

          {isRegister && (
            <Field label="Tu nombre" error={errors.nombre} id="nombre">
              <input id="nombre" autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ana" />
            </Field>
          )}
          <Field label="Mail" error={errors.email} id="email">
            <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@mail.com" />
          </Field>
          <Field label="Contraseña" error={errors.password} id="password" hint={isRegister ? "Mínimo 6 caracteres." : undefined}>
            <div className="input-affix">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={onPassFocus}
                onBlur={onPassBlur}
              />
              <button
                type="button"
                className="input-affix__btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowPass((v) => !v);
                  setPeek(showPass ? "shy" : "up");
                }}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Icon name={showPass ? "eye-off" : "eye"} />
              </button>
            </div>
          </Field>

          {info && (
            <p className="notice" role="status">
              <Icon name="mail" size={16} /> {info}
            </p>
          )}
          {errors.form && (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
            {busy ? "Un segundo…" : isRegister ? "Crear cuenta" : "Ingresar"}
          </button>

          <div className="divider">
            <span>o</span>
          </div>
          {googleAvailable && (
            <button
              type="button"
              className="btn btn--ghost btn--block btn--google"
              onClick={() =>
                loginWithGoogle().catch((e: unknown) => setErrors({ form: e instanceof Error ? e.message : "No se pudo abrir Google." }))
              }
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              Continuar con Google
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--block" onClick={guest}>
            Probar sin cuenta
          </button>

          <p className="auth-card__note">
            <Icon name="lock" size={13} />{" "}
            {cloud
              ? "Tus trámites quedan guardados en tu cuenta y los ves desde cualquier dispositivo."
              : "Por ahora tu cuenta y tus trámites se guardan solo en este dispositivo."}
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({ label, error, hint, id, children }: { label: string; error?: string; hint?: string; id: string; children: React.ReactNode }) {
  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field__msg" id={`${id}-msg`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}
