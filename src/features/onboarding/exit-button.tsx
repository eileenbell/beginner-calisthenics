import { signOut } from "@/features/auth/actions";

/** Answers are saved after every step, so leaving part-way loses nothing. */
export function SaveAndExit() {
  return (
    <form action={signOut}>
      <button type="submit" className="flex min-h-11 items-center px-2 text-caption font-semibold uppercase tracking-wide text-text-secondary hover:text-text-primary">
        Save &amp; exit
      </button>
    </form>
  );
}
