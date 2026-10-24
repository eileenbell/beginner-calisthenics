import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackendMissing } from "@/components/backend-missing";
import { playerData } from "@/features/workout/load";
import { WorkoutPlayer } from "@/features/workout/player";
import { isBackendConfigured } from "@/lib/env";
import { getSupabase, requireTrainingAccount } from "@/server/auth";
import type { FeedbackRow, SessionRow, SetLogRow } from "@/server/rows";

export const metadata: Metadata = { title: "Active workout" };

export default async function WorkoutPage({ params }: PageProps<"/workout/[sessionId]">) {
  if (!isBackendConfigured()) return <BackendMissing />;
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const account = await requireTrainingAccount(`/workout/${sessionId}`);
  const supabase = await getSupabase();
  const { data } = await supabase.from("workout_sessions").select("*").eq("id", sessionId).eq("user_id", account.user.id).maybeSingle();
  const session = data as SessionRow | null;
  if (!session) notFound();
  if (session.status === "completed") redirect(`/workout/${sessionId}/summary`);
  if (session.status === "abandoned") redirect("/today");

  const [logs, feedback] = await Promise.all([
    supabase.from("set_logs").select("*").eq("session_id", sessionId),
    supabase.from("exercise_feedback").select("*").eq("session_id", sessionId),
  ]);
  if (logs.error || feedback.error) throw new Error("Could not load this workout.");
  const data_ = playerData(session, logs.data as SetLogRow[], feedback.data as FeedbackRow[], account.preferences.equipment);

  return (
    <WorkoutPlayer
      sessionId={session.id}
      title={session.title}
      objective={session.plan.objective}
      notices={session.plan.notices}
      items={data_.items}
      exercises={data_.exercises}
      swaps={data_.swaps}
      initialLogs={data_.logs}
      initialFeedback={data_.feedback}
    />
  );
}
