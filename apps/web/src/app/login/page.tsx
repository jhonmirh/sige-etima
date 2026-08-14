'use client';

import { FormEvent, useState } from 'react';
import { LoaderCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { BRANDING } from '@/lib/branding';

export default function Login() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);

    try {
      const f = new FormData(e.currentTarget);
      const r = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
      });

      if (!r.ok) {
        setError('Usuario o contraseña inválidos');
        setSubmitting(false);
        return;
      }

      const j = await r.json();
      localStorage.setItem('sige_access', j.accessToken);
      router.push('/dashboard');
    } catch {
      setError('No fue posible conectar con el sistema. Intente nuevamente.');
      setSubmitting(false);
    }
  }

  return (
    <main className="login login-cover-v224">
      <section className="login-showcase-v224" aria-label="Portada de Integra Escolar">
        <div className="login-image-card-v224 login-image-card-primary-v224">
          <img
            src="/brand/login-integra-escolar-01.jpg"
            alt="Integra Escolar, sistema integral de gestión educativa"
          />
        </div>
        <div className="login-image-card-v224 login-image-card-secondary-v224">
          <img
            src="/brand/login-integra-escolar-02.png"
            alt="Identidad visual de Integra Escolar"
          />
        </div>
      </section>

      <section className="login-panel login-panel-v224">
        <form className="form login-form-v224" onSubmit={submit}>
          <div className="login-brand-v224">
            <img src={BRANDING.schoolLogo} alt="Escudo ET Isaías Medina Angarita" />
            <div>
              <strong>{BRANDING.systemName}</strong>
              <span>{BRANDING.schoolName}</span>
            </div>
          </div>

          <div className="login-heading-v224">
            <h1>Iniciar sesión</h1>
            <p className="muted">Acceso para Dirección, Secretaría y Docentes.</p>
          </div>

          {error && <div className="alert">{error}</div>}

          <label htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            className="input"
            name="email"
            type="email"
            defaultValue="admin@etima.local"
            autoComplete="username"
            required
          />

          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            className="input"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          <button
            className={`btn login-submit-v224${submitting ? ' is-loading' : ''}`}
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? <LoaderCircle className="login-spinner-v224" size={19} /> : <LogIn size={19} />}
            <span>{submitting ? 'Entrando al sistema…' : 'Entrar al sistema'}</span>
          </button>

          <p className="login-security-v224">Acceso seguro · Gestión escolar, personal y académica</p>
        </form>
      </section>
    </main>
  );
}
