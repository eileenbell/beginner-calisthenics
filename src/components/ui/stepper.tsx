"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

interface StepperProps {
  name?: string;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  hint?: string;
  size?: "md" | "lg";
}

/** Number input with large minus and plus buttons (the rep adjuster from the player design). */
export function Stepper({ name, label, unit, min = 0, max = 999, value, defaultValue = 0, onChange, hint, size = "lg" }: StepperProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const id = useId();
  const set = (next: number) => {
    const clamped = Math.max(min, Math.min(max, Number.isFinite(next) ? Math.round(next) : min));
    if (value === undefined) setInternal(clamped);
    onChange?.(clamped);
  };
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-card bg-surface-elevated p-2">
        <button
          type="button"
          onClick={() => set(current - 1)}
          disabled={current <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className={cn("flex shrink-0 items-center justify-center rounded-small bg-surface-interactive text-text-primary disabled:opacity-40", size === "lg" ? "size-14" : "size-12")}
        >
          <Minus className="size-6" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
          <input
            id={id}
            name={name}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={current}
            onChange={(e) => set(e.currentTarget.valueAsNumber)}
            className={cn(
              "w-[3.5ch] bg-transparent text-center font-display font-bold tabular-nums text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              size === "lg" ? "text-metric" : "text-title",
            )}
          />
          <span className="text-card text-text-secondary">{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => set(current + 1)}
          disabled={current >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className={cn("flex shrink-0 items-center justify-center rounded-small bg-surface-interactive text-text-primary disabled:opacity-40", size === "lg" ? "size-14" : "size-12")}
        >
          <Plus className="size-6" aria-hidden />
        </button>
      </div>
      {hint && <p className="text-center text-caption text-text-secondary">{hint}</p>}
    </div>
  );
}
