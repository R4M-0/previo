import { NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";
import { ensureProjectWorkspace } from "@/lib/server/workspace";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    const project = await getProject(user.id, id);
    await ensureProjectWorkspace(project.id);
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch project.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      format?: "markdown" | "latex";
      content?: string;
      comment?: string;
    };

    const project = await updateProject({
      userId: user.id,
      id,
      title: body.title,
      format: body.format,
      content: body.content,
      comment: body.comment,
    });
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    const result = await deleteProject(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 401
      : lower.includes("not found")
        ? 404
        : lower.includes("only the project owner")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
