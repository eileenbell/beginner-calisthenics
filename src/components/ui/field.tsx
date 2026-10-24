import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps extends ComponentProps<"input"> {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const inputClasses =
  "min-h-14 w-full rounded-card border border-border-default bg-[#121418] px-4 text-body-lg text-text-primary placeholder:text-state-disabled outline-none transition-colors focus:border-accent-primary aria-[invalid=true]:border-state-error";

export function Field({ label, name, hint, error, icon, trailing, id, className, ...props }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={inputId} className="eyebrow block text-text-primary">
        {label}
      </label>
      <div className="relative">
        {icon && <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">{icon}</span>}
        <input
          id={inputId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={cn(inputClasses, icon && "pl-12", trailing && "pr-14")}
          {...props}
        />
        {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      {hint && (
        <p id={hintId} className="text-caption text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption font-semibold text-state-error">
          {error}
        </p>
      )}
    </div>
  );
}
