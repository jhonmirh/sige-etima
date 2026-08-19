'use client';

import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SigeToastDetail = {
  message: string;
  tone?: 'success' | 'error' | 'info';
  duration?: number;
};

type ToastState = SigeToastDetail & { id: number };

export default function GlobalToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<SigeToastDetail>).detail;
      if (!detail?.message) return;
      if (timer.current) clearTimeout(timer.current);
      const next = { id: Date.now(), tone: 'success' as const, duration: 1900, ...detail };
      setToast(next);
      timer.current = setTimeout(() => setToast(null), next.duration || 1900);
    };
    window.addEventListener('sige:toast', onToast as EventListener);
    return () => {
      window.removeEventListener('sige:toast', onToast as EventListener);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;
  const Icon = toast.tone === 'error' ? TriangleAlert : toast.tone === 'info' ? Info : CheckCircle2;
  return (
    <div className={`global-toast global-toast-${toast.tone || 'success'}`} role="status" aria-live="polite" aria-atomic="true">
      <Icon size={20} aria-hidden="true" />
      <span>{toast.message}</span>
      <button type="button" className="global-toast-close" onClick={() => setToast(null)} aria-label="Cerrar aviso" title="Cerrar aviso">
        <X size={16} />
      </button>
    </div>
  );
}
