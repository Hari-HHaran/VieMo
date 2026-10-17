'use client';
import { useActionState, useEffect, useId, useRef } from 'react';
import { Button, Icon } from '@/ds/client';
import { saveProfile, type FormState } from '@/app/(account)/actions';
import { Field, FormProblem } from './Field';

export interface ProfileValues { username: string; display_name: string | null; bio: string | null; watchlist_visibility: 'private' | 'public'; activity_visibility: 'private' | 'friends' | 'public' | null }

export default function ProfileForm({ profile, next, welcome }: { profile: ProfileValues; next?: string; welcome: boolean }) {
  const [state, action, pending] = useActionState(saveProfile, {} as FormState);
  const form = useRef<HTMLFormElement>(null);
  const bioId = useId();
  useEffect(() => {
    if (state.field) form.current?.querySelector<HTMLElement>(`[name="${state.field}"]`)?.focus();
  }, [state]);
  return (
    <form ref={form} action={action} className="acct-form" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormProblem message={state.error && !state.field ? state.error : undefined} />
      <Field label="Username" hint="3 to 24 characters: lowercase letters, numbers and underscores. People find you by it." name="username"
        defaultValue={profile.username} required minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" autoComplete="username"
        autoCapitalize="none" spellCheck={false} error={state.field === 'username' ? state.error : null} />
      <Field label="Your name" hint="Optional." name="display_name" defaultValue={profile.display_name ?? ''} maxLength={60} autoComplete="name"
        error={state.field === 'display_name' ? state.error : null} />
      <div className={`acct-field${state.field === 'bio' ? ' has-error' : ''}`}>
        <label htmlFor={bioId} className="type-label">Bio</label>
        <p id={`${bioId}-hint`} className="type-caption vm-muted">Optional. Up to 280 characters.</p>
        <textarea id={bioId} name="bio" className="acct-input acct-textarea type-body" rows={3} maxLength={280} defaultValue={profile.bio ?? ''}
          aria-describedby={`${bioId}-hint${state.field === 'bio' ? ` ${bioId}-err` : ''}`} aria-invalid={state.field === 'bio' || undefined} />
        {state.field === 'bio' ? <p id={`${bioId}-err`} className="acct-error type-caption">{state.error}</p> : null}
      </div>
      <fieldset className="acct-choice">
        <legend className="type-label">Who can see your watchlist</legend>
        <label className="option"><input type="radio" name="watchlist_visibility" value="private" defaultChecked={profile.watchlist_visibility !== 'public'} />
          <span><span className="type-body">Only me</span> <span className="type-caption vm-muted">(recommended)</span></span></label>
        <label className="option"><input type="radio" name="watchlist_visibility" value="public" defaultChecked={profile.watchlist_visibility === 'public'} />
          <span className="type-body">Anyone with my profile</span></label>
      </fieldset>
      {profile.activity_visibility ? <fieldset className="acct-choice">
        <legend className="type-label">Who can see your Screening Activity</legend>
        <p className="type-caption vm-muted">The seat chart on your profile: which days you watched, rated and reviewed, the films and your reviews. Never your private notes.</p>
        <label className="option"><input type="radio" name="activity_visibility" value="private" defaultChecked={profile.activity_visibility === 'private'} />
          <span><span className="type-body">Only me</span> <span className="type-caption vm-muted">(recommended)</span></span></label>
        <label className="option"><input type="radio" name="activity_visibility" value="friends" defaultChecked={profile.activity_visibility === 'friends'} />
          <span><span className="type-body">Friends</span> <span className="type-caption vm-muted">(people you follow who follow you back)</span></span></label>
        <label className="option"><input type="radio" name="activity_visibility" value="public" defaultChecked={profile.activity_visibility === 'public'} />
          <span className="type-body">Anyone</span></label>
      </fieldset> : null}
      <div className="acct-actions">
        <Button type="submit" variant="primary" size="lg" busy={pending}>{pending ? 'Saving' : welcome ? 'Save and continue' : 'Save profile'}</Button>
        <p role="status" className="type-body acct-saved">{state.saved ? <><Icon name="check" size={16} /> Saved.</> : null}</p>
      </div>
    </form>
  );
}
