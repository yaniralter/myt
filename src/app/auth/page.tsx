"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSignupSuccess(true);
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/seller-dashboard");
    router.refresh();
  }

  if (signupSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-accent/10 border border-accent/20 p-6 rounded-xl">
            <Sparkles className="w-8 h-8 text-accent mx-auto mb-3" />
            <h2 className="text-xl font-bold text-primary mb-2">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a confirmation link to{" "}
              <strong className="text-primary">{email}</strong>. Click it to
              activate your account.
            </p>
          </div>
          <button
            onClick={() => {
              setSignupSuccess(false);
              setMode("login");
            }}
            className="mt-4 text-sm text-accent hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold">
            <span className="text-accent">M</span>YT
          </Link>
          <p className="text-muted-foreground mt-2">
            {mode === "login"
              ? "Welcome back to MYT"
              : "Join MYT and start designing"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-surface-raised rounded-lg p-1 mb-6">
          <button
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "login"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "signup"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-primary mb-1.5"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-surface-raised border border-border rounded-lg text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-primary mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-surface-raised border border-border rounded-lg text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-primary mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 bg-surface-raised border border-border rounded-lg text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder={
                mode === "signup" ? "Min 6 characters" : "Your password"
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login"
              ? loading
                ? "Signing in..."
                : "Sign In"
              : loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
