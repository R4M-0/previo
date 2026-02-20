// components/ui/NewProjectModal.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { X, Hash, FileCode2, ArrowRight } from "lucide-react";
import { ProjectTemplate } from "@/types";

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (
    title: string,
    format: "markdown" | "latex",
    template: ProjectTemplate
  ) => void;
}

export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"markdown" | "latex">("markdown");
  const [template, setTemplate] = useState<ProjectTemplate>("report");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim(), format, template);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up opacity-0" style={{ animationFillMode: "forwards" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h2 className="font-display text-xl text-ink">New project</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-ink hover:bg-stone-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Project title
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Thesis — Introduction"
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
            />
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Markdown option */}
              <button
                type="button"
                onClick={() => setFormat("markdown")}
                className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  format === "markdown"
                    ? "border-ink bg-ink text-white"
                    : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                }`}
              >
                <Hash className="w-5 h-5" />
                <div>
                  <p className="text-sm font-semibold">Markdown</p>
                  <p className={`text-xs mt-0.5 ${format === "markdown" ? "text-stone-300" : "text-stone-400"}`}>
                    Simple, readable
                  </p>
                </div>
              </button>

              {/* LaTeX option */}
              <button
                type="button"
                onClick={() => setFormat("latex")}
                className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  format === "latex"
                    ? "border-ink bg-ink text-white"
                    : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                }`}
              >
                <FileCode2 className="w-5 h-5" />
                <div>
                  <p className="text-sm font-semibold">LaTeX</p>
                  <p className={`text-xs mt-0.5 ${format === "latex" ? "text-stone-300" : "text-stone-400"}`}>
                    Precise typesetting
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Template selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "thesis", label: "Thesis", hint: "Research chapters" },
                { id: "report", label: "Report", hint: "Executive structure" },
                { id: "api_docs", label: "API Docs", hint: "Endpoints layout" },
                { id: "article", label: "Article", hint: "Abstract + sections" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTemplate(item.id as ProjectTemplate)}
                  className={`rounded-lg border px-3 py-2 text-left transition-all ${
                    template === item.id
                      ? "border-ink bg-ink text-white"
                      : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      template === item.id ? "text-stone-300" : "text-stone-400"
                    }`}
                  >
                    {item.hint}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Create
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
