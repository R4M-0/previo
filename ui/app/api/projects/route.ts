import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const projects = await listProjects(user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch projects.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const body = (await request.json()) as {
      title?: string;
      format?: "markdown" | "latex";
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const format = body.format;

    if (!title) {
      return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
    }
    if (format !== "markdown" && format !== "latex") {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const project = await createProject(user.id, title, format);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
