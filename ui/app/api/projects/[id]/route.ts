import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    const project = await getProject(user.id, id);
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
    };

    const project = await updateProject({
      userId: user.id,
      id,
      title: body.title,
      format: body.format,
      content: body.content,
    });
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
