// app/signup/page.tsx

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2, Check, X } from "lucide-react";

function PasswordRule({
  met,
  label,
}: {
  met: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          met ? "bg-green-500" : "bg-stone-200"
        }`}
      >
        {met ? (
          <Check className="w-2.5 h-2.5 text-white" />
        ) : (
          <X className="w-2.5 h-2.5 text-stone-400" />
        )}
      </div>
      <span className={`text-xs transition-colors ${met ? "text-green-700" : "text-stone-400"}`}>
        {label}
      </span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    match: password === confirmPassword && confirmPassword.length > 0,
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!allRulesMet) {
      setError("Please ensure all password requirements are met.");
      return;
    }
    setIsLoading(true);
    // Mock signup — replace with real API call
    await new Promise((res) => setTimeout(res, 1000));
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-ink p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-stone-700 to-transparent" />

        <div className="relative z-10">
          <Link href="/login">
            <span className="font-display text-2xl text-white tracking-tight hover:text-amber-400 transition-colors">
              Previo
            </span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            {[
              { icon: "⚡", text: "Real-time collaboration" },
              { icon: "📄", text: "Markdown & LaTeX support" },
              { icon: "🔄", text: "Full version history" },
              { icon: "📤", text: "Export to PDF & HTML" },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-stone-300 text-sm font-sans">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-stone-600 text-xs font-mono">
          © 2025 Previo. All rights reserved.
        </div>
      </div>

      {/* Right signup panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="w-full max-w-[420px] animate-slide-up opacity-0"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="lg:hidden mb-8 text-center">
            <span className="font-display text-3xl text-ink">Previo</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl text-ink mb-2">
              Create your account
            </h1>
            <p className="text-stone-500 text-sm">
              Join thousands of writers and researchers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Omar Chiboub"
                autoComplete="name"
                required
                className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
              />
            </div>

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
                  autoComplete="new-password"
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password rules */}
              {password.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <PasswordRule met={rules.length} label="8+ characters" />
                  <PasswordRule met={rules.uppercase} label="One uppercase" />
                  <PasswordRule met={rules.number} label="One number" />
                  <PasswordRule met={rules.match} label="Passwords match" />
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className={`w-full bg-white border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword.length > 0 && !rules.match
                      ? "border-red-300 focus:ring-red-400/30 focus:border-red-400"
                      : "border-stone-200 focus:ring-amber-400/40 focus:border-amber-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-200 text-center">
            <p className="text-sm text-stone-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-ink font-semibold hover:text-amber-600 transition-colors underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
