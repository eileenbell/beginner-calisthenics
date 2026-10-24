"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * A modal built on the native <dialog> element, which handles focus trapping,
 * Escape to close and the inert background for us.
 */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-large border border-border-default bg-surface-elevated p-0 text-text-primary backdrop:bg-black/70",
        className,
      )}
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 id="dialog-title" className="font-display text-section font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {description && <div className="mb-4 text-body text-text-secondary">{description}</div>}
          {children}
        </div>
      )}
    </dialog>
  );
}
