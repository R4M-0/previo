import { NextResponse } from "next/server";
import { renderLatexPdf } from "@/lib/server/latex";

function makeSafeFilename(input?: string): string {
  const base = (input || "document").trim().toLowerCase();
  const safe = base.replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safe || "document"}.pdf`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { latex?: string; filename?: string };
    const latex = typeof body.latex === "string" ? body.latex : "";
    const filename = makeSafeFilename(body.filename);

    if (!latex.trim()) {
      return NextResponse.json(
        { error: "Missing required field: latex" },
        { status: 400 }
      );
    }

    const pdfBuffer = await renderLatexPdf(latex);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to render LaTeX PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
