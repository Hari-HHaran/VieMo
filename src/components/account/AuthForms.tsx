'use client';
import { useActionState, useEffect, useRef } from 'react';
import { Button, Icon } from '@/ds/client';
import { requestReset, resendConfirmation, setNewPassword, signIn, signUp, type FormState } from '@/app/(account)/actions';
import { Field, FormProblem, PasswordField } from './Field';

const fieldError = (s: FormState, f: FormState['field']) => (s.field === f ? s.error : null);
/* An error tied to a field shows under that field; anything else shows above the form. */
const topError = (s: FormState) => (s.error && !s.field ? s.error : undefined);

/* After a failed submit, focus goes to the field that needs fixing. */
function useFocusOnError(state: FormState, form: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.field) form.current?.querySelector<HTMLInputElement>(`[name="${state.field}"]`)?.focus();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  return (
    <>
      <form ref={form} action={action} className="acct-form" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormProblem message={topError(state)} />
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} error={fieldError(state, 'email')} />
        <PasswordField label="Password" name="password" autoComplete="current-password" required error={fieldError(state, 'password')} />
        <Button type="submit" variant="primary" size="lg" busy={pending} className="acct-submit">{pending ? 'Signing in' : 'Sign in'}</Button>
      </form>
      {state.unconfirmed && state.email ? <ResendForm email={state.email} /> : null}
    </>
  );
}

function ResendForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, {});
  return (
    <form action={action} className="acct-inline">
      <input type="hidden" name="email" value={email} />
      {state.sent ? <p className="type-body" role="status"><Icon name="check" size={16} /> We sent a new link to {email}.</p>
        : <Button type="submit" variant="secondary" busy={pending}>{pending ? 'Sending' : 'Send the link again'}</Button>}
      {state.error ? <p className="acct-error type-caption" role="alert">{state.error}</p> : null}
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, {});
  const form = useRef<HTMLFormElement>(null);
  const done = useRef<HTMLHeadingElement>(null);
  useFocusOnError(state, form);
  useEffect(() => { if (state.sent) done.current?.focus(); }, [state.sent]);
  if (state.sent) {
    return (
      <div className="acct-sent">
        <h2 ref={done} tabIndex={-1} className="type-display-md">Check your inbox</h2>
        <p className="type-body">This VieMo server still asks new accounts to confirm their email, so we sent a link to <strong>{state.email}</strong>. Open it on this device to finish.</p>
        <p className="type-caption vm-muted">Nothing there after a few minutes? Check spam, or sign in to send it again.</p>
      </div>
    );
  }
  return (
    <form ref={form} action={action} className="acct-form" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormProblem message={topError(state)} />
      <Field label="Your name" hint="Optional. Shown on your profile and collections." name="display_name" autoComplete="name" maxLength={60} defaultValue={state.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} error={fieldError(state, 'email')} />
      <PasswordField label="Password" hint="At least 8 characters." name="password" autoComplete="new-password" required minLength={8} maxLength={72} error={fieldError(state, 'password')} />
      <PasswordField label="Confirm password" hint="Type the same password again." name="confirm_password" autoComplete="new-password" required minLength={8} maxLength={72} error={fieldError(state, 'confirm_password')} />
      {state.exists ? <p className="type-body"><a href={`/sign-in${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in instead</a></p> : null}
      <Button type="submit" variant="primary" size="lg" busy={pending} className="acct-submit">{pending ? 'Creating your account' : 'Create account'}</Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, {});
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  if (state.sent) {
    return (
      <div className="acct-sent" role="status">
        <p className="type-body">If <strong>{state.email}</strong> has a VieMo account, a link to choose a new password is on its way. It works once and expires after an hour.</p>
      </div>
    );
  }
  return (
    <form ref={form} action={action} className="acct-form" noValidate>
      <FormProblem message={topError(state)} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} error={fieldError(state, 'email')} />
      <Button type="submit" variant="primary" size="lg" busy={pending} className="acct-submit">{pending ? 'Sending' : 'Send reset link'}</Button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(setNewPassword, {});
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  return (
    <form ref={form} action={action} className="acct-form" noValidate>
      <FormProblem message={topError(state)} />
      <PasswordField label="New password" hint="At least 8 characters." name="password" autoComplete="new-password" required minLength={8} maxLength={72} error={fieldError(state, 'password')} />
      <Button type="submit" variant="primary" size="lg" busy={pending} className="acct-submit">{pending ? 'Saving' : 'Save new password'}</Button>
    </form>
  );
}
