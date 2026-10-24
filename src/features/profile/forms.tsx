"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePassword, type AuthFormState } from "@/features/auth/actions";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { deleteAccount, startNewBlock, updateDisplayName, updateTrainingSettings, type ProfileFormState } from "./actions";

function Status({ state }: { state: ProfileFormState | AuthFormState }) {
  if (!state.message) return null;
  return (
    <Notice tone={state.status === "saved" ? "success" : "error"} className="py-3">
      {state.message}
    </Notice>
  );
}

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState<ProfileFormState, FormData>(updateDisplayName, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <Status state={state} />
      <Field label="Your name" name="name" defaultValue={name} autoComplete="given-name" maxLength={60} required error={state.errors?.name} />
      <SubmitButton variant="secondary" size="md" pendingLabel="Saving…">
        Save name
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-3" noValidate key={state.status === "saved" ? "saved" : "editing"}>
      <Status state={state} />
      <PasswordField label="Current password" name="current" autoComplete="current-password" required error={state.errors?.current} />
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
        hint={`At least ${PASSWORD_MIN} characters.`}
        error={state.errors?.password}
      />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" required error={state.errors?.confirm} />
      <SubmitButton variant="secondary" size="md" pendingLabel="Saving…">
        Change password
      </SubmitButton>
    </form>
  );
}

export function TrainingSettingsForm({ children }: { children: ReactNode }) {
  const [state, action] = useActionState<ProfileFormState, FormData>(updateTrainingSettings, {});
  const errors = Object.values(state.errors ?? {}).filter(Boolean) as string[];
  return (
    <form action={action} className="space-y-6" noValidate>
      {(state.message || errors.length > 0) && (
        <Notice tone="error" title="Check your settings">
          {state.message && <p>{state.message}</p>}
          {errors.length > 0 && (
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}
      {children}
      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save settings
      </SubmitButton>
      <p className="text-center text-caption text-text-secondary">Your finished workouts and levels stay as they are.</p>
    </form>
  );
}

export function NewBlockForm() {
  const [state, action] = useActionState<ProfileFormState, FormData>(startNewBlock, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <Status state={state} />
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body">
        <input type="checkbox" name="confirm" className="mt-1 size-5 shrink-0 accent-[#ccf13c]" aria-describedby={state.errors?.confirm ? "confirm-error" : undefined} />
        <span>I understand the current schedule will be archived and a new 12 weeks will start today. My levels, history and milestones are kept.</span>
      </label>
      {state.errors?.confirm && (
        <p id="confirm-error" className="text-body font-semibold text-state-error">
          {state.errors.confirm}
        </p>
      )}
      <SubmitButton variant="secondary" size="md" pendingLabel="Starting…">
        Start a new 12-week block
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<ProfileFormState, FormData>(deleteAccount, {});
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-card border border-state-error/40 px-4 font-semibold text-state-error hover:border-state-error"
      >
        Delete my account…
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-card bg-error-tint p-4" noValidate>
      <Status state={state} />
      <p className="text-body text-text-primary">
        This permanently deletes your account, programme, every logged set and your milestones. It can&apos;t be undone. Download your data first if you want a copy.
      </p>
      <Field label="Type DELETE to confirm" name="confirmText" autoComplete="off" autoCapitalize="characters" required error={state.errors?.confirmText} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" size="md" pendingLabel="Deleting…">
          Permanently delete
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="min-h-12 px-4 font-semibold text-text-secondary hover:text-text-primary">
          Cancel
        </button>
      </div>
    </form>
  );
}
