"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Field } from "./field";

type Props = Omit<ComponentProps<typeof Field>, "type" | "icon" | "trailing">;

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      icon={<KeyRound className="size-5" />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex size-11 items-center justify-center rounded-small text-text-secondary hover:text-text-primary"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      }
    />
  );
}
