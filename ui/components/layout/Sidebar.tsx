// components/layout/Sidebar.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  LogOut,
  User as UserIcon,
  LayoutGrid,
  Clock,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/date";
import { Project, User as AppUser } from "@/types";

interface SidebarProps {
  onNewProject?: () => void;
}

function ProjectItem({ project, isCollapsed }: { project: Project; isCollapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === `/project/${project.id}`;

  return (
    <Link href={`/project/${project.id}`}>
      <div
        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all cursor-pointer ${
          isActive
            ? "bg-stone-200 text-ink"
            : "text-stone-500 hover:bg-stone-100 hover:text-ink"
        }`}
        title={isCollapsed ? project.title : undefined}
      >
        <div className="flex-shrink-0">
          {project.format === "latex" ? (
            <span className="font-mono text-xs font-bold text-stone-400 group-hover:text-amber-500 transition-colors">
              Σ
            </span>
          ) : (
            <Hash className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-500 transition-colors" />
          )}
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-snug">
              {project.title}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {formatRelativeDate(project.updatedAt)}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export function Sidebar({ onNewProject }: SidebarProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, meRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/me"),
        ]);
        const projectsData = await projectsRes.json();
        const meData = await meRes.json();
        if (projectsRes.ok) setProjects(projectsData.projects || []);
        if (meRes.ok) setUser(meData.user || null);
      } catch {
        // Keep sidebar functional even if API requests fail.
      }
    }
    void loadData();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (user?.name || "User")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <aside
      className={`relative flex flex-col bg-stone-50 border-r border-stone-200 transition-all duration-300 ease-in-out flex-shrink-0 ${
        isCollapsed ? "w-14" : "w-60"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-stone-50 hover:shadow-md transition-all"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-stone-400" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-stone-400" />
        )}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-2 px-3.5 h-14 border-b border-stone-200 flex-shrink-0 ${isCollapsed ? "justify-center" : ""}`}>
        <span className="font-display text-xl text-ink">
          {isCollapsed ? "P" : "Previo"}
        </span>
      </div>

      {/* New project button */}
      <div className={`px-2.5 pt-3 pb-2 flex-shrink-0 ${isCollapsed ? "flex justify-center" : ""}`}>
        <button
          onClick={onNewProject}
          className={`flex items-center gap-2 bg-ink text-white rounded-lg transition-all hover:bg-stone-800 active:scale-95 ${
            isCollapsed ? "w-9 h-9 justify-center" : "w-full px-3 py-2 text-sm font-medium"
          }`}
          title={isCollapsed ? "New project" : undefined}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>New project</span>}
        </button>
      </div>

      {/* Navigation links */}
      {!isCollapsed && (
        <div className="px-2.5 py-1 flex-shrink-0">
          <Link href="/dashboard">
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-stone-500 hover:bg-stone-100 hover:text-ink transition-all">
              <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">Dashboard</span>
            </div>
          </Link>
        </div>
      )}

      {/* Divider + section label */}
      <div className={`px-2.5 py-2 flex-shrink-0 ${isCollapsed ? "flex justify-center" : ""}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2.5 py-1">
            <Clock className="w-3 h-3 text-stone-400" />
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">
              Recent
            </span>
          </div>
        ) : (
          <div className="w-5 h-px bg-stone-200" />
        )}
      </div>

      {/* Project list */}
      <nav className="flex-1 overflow-y-auto px-2.5 space-y-0.5 pb-2">
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-stone-200 p-2.5 flex-shrink-0" ref={profileRef}>
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-stone-100 transition-all ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-ink flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white font-mono">{initials}</span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold text-ink truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-stone-400 truncate">{user?.email || "user@previo.app"}</p>
              </div>
            )}
          </button>

          {/* Profile menu */}
          {profileOpen && (
            <div
              className={`absolute z-50 bottom-full mb-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden py-1 min-w-[160px] animate-slide-up opacity-0`}
              style={{ animationFillMode: "forwards", animationDuration: "0.2s", left: isCollapsed ? "100%" : "0", marginLeft: isCollapsed ? "8px" : "0", bottom: isCollapsed ? "0" : "100%" }}
            >
              <button
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-ink transition-colors"
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/profile");
                }}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Profile
              </button>
              <div className="h-px bg-stone-100 my-1" />
              <button
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                onClick={handleSignOut}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
