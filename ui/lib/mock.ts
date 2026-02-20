// lib/mock.ts

import { Project, User, Collaborator } from "@/types";

export const MOCK_USER: User = {
  id: "u1",
  name: "Omar Chiboub",
  email: "omar@previo.app",
};

export const MOCK_COLLABORATORS: Collaborator[] = [
  { id: "c1", name: "Ghassen Naouar", email: "ghassen@previo.app", color: "#E07B54" },
  { id: "c2", name: "Louay Dardouri", email: "louay@previo.app", color: "#5B8DD9" },
  { id: "c3", name: "Amin Khalsi", email: "amin@previo.app", color: "#56B870" },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    title: "Thesis — Chapter 3: Methodology",
    format: "latex",
    updatedAt: "2025-02-18T14:30:00Z",
    collaborators: [MOCK_COLLABORATORS[0], MOCK_COLLABORATORS[1]],
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\title{Methodology}
\\author{Omar Chiboub}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
This chapter presents the methodological framework adopted throughout this research.
The approach combines \\textbf{qualitative} and \\textbf{quantitative} methods
to ensure comprehensive analysis.

\\subsection{Data Collection}
Primary data was collected via structured interviews with $n = 42$ participants
across three geographic regions. Each session lasted approximately $\\mu = 45$
minutes, with a standard deviation of $\\sigma = 12$ minutes.

\\begin{equation}
  \\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i
\\end{equation}

\\subsection{Analysis Framework}
The thematic analysis followed Braun \\& Clarke's (2006) six-phase model,
ensuring rigor and transparency at each stage.

\\end{document}`,
  },
  {
    id: "p2",
    title: "API Documentation — Previo REST API",
    format: "markdown",
    updatedAt: "2025-02-17T09:15:00Z",
    collaborators: [MOCK_COLLABORATORS[2]],
    content: `# Previo REST API Documentation

## Overview

The Previo API provides programmatic access to documents, users, and collaboration sessions.
All endpoints require authentication via **Bearer tokens**.

---

## Authentication

### \`POST /api/v1/auth/login\`

Authenticate a user and obtain a JWT token.

**Request body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "your_password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u_abc123",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
\`\`\`

---

## Documents

### \`GET /api/v1/documents\`

Returns a paginated list of documents accessible by the authenticated user.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`page\`    | int  | 1       | Page number |
| \`limit\`   | int  | 20      | Items per page |
| \`format\`  | string | —    | Filter by \`markdown\` or \`latex\` |

---

## Errors

All error responses follow this structure:

\`\`\`json
{
  "statusCode": 404,
  "message": "Document not found",
  "error": "Not Found"
}
\`\`\``,
  },
  {
    id: "p3",
    title: "Research Proposal — NLP Systems",
    format: "latex",
    updatedAt: "2025-02-14T16:45:00Z",
    collaborators: [],
    content: `\\documentclass[12pt,a4paper]{article}
\\usepackage{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}

\\geometry{top=2.5cm,bottom=2.5cm,left=3cm,right=2.5cm}

\\title{Research Proposal\\\\\\large Natural Language Processing in Collaborative Editing Systems}
\\author{Ahmed Loubiri}
\\date{February 2025}

\\begin{document}
\\maketitle

\\begin{abstract}
This proposal outlines a research direction exploring the application of
large language models (LLMs) in real-time collaborative document editing.
We hypothesize that contextual suggestions can significantly reduce editing
conflicts in multi-author environments.
\\end{abstract}

\\section{Background}
The proliferation of collaborative writing tools has exposed fundamental
tensions between concurrent editing and document coherence. Operational
Transformation (OT) and CRDTs address consistency, but semantic conflicts
remain an open problem.

\\end{document}`,
  },
  {
    id: "p4",
    title: "Meeting Notes — Sprint Review Q1",
    format: "markdown",
    updatedAt: "2025-02-10T11:00:00Z",
    collaborators: [MOCK_COLLABORATORS[0], MOCK_COLLABORATORS[1], MOCK_COLLABORATORS[2]],
    content: `# Sprint Review — Q1 2025

**Date:** February 10, 2025
**Attendees:** Full team (6 members)

---

## ✅ Completed this sprint

- [x] User authentication flow (login / signup)
- [x] Dashboard layout with sidebar
- [x] Editor page — split panel prototype
- [x] Mock data integration
- [x] WebSocket connection scaffolding

## 🔄 In progress

- [ ] CRDT implementation for conflict resolution
- [ ] LaTeX compilation service (Python)
- [ ] Real-time cursor sharing

## 🚧 Blockers

1. **LaTeX sandbox** — Docker image size exceeds 4GB, needs trimming
2. **WebSocket scaling** — Redis adapter not configured for multi-instance

---

## Action items

| Owner | Task | Due |
|-------|------|-----|
| Ghassen | Slim Docker image | Feb 14 |
| Louay | Redis adapter config | Feb 12 |
| Amin | CRDT research spike | Feb 17 |`,
  },
];

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// lib/utils.ts
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
