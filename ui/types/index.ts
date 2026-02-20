// types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
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
