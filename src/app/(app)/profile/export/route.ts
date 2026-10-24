import { getSessionUser, getSupabase } from "@/server/auth";

// Downloads everything stored about the signed-in user as JSON
// (export_my_data only ever reads the caller's own rows).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in to export your data.", { status: 401 });
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return new Response("We couldn't export your data. Please try again.", { status: 500 });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), email: user.email, ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="form-data-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
