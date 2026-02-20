import { NextResponse } from "next/server";
import { renderMarkdownHtml } from "@/lib/server/markdown";

function makeSafeFilename(input?: string): string {
  const base = (input || "document").trim().toLowerCase();
  const safe = base.replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safe || "document"}.html`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { markdown?: string; filename?: string };
    const markdown = typeof body.markdown === "string" ? body.markdown : "";
    const filename = makeSafeFilename(body.filename);

    if (!markdown.trim()) {
      return NextResponse.json(
        { error: "Missing required field: markdown" },
        { status: 400 }
      );
    }

    const htmlBuffer = await renderMarkdownHtml(markdown, body.filename || "Document");
    return new NextResponse(new Uint8Array(htmlBuffer), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to render Markdown HTML.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

