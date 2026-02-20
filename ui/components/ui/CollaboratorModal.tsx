// components/ui/CollaboratorModal.tsx

"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Check, Loader2 } from "lucide-react";
import { Collaborator } from "@/types";

interface CollaboratorModalProps {
  collaborators: Collaborator[];
  onClose: () => void;
  onAdd: (email: string) => void;
}

export function CollaboratorModal({ collaborators, onClose, onAdd }: CollaboratorModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    onAdd(email.trim());
    setIsLoading(false);
    setSuccess(true);
    setEmail("");
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up opacity-0" style={{ animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h2 className="font-display text-xl text-ink">Collaborators</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-ink hover:bg-stone-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current collaborators */}
          {collaborators.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Currently editing
              </p>
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 px-3 bg-stone-50 rounded-lg">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold font-mono"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{c.name}</p>
                      <p className="text-xs text-stone-400 truncate">{c.email}</p>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <span className="w-2 h-2 bg-green-400 rounded-full block" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite form */}
          <form onSubmit={handleInvite} className="space-y-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Invite by email
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="flex items-center gap-2 bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : success ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isLoading ? "Sending" : success ? "Sent!" : "Invite"}
              </button>
            </div>
          </form>

          <div className="pt-1">
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
