// app/login/page.tsx

"use client";

import { useEffect, useState, FormEvent } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2, Github } from "lucide-react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const oauthError = searchParams.get("error");

  useEffect(() => {
    if (oauthError) {
      setError(oauthError);
    }
  }, [oauthError]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid credentials.");
      }
      const nextPath = searchParams.get("next");
      router.push(nextPath || "/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-ink p-12 relative overflow-hidden">
        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative geometric lines */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-stone-700 to-transparent" />
        <div className="absolute bottom-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent" />

        <div className="relative z-10">
          <span className="font-display text-2xl text-white tracking-tight">
            Previo
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="font-display text-3xl text-white leading-snug italic">
            "Write together,{" "}
            <span className="text-amber-400">compile instantly."</span>
          </blockquote>
          <p className="text-stone-400 text-sm leading-relaxed max-w-xs font-sans">
            Previo brings collaborative editing to Markdown and LaTeX with
            real-time preview, version history, and zero setup.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <span className="text-stone-500 text-xs ml-1">
            Built by the Previo team
          </span>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px] animate-slide-up opacity-0" style={{ animationFillMode: "forwards" }}>
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="font-display text-3xl text-ink">Previo</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl text-ink mb-2">
              Welcome back
            </h1>
            <p className="text-stone-500 text-sm">
              Sign in to continue to your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-stone-800 active:bg-stone-900 disabled:opacity-60 transition-all mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-stone-200 flex-1" />
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">or continue with</span>
            <div className="h-px bg-stone-200 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`/api/auth/oauth/google?next=${encodeURIComponent(searchParams.get("next") || "/dashboard")}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <span className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#DB4437] border border-stone-200">
                G
              </span>
              Google
            </a>
            <a
              href={`/api/auth/oauth/github?next=${encodeURIComponent(searchParams.get("next") || "/dashboard")}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-stone-200 text-center">
            <p className="text-sm text-stone-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-ink font-semibold hover:text-amber-600 transition-colors underline underline-offset-2"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center text-stone-500 text-sm">
          Loading...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
