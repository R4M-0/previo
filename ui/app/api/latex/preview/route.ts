import { NextResponse } from "next/server";
import { generateLatexPreview } from "@/lib/server/latex";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { latex?: string };
    const latex = typeof body.latex === "string" ? body.latex : "";

    if (!latex.trim()) {
      return NextResponse.json(
        { error: "Missing required field: latex" },
        { status: 400 }
      );
    }

    const preview = await generateLatexPreview(latex);
    return NextResponse.json({
      mimeType: preview.mime_type,
      pdfBase64: preview.pdf_base64,
      pdfDataUrl: preview.pdf_data_url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate LaTeX preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

