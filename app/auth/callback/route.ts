import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getSafeNext(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith("/")) return "/"
  return nextParam
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = getSafeNext(requestUrl.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", requestUrl.origin))
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL("/auth/login?error=callback_exchange_failed", requestUrl.origin))
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login?error=no_user_session", requestUrl.origin))
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle()

    const missingName = !profile?.name || !profile.name.trim()
    const targetPath = missingName ? "/profile/setup" : next

    return NextResponse.redirect(new URL(targetPath, requestUrl.origin))
  } catch {
    return NextResponse.redirect(new URL("/auth/login?error=callback_failed", requestUrl.origin))
  }
}
