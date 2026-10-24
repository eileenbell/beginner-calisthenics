import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.02em] transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent-primary text-text-on-accent shadow-[0_0_24px_-4px_rgba(204,241,60,0.35)] hover:bg-[#d6f55c]",
  secondary: "bg-surface-elevated text-text-primary border border-border-default hover:border-accent-primary",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary",
  danger: "bg-state-error-surface text-state-error border border-state-error/40 hover:border-state-error",
};

const sizes: Record<Size, string> = {
  lg: "min-h-14 rounded-full px-6 text-card",
  md: "min-h-12 rounded-card px-4 text-button normal-case font-sans font-semibold tracking-normal",
  sm: "min-h-11 rounded-small px-3 text-caption normal-case font-sans font-semibold tracking-normal",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "lg", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "lg", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

interface LinkButtonProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function LinkButton({ variant = "primary", size = "lg", className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
