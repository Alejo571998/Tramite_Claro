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
  const { login, register, continueAsGuest } = useAuth();
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
          <button type="button" className="btn btn--ghost btn--block" onClick={guest}>
            Probar sin cuenta
          </button>

          <p className="auth-card__note">
            <Icon name="lock" size={13} /> Por ahora tu cuenta y tus trámites se guardan solo en este dispositivo.
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
