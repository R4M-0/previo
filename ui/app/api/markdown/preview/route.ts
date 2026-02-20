import { NextResponse } from "next/server";
import { generateMarkdownPreview } from "@/lib/server/markdown";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { markdown?: string };
    const markdown = typeof body.markdown === "string" ? body.markdown : "";

    if (!markdown.trim()) {
      return NextResponse.json(
        { error: "Missing required field: markdown" },
        { status: 400 }
      );
    }

    const preview = await generateMarkdownPreview(markdown);
    return NextResponse.json({
      mimeType: preview.mime_type,
      html: preview.html,
      fullHtml: preview.full_html,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate Markdown preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

