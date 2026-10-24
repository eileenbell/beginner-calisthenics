import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge needs the custom theme scales from globals.css, or it would
// read text-card (a font size) as a colour and drop it next to text-white.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "title", "section", "card", "body-lg", "body", "caption", "label", "button", "metric"],
      font: ["display", "sans"],
      radius: ["small", "card", "large"],
      breakpoint: ["tablet", "desktop"],
    },
  },
});

/** Joins class names; when two utilities conflict, the later one wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
