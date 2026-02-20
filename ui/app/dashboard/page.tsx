// app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  Hash,
  Clock,
  ArrowUpRight,
  FileCode2,
  Search,
  BarChart3,
  Activity,
} from "lucide-react";
import { AppShell, useAppShellActions } from "@/components/layout/AppShell";
import { formatRelativeDate } from "@/lib/date";
import { Project, User } from "@/types";

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/project/${project.id}`)}
      className="group bg-white border border-stone-200 rounded-xl p-4 cursor-pointer hover:border-stone-300 hover:shadow-md transition-all duration-200 animate-slide-up opacity-0"
      style={{ animationFillMode: "forwards" }}
    >
      {/* Format badge + actions */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ${
            project.format === "latex"
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "bg-stone-100 text-stone-500 border border-stone-200"
          }`}
        >
          {project.format === "latex" ? (
            <FileCode2 className="w-3 h-3" />
          ) : (
            <Hash className="w-3 h-3" />
          )}
          {project.format === "latex" ? "LaTeX" : "Markdown"}
        </span>

        <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-ink leading-snug mb-3 line-clamp-2 group-hover:text-amber-700 transition-colors">
        {project.title}
      </h3>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-stone-400">
          <Clock className="w-3 h-3" />
          <span className="text-xs">{formatRelativeDate(project.updatedAt)}</span>
        </div>

        {project.collaborators.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {project.collaborators.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                >
                  {c.name[0]}
                </div>
              ))}
            </div>
            {project.collaborators.length > 3 && (
              <span className="text-[10px] text-stone-400">+{project.collaborators.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { openNewProject } = useAppShellActions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const meRes = await fetch("/api/me");
        const meData = await meRes.json();
        if (!meRes.ok) {
          throw new Error(meData.error || "Failed to load user.");
        }
        setUser(meData.user || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load user.");
      }
    }
    void loadUser();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setIsLoadingProjects(true);
      try {
        const projectsRes = await fetch(`/api/projects?q=${encodeURIComponent(search)}`);
        const projectsData = await projectsRes.json();
        if (!projectsRes.ok) {
          throw new Error(projectsData.error || "Failed to load projects.");
        }
        setProjects(projectsData.projects || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load projects.");
      } finally {
        setIsLoadingProjects(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const firstName = user?.name?.split(" ")[0] || "Writer";
  const latestProject = projects[0];

  const markdownCount = projects.filter((p) => p.format === "markdown").length;
  const latexCount = projects.filter((p) => p.format === "latex").length;
  const totalCollabs = new Set(
    projects.flatMap((p) => p.collaborators.map((c) => c.id))
  ).size;
  const totalWords = projects.reduce((acc, p) => {
    const text = p.content || "";
    return acc + (text.trim() ? text.trim().split(/\s+/).length : 0);
  }, 0);
  const averageWords =
    projects.length > 0 ? Math.round(totalWords / projects.length).toLocaleString() : "0";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-10 animate-fade-in opacity-0" style={{ animationFillMode: "forwards" }}>
            <p className="text-sm text-stone-400 font-mono mb-1">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="font-display text-4xl text-ink">
              Welcome back, {firstName}
            </h1>
            <p className="text-stone-500 mt-2 text-sm">
              Pick up where you left off, or start something new.
            </p>
          </div>

          {error && (
            <p className="mb-6 text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <Link href={latestProject ? `/project/${latestProject.id}` : "/dashboard"}>
              <div className="group bg-ink text-white rounded-xl p-5 cursor-pointer hover:bg-stone-800 transition-all animate-slide-up opacity-0 animation-delay-100" style={{ animationFillMode: "forwards" }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-white" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <p className="font-semibold text-sm mb-0.5">Continue editing</p>
                <p className="text-xs text-stone-400 line-clamp-1">
                  {latestProject ? latestProject.title : "No projects yet"}
                </p>
              </div>
            </Link>

            <button
              onClick={openNewProject}
              className="group bg-white border border-stone-200 rounded-xl p-5 text-left cursor-pointer hover:border-stone-300 hover:shadow-md transition-all animate-slide-up opacity-0 animation-delay-200"
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-ink" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="font-semibold text-sm text-ink mb-0.5">New project</p>
              <p className="text-xs text-stone-400">Start from scratch</p>
            </button>
          </div>

          {/* Detailed stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: "Total projects", value: projects.length, icon: "📁" },
              { label: "Collaborators", value: totalCollabs, icon: "👥" },
              { label: "LaTeX / Markdown", value: `${latexCount} / ${markdownCount}`, icon: "📄" },
            ].map(({ label, value, icon }, i) => (
              <div
                key={i}
                className="bg-white border border-stone-200 rounded-xl px-4 py-3 animate-slide-up opacity-0"
                style={{ animationFillMode: "forwards", animationDelay: `${i * 80 + 300}ms` }}
              >
                <p className="text-xs text-stone-400 mb-1">{icon} {label}</p>
                <p className="font-display text-2xl text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-white border border-stone-200 rounded-xl px-4 py-4">
              <div className="flex items-center gap-2 text-stone-500 text-xs mb-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Writing volume
              </div>
              <p className="font-display text-2xl text-ink">{totalWords.toLocaleString()} words</p>
              <p className="text-xs text-stone-400 mt-1">Across all your projects</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl px-4 py-4">
              <div className="flex items-center gap-2 text-stone-500 text-xs mb-2">
                <Activity className="w-3.5 h-3.5" />
                Average size
              </div>
              <p className="font-display text-2xl text-ink">{averageWords} words</p>
              <p className="text-xs text-stone-400 mt-1">Per project</p>
            </div>
          </div>

          {/* Recent projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-ink">Recent projects</h2>
              <span className="text-xs text-stone-400 font-mono">{projects.length} projects</span>
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your work by title, content, or format..."
                className="w-full bg-white border border-stone-200 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
              />
            </div>

            {isLoadingProjects && (
              <p className="text-xs text-stone-400 mb-4">Searching...</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              {projects.map((project, i) => (
                <div
                  key={project.id}
                  style={{ animationDelay: `${i * 80 + 400}ms` }}
                >
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>

            {!isLoadingProjects && projects.length === 0 && (
              <div className="text-center text-sm text-stone-400 py-10">
                No projects found for this search.
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
