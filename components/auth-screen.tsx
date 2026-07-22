"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, LogIn, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { BrandMark, Field, inputClass } from "@/components/ui-primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

const modeCopy: Record<AuthMode, { eyebrow: string; title: string; body: string }> = {
  "sign-in": {
    eyebrow: "A private, attendee-owned event copilot",
    title: "Networking, without the pressure.",
    body: "Understand the room, share only the links you choose, and leave with one useful next step."
  },
  "sign-up": {
    eyebrow: "Make this yours",
    title: "Create your workspace.",
    body: "One account keeps your event prep and follow-through with you across devices."
  },
  "forgot-password": {
    eyebrow: "Account recovery",
    title: "Reset your password.",
    body: "We will send one secure reset link to the email on your account."
  },
  "reset-password": {
    eyebrow: "Account recovery",
    title: "Choose a new password.",
    body: "This secure link is ready to update your NameTag password."
  }
};

export function AuthScreen({
  onTryDemo,
  initialMode = "sign-in",
  onPasswordUpdated,
  onContinueAsGuest
}: {
  onTryDemo: () => void;
  initialMode?: AuthMode;
  onPasswordUpdated?: () => void;
  onContinueAsGuest?: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const copy = modeCopy[mode];
  // Always surface the familiar account path. Supabase returns a clear error
  // when a provider is not enabled, rather than making the option disappear.
  const showGoogle = mode === "sign-in" || mode === "sign-up";

  useEffect(() => {
    setMode(initialMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }, [initialMode]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  function beginRequest() {
    setIsWorking(true);
    setError("");
    setMessage("");
  }

  function validatePassword() {
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return false;
    }
    if ((mode === "sign-up" || mode === "reset-password") && password !== confirmPassword) {
      setError("Those passwords do not match.");
      return false;
    }
    return true;
  }

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Google sign-in is not configured for this deployment yet. Use email or explore the sample event for now.");
      return;
    }
    beginRequest();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (signInError) {
      setError(readableAuthError(signInError.message));
      setIsWorking(false);
    }
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signInWithCredentials(email, password);
  }

  async function signInWithCredentials(nextEmail: string, nextPassword: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !nextEmail.trim() || !nextPassword) return false;
    beginRequest();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: nextEmail.trim(),
      password: nextPassword
    });
    setIsWorking(false);
    if (signInError) {
      setError(readableAuthError(signInError.message));
      return false;
    }
    return true;
  }

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !email.trim() || !validatePassword()) return;
    beginRequest();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin }
    });
    setIsWorking(false);
    if (signUpError) {
      setError(readableAuthError(signUpError.message));
      return;
    }
    if (data.session) {
      setMessage("Account created. Opening your workspace now.");
      return;
    }

    // With email confirmation enabled, Supabase deliberately returns a
    // non-specific response for existing addresses as well as new accounts.
    // Keep that protection, then give the person a clear next action.
    setMode("sign-in");
    setMessage("Check your inbox to confirm this address, then sign in. If you have used this email before, sign in instead.");
  }

  async function sendMagicLink() {
    const normalizedEmail = email.trim();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !normalizedEmail) return;
    beginRequest();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: window.location.origin }
    });
    setIsWorking(false);
    if (signInError) {
      setError(readableAuthError(signInError.message));
      return;
    }
    setMessage("Check your email for a secure sign-in link.");
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !normalizedEmail) return;
    beginRequest();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin
    });
    setIsWorking(false);
    if (resetError) {
      setError(readableAuthError(resetError.message));
      return;
    }
    setMessage("If that email has a NameTag account, a secure reset link is on its way.");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !validatePassword()) return;
    beginRequest();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsWorking(false);
    if (updateError) {
      setError(readableAuthError(updateError.message));
      return;
    }
    setMessage("Password updated. Opening your workspace.");
    window.setTimeout(() => onPasswordUpdated?.(), 450);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_470px] lg:bg-[#f7f8fa]">
      <aside className="hidden border-r border-ink bg-ink px-10 py-10 text-white lg:flex lg:flex-col">
        <BrandMark inverse />
        <div className="my-auto max-w-[560px]">
          <div className="app-kicker text-coral">Private. Practical. Event-first.</div>
          <h1 className="mt-3 text-[42px] font-bold leading-[48px]">Walk into an unfamiliar room with a plan.</h1>
          <p className="mt-4 max-w-[460px] text-base font-medium leading-7 text-white/68">
            A private event copilot for people who find networking high-pressure: understand the room, share one focused QR card, and follow through while the conversation is still fresh.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
          {[
            ["Before", "Research"],
            ["During", "Connect"],
            ["After", "Follow up"]
          ].map(([moment, detail]) => (
            <div key={moment} className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
              <div className="app-kicker text-mint">{moment}</div>
              <div className="mt-1 text-xs font-bold text-white/85">{detail}</div>
            </div>
          ))}
        </div>
      </aside>
      <section className="phone-frame auth-shell mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-none flex-col overflow-x-hidden overflow-y-auto bg-white px-4 py-[calc(env(safe-area-inset-top)+1.5rem)] lg:min-h-screen lg:max-w-none lg:px-10 lg:py-10">
        <div className="w-full min-w-0 space-y-4 pb-8 pt-2 lg:mx-auto lg:my-auto lg:max-w-[360px]">
          <div className="lg:hidden"><BrandMark /></div>

          <section className="overflow-hidden rounded-lg border border-ink bg-ink text-white shadow-sm">
            <div className="h-2 bg-coral" />
            <div className="p-4">
              <div className="app-kicker text-coral">{copy.eyebrow}</div>
              <h1 className="mt-3 text-3xl font-black leading-8 tracking-tight">{copy.title}</h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/70">{copy.body}</p>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-sm">
            {mode === "sign-in" && (
              <>
                {onContinueAsGuest && (
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-ink hover:bg-wash"
                  >
                    <ArrowLeft className="size-4" />
                    Continue on this device
                  </button>
                )}
                <button
                  type="button"
                  onClick={onTryDemo}
                  disabled={isWorking}
                  className="flex min-h-[76px] w-full items-center justify-between gap-3 rounded-lg border border-[#e9ad88] bg-[#fff0e5] px-3.5 py-3 text-left transition hover:border-[#c86b48] hover:bg-[#ffe2ce] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="min-w-0">
                    <span className="block font-badge-mono text-[10px] font-black uppercase tracking-normal text-[#a6472b]">No account needed</span>
                    <span className="mt-1 block text-base font-black text-[#5f2319]">Run the 60-second demo</span>
                    <span className="mt-0.5 block text-xs font-semibold leading-5 text-[#8e4128]">A fictional Founder Meetup is ready to explore.</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-[#a6472b]" />
                </button>
                <div className="flex items-center gap-3 py-1 text-[10px] font-black uppercase tracking-normal text-slate-soft">
                  <span className="h-px flex-1 bg-line" />
                  sign in to save your own events
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}
            {showGoogle && (
              <>
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  disabled={isWorking}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isWorking ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 py-1 text-[10px] font-black uppercase tracking-normal text-slate-soft">
                  <span className="h-px flex-1 bg-line" />
                  or use email
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            {mode === "sign-in" && (
              <form onSubmit={signInWithPassword} className="space-y-3">
                <Field label="Email">
                  <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(eventChange) => setEmail(eventChange.target.value)} placeholder="you@example.com" required />
                </Field>
                <Field label="Password">
                  <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(eventChange) => setPassword(eventChange.target.value)} placeholder="Your password" required />
                </Field>
                <button type="submit" disabled={isWorking} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-4 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-55">
                  {isWorking ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  Sign in
                </button>
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <button type="button" onClick={() => changeMode("forgot-password")} className="text-cobalt hover:text-ink">Forgot password?</button>
                  <button type="button" onClick={() => void sendMagicLink()} disabled={isWorking || !email.trim()} className="text-slate-600 hover:text-ink disabled:opacity-45">Use a sign-in link</button>
                </div>
                <button type="button" onClick={() => changeMode("sign-up")} className="w-full text-center text-xs font-bold text-slate-600 hover:text-ink">
                  New to nametags? <span className="text-cobalt">Create an account</span>
                </button>
              </form>
            )}

            {mode === "sign-up" && (
              <form onSubmit={signUp} className="space-y-3">
                <Field label="Email">
                  <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(eventChange) => setEmail(eventChange.target.value)} placeholder="you@example.com" required />
                </Field>
                <Field label="Password">
                  <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(eventChange) => setPassword(eventChange.target.value)} placeholder="At least 8 characters" minLength={8} required />
                </Field>
                <Field label="Confirm password">
                  <input className={inputClass} type="password" autoComplete="new-password" value={confirmPassword} onChange={(eventChange) => setConfirmPassword(eventChange.target.value)} placeholder="Repeat your password" minLength={8} required />
                </Field>
                <button type="submit" disabled={isWorking} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-4 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-55">
                  {isWorking ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  Create account
                </button>
                <button type="button" onClick={() => changeMode("sign-in")} className="w-full text-center text-xs font-bold text-slate-600 hover:text-ink">
                  Already have an account? <span className="text-cobalt">Sign in</span>
                </button>
              </form>
            )}

            {mode === "forgot-password" && (
              <form onSubmit={requestPasswordReset} className="space-y-3">
                <Field label="Email">
                  <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(eventChange) => setEmail(eventChange.target.value)} placeholder="you@example.com" required />
                </Field>
                <button type="submit" disabled={isWorking} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-4 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-55">
                  {isWorking ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  Send reset link
                </button>
                <button type="button" onClick={() => changeMode("sign-in")} className="inline-flex w-full items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-ink">
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
                </button>
              </form>
            )}

            {mode === "reset-password" && (
              <form onSubmit={updatePassword} className="space-y-3">
                <Field label="New password">
                  <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(eventChange) => setPassword(eventChange.target.value)} placeholder="At least 8 characters" minLength={8} required />
                </Field>
                <Field label="Confirm new password">
                  <input className={inputClass} type="password" autoComplete="new-password" value={confirmPassword} onChange={(eventChange) => setConfirmPassword(eventChange.target.value)} placeholder="Repeat your new password" minLength={8} required />
                </Field>
                <button type="submit" disabled={isWorking} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-4 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-55">
                  {isWorking ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  Save new password
                </button>
              </form>
            )}

            {message && <p role="status" className="rounded-lg border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-bold leading-5 text-teal-800">{message}</p>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">{error}</p>}
          </section>

          <div className="flex items-start gap-2 px-1 text-xs font-semibold leading-5 text-slate-soft">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" />
            <p>Your private workspace is never shown on a QR card.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function readableAuthError(message: string) {
  if (/unsupported provider|provider is not enabled/i.test(message)) {
    return "Google sign-in is not enabled in this NameTag Supabase project yet. Use email and password, a sign-in link, or run the no-account demo for now.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "That email or password does not match an account.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Check your inbox and confirm your email before signing in.";
  }
  if (/rate limit/i.test(message)) {
    return "Please wait a moment before trying again.";
  }
  return message;
}

export function AccountLoadingScreen() {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_470px] lg:bg-[#f7f8fa]">
      <aside className="hidden border-r border-ink bg-ink px-10 py-10 lg:block">
        <BrandMark inverse />
      </aside>
      <section className="phone-frame auth-shell mx-auto grid min-h-[100dvh] w-full max-w-none place-items-center bg-white px-4 lg:min-h-screen lg:max-w-none">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-lg bg-ink text-mint">
            <Loader2 className="size-5 animate-spin" />
          </div>
          <div className="mt-4 text-sm font-black text-ink">Opening your workspace</div>
        </div>
      </section>
    </main>
  );
}
