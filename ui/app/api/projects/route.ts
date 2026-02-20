import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";
import { ProjectTemplate } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const projects = await listProjects(user.id, query);
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
      template?: ProjectTemplate;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const format = body.format;
    const template = body.template ?? "blank";

    if (!title) {
      return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
    }
    if (format !== "markdown" && format !== "latex") {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
    if (!["blank", "thesis", "report", "api_docs", "article"].includes(template)) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }

    const project = await createProject(user.id, title, format, template);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
