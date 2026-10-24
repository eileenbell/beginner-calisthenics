import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-path";
import { createSupabaseServerClient } from "@/server/supabase";

// Email links in the "token hash" format (see docs/DEPLOYMENT_GUIDE.md for the
// templates). Works even when the link is opened in a different browser.
const TYPES: EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"), type === "recovery" ? "/reset-password" : "/today");

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL(`/auth/error?reason=link`, request.url));
}
