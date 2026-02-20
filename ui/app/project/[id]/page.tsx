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
  Download,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CollaboratorModal } from "@/components/ui/CollaboratorModal";
import { Collaborator, Project } from "@/types";

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

  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"markdown" | "latex">("markdown");
  const [previewHtml, setPreviewHtml] = useState("");
  const [latexPreviewUrl, setLatexPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingFile, setIsDownloadingFile] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [editorWidthPct, setEditorWidthPct] = useState(50);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const previewRequestIdRef = useRef(0);
  const skipNextDirtyRef = useRef(false);

  const renderPreview = useCallback(
    async (src: string, fmt: "markdown" | "latex") => {
      if (fmt === "markdown") {
        const requestId = ++previewRequestIdRef.current;
        setPreviewHtml("");
        setPreviewError(null);
        setLatexPreviewUrl("");
        setIsPreviewLoading(true);

        try {
          const response = await fetch("/api/markdown/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markdown: src }),
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to generate preview.");
          }

          if (requestId !== previewRequestIdRef.current) {
            return;
          }

          setPreviewHtml(data.html || "");
        } catch (error) {
          if (requestId !== previewRequestIdRef.current) {
            return;
          }
          setPreviewHtml("");
          setPreviewError(
            error instanceof Error ? error.message : "Failed to generate preview."
          );
        } finally {
          if (requestId === previewRequestIdRef.current) {
            setIsPreviewLoading(false);
          }
        }
        return;
      }

      const requestId = ++previewRequestIdRef.current;
      setPreviewHtml("");
      setPreviewError(null);
      setIsPreviewLoading(true);

      try {
        const response = await fetch("/api/latex/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latex: src }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to generate preview.");
        }

        if (requestId !== previewRequestIdRef.current) {
          return;
        }

        setLatexPreviewUrl(data.pdfDataUrl || "");
      } catch (error) {
        if (requestId !== previewRequestIdRef.current) {
          return;
        }
        setLatexPreviewUrl("");
        setPreviewError(
          error instanceof Error ? error.message : "Failed to generate preview."
        );
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setIsPreviewLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    async function loadProject() {
      setIsLoadingProject(true);
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load project.");
        }

        const loadedProject = data.project as Project;
        setProject(loadedProject);
        setContent(loadedProject.content ?? "");
        setFormat(loadedProject.format);
        setCollaborators(loadedProject.collaborators || []);
        setIsSaved(true);
        skipNextDirtyRef.current = true;
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Failed to load project.");
      } finally {
        setIsLoadingProject(false);
      }
    }

    void loadProject();
  }, [projectId]);

  useEffect(() => {
    if (!isLoadingProject) {
      void renderPreview(content, format);
    }
  }, [isLoadingProject, renderPreview]);

  useEffect(() => {
    if (isLoadingProject) return;
    if (skipNextDirtyRef.current) {
      skipNextDirtyRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSaved(false);
    debounceRef.current = setTimeout(() => {
      void renderPreview(content, format);
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
    if (!project) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save project.");
      }
      setProject(data.project as Project);
      setIsSaved(true);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Failed to save project.");
    } finally {
      setIsSaving(false);
    }
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

  async function handleAddCollaborator(email: string) {
    if (!project) return;
    try {
      const response = await fetch(`/api/projects/${project.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add collaborator.");
      }

      const collaborator = data.collaborator as Collaborator;
      setCollaborators((prev) => {
        if (prev.some((c) => c.id === collaborator.id)) return prev;
        return [...prev, collaborator];
      });
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Failed to add collaborator."
      );
    }
  }

  function handleFormatSwitch(newFormat: "markdown" | "latex") {
    setFormat(newFormat);
    setShowFormatMenu(false);
    void renderPreview(content, newFormat);
  }

  async function handleDownload() {
    if (!content.trim()) return;

    setIsDownloadingFile(true);
    try {
      const endpoint = format === "latex" ? "/api/latex/render" : "/api/markdown/render";
      const payload =
        format === "latex"
          ? { latex: content, filename: project?.title || "document" }
          : { markdown: content, filename: project?.title || "document" };
      const extension = format === "latex" ? "pdf" : "html";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to render document.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${project?.title || "document"}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Failed to render document."
      );
    } finally {
      setIsDownloadingFile(false);
    }
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
              {project?.title || "Project"}
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
                disabled={isSaving || isSaved || isLoadingProject}
                className="flex items-center gap-1.5 bg-ink text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-all"
              >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloadingFile || !content.trim() || isLoadingProject}
              className="flex items-center gap-1.5 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-50 disabled:opacity-50 transition-all"
            >
              {isDownloadingFile ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {format === "latex" ? "PDF" : "HTML"}
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
                disabled={isLoadingProject}
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
                <span
                  className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${
                    format === "latex"
                      ? "text-amber-600 bg-amber-50 border-amber-200"
                      : "text-stone-600 bg-stone-100 border-stone-200"
                  }`}
                >
                  backend render
                </span>
              </div>

              <div className="flex-1 overflow-auto bg-white">
                <div className={format === "markdown" ? "max-w-2xl mx-auto px-8 py-8" : "h-full"}>
                  {isPreviewLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-40 text-stone-400">
                      <Loader2 className="w-7 h-7 animate-spin mb-2" />
                      <p className="text-sm">
                        {format === "latex"
                          ? "Compiling LaTeX preview…"
                          : "Rendering Markdown preview…"}
                      </p>
                    </div>
                  ) : format === "markdown" && previewHtml ? (
                    <div
                      className="preview-content"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : previewError ? (
                    <div className="max-w-2xl mx-auto px-8 py-8 text-red-600">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Preview failed
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{previewError}</p>
                    </div>
                  ) : format === "latex" && latexPreviewUrl ? (
                    <iframe
                      src={latexPreviewUrl}
                      title="LaTeX preview"
                      className="w-full h-full border-0"
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
