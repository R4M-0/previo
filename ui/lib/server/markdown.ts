import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type MarkdownPreviewPayload = {
  mime_type: "text/html";
  html: string;
  full_html: string;
};

function resolveMarkdownScript(
  scriptName: "markdown_preview.py" | "markdown_renderer.py"
): string {
  const candidates = [
    path.resolve(process.cwd(), "../backend/markdown", scriptName),
    path.resolve(process.cwd(), "backend/markdown", scriptName),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Markdown script not found: ${scriptName}`);
}

function runPythonScript(
  scriptPath: string,
  args: string[],
  stdinText: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [scriptPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }
      const message = (stdout || stderr || `Python exited with code ${code}`).trim();
      reject(new Error(message));
    });

    child.stdin.write(stdinText);
    child.stdin.end();
  });
}

export async function generateMarkdownPreview(markdown: string): Promise<MarkdownPreviewPayload> {
  const scriptPath = resolveMarkdownScript("markdown_preview.py");
  const { stdout } = await runPythonScript(scriptPath, ["--stdin"], markdown);

  let parsed: MarkdownPreviewPayload;
  try {
    parsed = JSON.parse(stdout) as MarkdownPreviewPayload;
  } catch {
    throw new Error("Preview script returned invalid JSON.");
  }

  if (!parsed.html) {
    throw new Error("Preview script response is missing HTML.");
  }

  return parsed;
}

export async function renderMarkdownHtml(
  markdown: string,
  title = "Document"
): Promise<Buffer> {
  const scriptPath = resolveMarkdownScript("markdown_renderer.py");
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "previo-md-render-"));
  const outputPath = path.join(tempDir, "document.html");

  try {
    await runPythonScript(
      scriptPath,
      ["--stdin", "--title", title, "--output-file", outputPath],
      markdown
    );
    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

