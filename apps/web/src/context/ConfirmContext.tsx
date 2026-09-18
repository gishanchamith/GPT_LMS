'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

interface PendingRequest extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

const ConfirmContext = createContext<Confirm | null>(null);

// const confirm = useConfirm(); if (await confirm({ title, message })) { ... }
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<Confirm>(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request],
  );

  useEffect(() => {
    if (!request) return;
    confirmButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
              {request.title}
            </h2>
            {request.message && <p className="mt-2 text-sm text-slate-600">{request.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                ref={confirmButton}
                variant={request.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {request.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
