import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary">
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {"We've sent you a confirmation link. Click it to activate your RollerDeck and start mapping your network."}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/profile/setup"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Set up your profile →
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
