import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-path";
import { createSupabaseServerClient } from "@/server/supabase";

// PKCE links: Supabase Auth sends the user back here with ?code=, which is
// exchanged for a session using the verifier cookie set when the email was requested.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/auth/error?reason=link", request.url));
}
