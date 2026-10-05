"use client";

import { btnPrimary, btnSecondary, inputCls } from "@/components/eventjini/classes";
import { FormMessage } from "@/components/eventjini/form-feedback";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";

type Mode = "login" | "register";

export function AuthForm({ mode, initialError, next }: { mode: Mode; initialError?: string; next?: string }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    const supabase = createClient();

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
      });

      if (error) {
        setError(error.message);
        setPending(false);
        return;
      }

      if (data.user && data.user.identities?.length === 0) {
        setError("An account with this email already exists. Try signing in.");
        setPending(false);
        return;
      }

      if (!data.session) {
        setAwaitingConfirmation(true);
        setPending(false);
        return;
      }

      router.replace(next ?? "/dashboard");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.code === "invalid_credentials"
          ? "Invalid email or password."
          : "Could not sign in. Please try again."
      );
      setPending(false);
      return;
    }

    router.replace(next ?? "/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    if (pending) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
    });

    if (error) {
      setError("Could not start Google sign-in. Please try again.");
      setPending(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-heading text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to
          finish creating your account.
        </p>
        <Link href="/login" className="text-sm font-medium text-foreground underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  const submitLabel = isRegister
    ? pending
      ? "Creating account..."
      : "Create account"
    : pending
      ? "Signing in..."
      : "Sign in";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <input
            id="auth-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            className={cn(inputCls, "h-10")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <input
            id="auth-password"
            type="password"
            name="password"
            required
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            className={cn(inputCls, "h-10")}
          />
        </div>

        <FormMessage>{error}</FormMessage>

        <button
          type="submit"
          disabled={pending}
          className={cn(btnPrimary, "h-10 w-full")}
        >
          {submitLabel}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs tracking-wide text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={pending}
        className={cn(btnSecondary, "h-10 w-full")}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
        Continue with Google
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-foreground underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-foreground underline">
              Create one
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
