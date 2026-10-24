import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChoiceCardProps {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  title: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  required?: boolean;
  disabled?: boolean;
}

/**
 * A large selectable card built on a real radio or checkbox input, so keyboard
 * and screen reader behaviour comes from the browser. Styling follows the
 * input's state with :has().
 */
export function ChoiceCard({ type, name, value, title, body, meta, badge, icon, defaultChecked, checked, onChange, required, disabled }: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-start gap-4 rounded-card border border-transparent bg-surface-secondary p-4 transition-colors",
        "hover:bg-surface-elevated has-[:checked]:border-accent-primary has-[:checked]:bg-surface-elevated has-[:checked]:shadow-[0_0_24px_-6px_rgba(204,241,60,0.35)]",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-primary",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.currentTarget.checked) : undefined}
        required={required}
        disabled={disabled}
        className="peer sr-only"
      />
      {icon && (
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-small bg-surface-interactive text-text-secondary group-has-[:checked]:bg-accent-primary group-has-[:checked]:text-text-on-accent">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 space-y-1">
        {badge && <span className="block">{badge}</span>}
        <span className="block font-display text-card font-semibold text-text-primary">{title}</span>
        {body && <span className="block text-body text-text-secondary">{body}</span>}
        {meta && <span className="block text-caption text-text-secondary">{meta}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-1 flex size-6 shrink-0 items-center justify-center border-2 border-border-default bg-background-primary transition-colors",
          type === "radio" ? "rounded-full" : "rounded-[6px]",
          "group-has-[:checked]:border-accent-primary group-has-[:checked]:bg-accent-primary",
        )}
      >
        <span className={cn("bg-text-on-accent opacity-0 group-has-[:checked]:opacity-100", type === "radio" ? "size-2.5 rounded-full" : "size-2.5 rounded-[2px]")} />
      </span>
    </label>
  );
}

interface ChoiceRowProps {
  name: string;
  value: string;
  title: ReactNode;
  hint?: ReactNode;
  defaultChecked?: boolean;
}

/** A compact radio row, used for the baseline questions. */
export function ChoiceRow({ name, value, title, hint, defaultChecked }: ChoiceRowProps) {
  return (
    <label
      className={cn(
        "group flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-small bg-surface-elevated px-3 py-2.5 text-body text-text-primary transition-colors",
        "hover:bg-surface-interactive has-[:checked]:bg-success-container has-[:checked]:text-accent-primary",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-primary",
      )}
    >
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        {hint && <span className="block text-caption text-text-secondary">{hint}</span>}
      </span>
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border-default group-has-[:checked]:border-accent-primary">
        <span className="size-2 rounded-full bg-accent-primary opacity-0 group-has-[:checked]:opacity-100" />
      </span>
    </label>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-body font-semibold text-state-error">
      {message}
    </p>
  );
}
