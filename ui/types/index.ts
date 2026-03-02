// types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export type ProjectTemplate =
  | "blank"
  | "thesis"
  | "report"
  | "api_docs"
  | "article";

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  format: "markdown" | "latex";
  updatedAt: string;
  collaborators: Collaborator[];
  content?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  snapshotTitle: string;
  snapshotFormat: "markdown" | "latex";
  snapshotContent: string;
  changeSummary: string;
  diffText: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectTitle: string;
  projectFormat: "markdown" | "latex";
  inviteEmail: string;
  status: "pending";
  createdAt: string;
  inviter: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WorkspaceFile {
  path: string;
  name: string;
  size: number;
  updatedAt: string;
}
