"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Project, User } from "@/types";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meRes, projectsRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/projects"),
        ]);
        const meData = await meRes.json();
        const projectsData = await projectsRes.json();

        if (!meRes.ok) {
          throw new Error(meData.error || "Failed to load profile.");
        }

        const nextUser = meData.user as User;
        setUser(nextUser);
        setName(nextUser.name);
        setEmail(nextUser.email);

        if (projectsRes.ok) {
          setProjects(projectsData.projects || []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const stats = useMemo(() => {
    const total = projects.length;
    const markdown = projects.filter((p) => p.format === "markdown").length;
    const latex = projects.filter((p) => p.format === "latex").length;
    const collaborators = new Set(
      projects.flatMap((p) => p.collaborators.map((c) => c.id))
    ).size;
    const words = projects.reduce((acc, p) => {
      const text = p.content || "";
      return acc + (text.trim() ? text.trim().split(/\s+/).length : 0);
    }, 0);
    return { total, markdown, latex, collaborators, words };
  }, [projects]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setUser(data.user as User);
      setName((data.user as User).name);
      setEmail((data.user as User).email);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Profile updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">
          <div>
            <h1 className="font-display text-4xl text-ink">Profile</h1>
            <p className="text-stone-500 text-sm mt-2">
              Manage your account information and security settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {[
              { label: "Projects", value: stats.total },
              { label: "Markdown", value: stats.markdown },
              { label: "LaTeX", value: stats.latex },
              { label: "Collaborators", value: stats.collaborators },
              { label: "Total words", value: stats.words.toLocaleString() },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                <p className="text-xs text-stone-400">{item.label}</p>
                <p className="font-display text-2xl text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-stone-500" />
              <h2 className="font-display text-xl text-ink">Account settings</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading profile...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                      Full name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                    />
                  </div>
                </div>

                <div className="h-px bg-stone-100" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                      Current password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Required only to change password"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave empty to keep current password"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-md px-3 py-2">
                    {message}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving || !user}
                    className="flex items-center gap-2 bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save changes
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </AppShell>
  );
}

