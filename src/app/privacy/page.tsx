import type { Metadata } from "next";
import { FlowShell } from "@/components/shell/flow-shell";

export const metadata: Metadata = { title: "Your data" };

export default function PrivacyPage() {
  return (
    <FlowShell section="Your data" backHref="/">
      <article className="space-y-5 pt-2 text-body-lg text-text-secondary [&_h2]:pt-2 [&_h2]:font-display [&_h2]:text-section [&_h2]:font-bold [&_h2]:text-text-primary">
        <h1 className="font-display text-display font-bold text-text-primary">How FORM stores your data</h1>
        <p>
          This page describes what the app stores and how you control it. It isn&apos;t a legal privacy policy; one is needed before a
          public launch.
        </p>
        <h2>What we store</h2>
        <p>
          Your name and email, your onboarding answers and training settings, your programme schedule, every set you log, how each
          exercise felt, and the progressions, milestones and achievements that follow from them.
        </p>
        <h2>What we don&apos;t do</h2>
        <p>
          FORM doesn&apos;t use your camera, location or health data, doesn&apos;t sell or share your data, and has no advertising or social
          features.
        </p>
        <h2>Where it lives</h2>
        <p>
          In a Supabase Postgres database. Row level security means each account can only read and change its own records.
        </p>
        <h2>Your controls</h2>
        <p>
          From Profile you can download everything as a JSON file, or delete your account. Deleting removes your account and all of
          your training data straight away and can&apos;t be undone.
        </p>
      </article>
    </FlowShell>
  );
}
