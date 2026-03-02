"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { WorkspaceFile } from "@/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type WorkspaceModalProps = {
  files: WorkspaceFile[];
  isLoading: boolean;
  isUploading: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
  projectId: string;
};

export function WorkspaceModal({
  files,
  isLoading,
  isUploading,
  onClose,
  onUpload,
  onDelete,
  projectId,
}: WorkspaceModalProps) {
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const filesLabel = useMemo(() => `${files.length} file${files.length === 1 ? "" : "s"}`, [files.length]);

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(file);
    event.target.value = "";
  }

  function fileUrl(path: string): string {
    return `/api/projects/${projectId}/workspace/file?path=${encodeURIComponent(path)}`;
  }

  async function copyReference(path: string) {
    const url = fileUrl(path);
    await navigator.clipboard.writeText(url);
    setMessage("File URL copied.");
    setTimeout(() => setMessage(null), 1400);
  }

  async function handleDelete(path: string) {
    const confirmDelete = window.confirm(`Delete "${path}" from this workspace?`);
    if (!confirmDelete) return;
    setDeletingPath(path);
    try {
      await onDelete(path);
    } finally {
      setDeletingPath(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[75vh] animate-slide-up opacity-0 overflow-hidden" style={{ animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-display text-xl text-ink">Project workspace</h2>
            <p className="text-xs text-stone-500 mt-1">{filesLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-ink hover:bg-stone-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-stone-100 flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer">
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Upload file
            <input
              type="file"
              className="hidden"
              onChange={handleUploadChange}
              disabled={isUploading}
            />
          </label>
          {message && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              {message}
            </span>
          )}
        </div>

        <div className="h-[calc(75vh-123px)] overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading workspace...
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-stone-400">No files yet. Upload images or documents for this project.</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="border border-stone-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{file.path}</p>
                    <p className="text-[11px] text-stone-500">
                      {formatBytes(file.size)} · {new Date(file.updatedAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => copyReference(file.path)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-stone-500 hover:text-ink hover:bg-stone-100 transition-colors"
                      title="Copy file URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={fileUrl(file.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-stone-500 hover:text-ink hover:bg-stone-100 transition-colors"
                      title="Open file"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => void handleDelete(file.path)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      disabled={deletingPath === file.path}
                      title="Delete file"
                    >
                      {deletingPath === file.path ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
