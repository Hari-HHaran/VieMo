'use client';
import { useId, useState } from 'react';
import { Icon } from '@/ds/client';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string | null;
}

/* A labelled input. The hint and any error are tied to it, so screen readers read them with the field. */
export function Field({ label, hint, error, className, ...input }: Props) {
  const id = useId();
  const described = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`acct-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id} className="type-label">{label}</label>
      {hint ? <p id={`${id}-hint`} className="type-caption vm-muted">{hint}</p> : null}
      <input id={id} className={`acct-input type-body ${className ?? ''}`} aria-invalid={error ? true : undefined} aria-describedby={described} {...input} />
      {error ? <p id={`${id}-err`} className="acct-error type-caption"><Icon name="triangle-alert" size={14} />{error}</p> : null}
    </div>
  );
}

/* Password with a Show button. Paste and password managers always work (no blocked paste, no puzzles). */
export function PasswordField({ label, hint, error, ...input }: Props) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const described = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`acct-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id} className="type-label">{label}</label>
      {hint ? <p id={`${id}-hint`} className="type-caption vm-muted">{hint}</p> : null}
      <div className="acct-pass">
        <input id={id} type={shown ? 'text' : 'password'} className="acct-input type-body" aria-invalid={error ? true : undefined} aria-describedby={described}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} {...input} />
        <button type="button" className="acct-show type-label" aria-pressed={shown} aria-controls={id} onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide' : 'Show'}<span className="vm-sr"> {label.toLowerCase()}</span>
        </button>
      </div>
      {error ? <p id={`${id}-err`} className="acct-error type-caption"><Icon name="triangle-alert" size={14} />{error}</p> : null}
    </div>
  );
}

export function FormProblem({ message }: { message?: string }) {
  return <div role="alert" aria-live="assertive" className="acct-alert-slot">{message ? <p className="acct-alert type-body"><Icon name="triangle-alert" size={18} />{message}</p> : null}</div>;
}
