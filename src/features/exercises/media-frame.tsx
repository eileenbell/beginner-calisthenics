import { ImageOff } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ExercisePhoto } from "./media";

interface MediaFrameProps {
  name: string;
  photo: ExercisePhoto | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  children?: ReactNode;
}

/** Photo or a clearly labelled placeholder. Safe to use in client components. */
export function MediaFrame({ name, photo, className, sizes = "(max-width: 768px) 100vw, 640px", priority, children }: MediaFrameProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-small bg-surface-elevated", className)}>
      {photo ? (
        <>
          <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#1f1f23] via-transparent to-transparent" />
          <span className="absolute right-2 top-2 rounded-[4px] bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-text-secondary">
            Placeholder photo
          </span>
        </>
      ) : (
        <div
          role="img"
          aria-label={`Placeholder: no demonstration media for ${name} yet`}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[radial-gradient(circle_at_30%_20%,rgba(204,241,60,0.10),transparent_55%),linear-gradient(135deg,#1f1f23,#141518)] p-4 text-center",
            children && "pb-12",
          )}
        >
          <ImageOff aria-hidden className="size-7 text-state-disabled" />
          <p className="font-display text-card font-semibold text-text-primary">{name}</p>
          <p className="text-caption text-text-secondary">Demonstration media placeholder</p>
        </div>
      )}
      {children}
    </div>
  );
}
