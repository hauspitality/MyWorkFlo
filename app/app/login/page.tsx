"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "signing-in">("idle");
  const [showEmailFallback, setShowEmailFallback] = useState(false);

  // Handles links that carry the session in the URL fragment (e.g. an
  // admin-generated link, or any implicit-flow edge case) rather than the
  // normal ?code= exchange /auth/callback handles. Fragments never reach
  // the server, so this has to run client-side.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) return;

    setStatus("signing-in");
    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setStatus("error");
        return;
      }
      router.replace(next);
    });
  }, [next, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  async function handleGoogleSignIn() {
    setStatus("signing-in");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // On success the browser navigates away to Google; only errors land here.
    if (error) setStatus("error");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <svg viewBox="0 0 100 100" className="h-8 w-8" aria-hidden="true">
            <circle cx="50" cy="50" r="37" fill="none" stroke="#96692c" strokeWidth="7" />
            <line x1="50" y1="10" x2="50" y2="22" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <line x1="24" y1="22" x2="31" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <line x1="76" y1="22" x2="69" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <line x1="50" y1="50" x2="67" y2="28" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
            <circle cx="50" cy="50" r="7" fill="#96692c" />
            <polyline
              points="18,64 35,42 50,60 65,42 82,64"
              fill="none"
              stroke="#96692c"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg font-semibold">MyWorkFlo</span>
        </div>

        {status === "signing-in" ? (
          <div className="rounded-2xl border border-line bg-card p-6">
            <h1 className="mb-2 text-xl font-semibold">Signing you in…</h1>
            <p className="text-ink-soft">One moment.</p>
          </div>
        ) : status === "sent" ? (
          <div className="rounded-2xl border border-line bg-card p-6">
            <h1 className="mb-2 text-xl font-semibold">Check your email</h1>
            <p className="text-ink-soft">
              We sent a login link to <strong className="text-ink">{email}</strong>. Tap it on
              this phone to sign in — no password needed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
              <p className="text-sm text-muted">One tap with Google — no password to remember.</p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-card font-semibold text-ink transition-colors hover:border-line-strong hover:bg-paper"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.81Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.07.72-2.45 1.15-4.08 1.15-3.13 0-5.79-2.11-6.74-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.26 14.28A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.38-2.28V6.63H1.28a12 12 0 0 0 0 10.74l3.98-3.09Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.76c1.76 0 3.34.6 4.59 1.79l3.42-3.42A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.28 6.63l3.98 3.09C6.21 6.87 8.87 4.76 12 4.76Z"
                />
              </svg>
              Continue with Google
            </button>

            {status === "error" && (
              <p className="text-sm text-gauge-red">Something went wrong. Try again in a moment.</p>
            )}

            {!showEmailFallback ? (
              <button onClick={() => setShowEmailFallback(true)} className="block w-full text-center text-sm text-muted hover:text-ink">
                Or get a sign-in link by email
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 border-t border-line pt-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-soft">Email</span>
                  <input
                    type="email"
                    required
                    autoFocus
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-base outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
                  />
                </label>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep disabled:opacity-60"
                >
                  {status === "sending" ? "Sending…" : "Send me a login link"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
