"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";

type Mode = "login" | "register";

export function AuthForm({ mode, initialError }: { mode: Mode; initialError?: string }) {
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
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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

      router.replace("/dashboard");
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

    router.replace("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    if (pending) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError("Could not start Google sign-in. Please try again.");
      setPending(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold text-zinc-900">Check your email</h2>
        <p className="text-sm text-zinc-600">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to
          finish creating your account.
        </p>
        <Link href="/login" className="text-sm font-medium text-zinc-900 underline">
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
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-900 focus:outline-none disabled:opacity-60"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-900 focus:outline-none disabled:opacity-60"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        or
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={pending}
        className="w-full rounded-md border border-zinc-300 px-4 py-2 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue with Google
      </button>

      <p className="text-center text-sm text-zinc-600">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-zinc-900 underline">
              Create one
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
