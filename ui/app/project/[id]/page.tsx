// app/project/[id]/page.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  UserPlus,
  ChevronDown,
  Hash,
  FileCode2,
  Eye,
  EyeOff,
  ArrowLeft,
  Check,
  RotateCcw,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CollaboratorModal } from "@/components/ui/CollaboratorModal";
import { MOCK_PROJECTS, MOCK_COLLABORATORS } from "@/lib/mock";
import { renderMarkdown, renderLatex } from "@/lib/renderer";
import { Project, Collaborator } from "@/types";

// ── Resizable divider ─────────────────────────────────────────────────────────
function ResizeDivider({ onResize }: { onResize: (delta: number) => void }) {
  const isDragging = useRef(false);
  const lastX = useRef(0);

  function handleMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onResize(delta);
    }
    function handleMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-1.5 flex-shrink-0 bg-stone-200 hover:bg-amber-400 cursor-col-resize transition-colors relative group"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-stone-400 group-hover:bg-amber-500 transition-colors" />
    </div>
  );
}

// ── Collaborator Avatars ──────────────────────────────────────────────────────
function CollaboratorAvatars({ collaborators }: { collaborators: Collaborator[] }) {
  return (
    <div className="flex items-center -space-x-1.5">
      {collaborators.slice(0, 4).map((c) => (
        <div
          key={c.id}
          className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
          style={{ backgroundColor: c.color }}
          title={c.name}
        >
          {c.name[0]}
        </div>
      ))}
      {collaborators.length > 4 && (
        <div className="w-6 h-6 rounded-full border-2 border-white bg-stone-300 flex items-center justify-center text-[9px] font-bold text-stone-600">
          +{collaborators.length - 4}
        </div>
      )}
    </div>
  );
}

// ── Main Editor Page ──────────────────────────────────────────────────────────
export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const project = MOCK_PROJECTS.find((p) => p.id === projectId) ?? MOCK_PROJECTS[0];

  const [content, setContent] = useState(project.content ?? "");
  const [format, setFormat] = useState<"markdown" | "latex">(project.format);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(project.collaborators);
  const [editorWidthPct, setEditorWidthPct] = useState(50);
  const [isConnected, setIsConnected] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);

  const renderPreview = useCallback(
    (src: string, fmt: "markdown" | "latex") => {
      const rendered = fmt === "markdown" ? renderMarkdown(src) : renderLatex(src);
      setPreviewHtml(rendered);
    },
    []
  );

  useEffect(() => {
    renderPreview(content, format);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSaved(false);
    debounceRef.current = setTimeout(() => {
      renderPreview(content, format);
    }, format === "markdown" ? 150 : 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [content, format, renderPreview]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSave() {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setIsSaved(true);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content]);

  function handleResize(delta: number) {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const deltaPct = (delta / containerWidth) * 100;
    setEditorWidthPct((prev) => Math.max(20, Math.min(80, prev + deltaPct)));
  }

  function handleAddCollaborator(email: string) {
    const newCollab: Collaborator = {
      id: `c_${Date.now()}`,
      name: email.split("@")[0],
      email,
      color: ["#E07B54", "#5B8DD9", "#56B870", "#9B6DD4", "#E0A854"][
        Math.floor(Math.random() * 5)
      ],
    };
    setCollaborators((prev) => [...prev, newCollab]);
  }

  function handleFormatSwitch(newFormat: "markdown" | "latex") {
    setFormat(newFormat);
    setShowFormatMenu(false);
    renderPreview(content, newFormat);
  }

  const editorPlaceholder =
    format === "markdown"
      ? "# Start writing in Markdown\n\nUse **bold**, _italic_, `code`, and more.\n\n## Headings\n\nCreate structure with `#`, `##`, `###`...\n\n```js\nconsole.log('Hello, Previo!');\n```"
      : "\\documentclass{article}\n\\begin{document}\n\n\\section{Introduction}\nStart writing your LaTeX document here...\n\n\\end{document}";

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* ── Top bar ── */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-stone-200 bg-white flex-shrink-0">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center justify-center w-7 h-7 rounded-md text-stone-400 hover:text-ink hover:bg-stone-100 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-semibold text-ink truncate max-w-[300px]">
              {project.title}
            </h1>

            {/* Format selector */}
            <div className="relative flex-shrink-0" ref={formatMenuRef}>
              <button
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 transition-all"
              >
                {format === "markdown" ? (
                  <Hash className="w-3 h-3 text-stone-500" />
                ) : (
                  <FileCode2 className="w-3 h-3 text-amber-500" />
                )}
                <span className="text-xs font-mono font-semibold text-stone-500">
                  {format === "markdown" ? "MD" : "LaTeX"}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {showFormatMenu && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden py-1 min-w-[130px]">
                  <button
                    onClick={() => handleFormatSwitch("markdown")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      format === "markdown"
                        ? "bg-stone-50 text-ink font-semibold"
                        : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    Markdown
                    {format === "markdown" && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                  <button
                    onClick={() => handleFormatSwitch("latex")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      format === "latex"
                        ? "bg-stone-50 text-ink font-semibold"
                        : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <FileCode2 className="w-3 h-3" />
                    LaTeX
                    {format === "latex" && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                </div>
              )}
            </div>

            {/* Save status */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isSaving ? (
                <span className="flex items-center gap-1 text-xs text-stone-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                </span>
              ) : isSaved ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="w-3 h-3" /> Saved
                </span>
              ) : (
                <span className="text-xs text-stone-400 italic">Unsaved changes</span>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 mr-1" title={isConnected ? "Connected" : "Disconnected"}>
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>

            {collaborators.length > 0 && (
              <CollaboratorAvatars collaborators={collaborators} />
            )}

            <button
              onClick={() => setShowCollabModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all text-xs font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </button>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                showPreview
                  ? "border-stone-200 text-stone-600 hover:bg-stone-50"
                  : "border-stone-300 bg-stone-100 text-ink"
              }`}
            >
              {showPreview ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{showPreview ? "Hide" : "Preview"}</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || isSaved}
              className="flex items-center gap-1.5 bg-ink text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        </header>

        {/* ── Editor / Preview panels ── */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden">
          {/* Editor panel */}
          <div
            className="flex flex-col overflow-hidden bg-stone-50 border-r border-stone-200"
            style={{ width: showPreview ? `${editorWidthPct}%` : "100%" }}
          >
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-stone-200 bg-white flex-shrink-0">
              <span className="text-xs text-stone-400 font-mono">
                {format === "markdown" ? "markdown" : "latex"} source
              </span>
              <button
                onClick={() => setContent("")}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={editorPlaceholder}
                className="editor-textarea"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>

            <div className="px-4 py-1.5 border-t border-stone-200 bg-white flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-stone-400 font-mono">
                {content.split("\n").length} lines · {content.length} chars
              </span>
              <span className="text-xs text-stone-400 font-mono">UTF-8</span>
            </div>
          </div>

          {/* Resize divider */}
          {showPreview && <ResizeDivider onResize={handleResize} />}

          {/* Preview panel */}
          {showPreview && (
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: `${100 - editorWidthPct}%` }}
            >
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-stone-200 bg-white flex-shrink-0">
                <span className="text-xs text-stone-400 font-mono">preview</span>
                {format === "latex" && (
                  <span className="text-[10px] font-mono text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    mock render
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-2xl mx-auto px-8 py-8">
                  {previewHtml ? (
                    <div
                      className="preview-content"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-stone-300">
                      <Eye className="w-8 h-8 mb-3" />
                      <p className="text-sm">Preview will appear here as you type</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCollabModal && (
        <CollaboratorModal
          collaborators={collaborators}
          onClose={() => setShowCollabModal(false)}
          onAdd={handleAddCollaborator}
        />
      )}
    </AppShell>
  );
}
