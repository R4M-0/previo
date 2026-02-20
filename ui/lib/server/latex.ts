import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type LatexPreviewPayload = {
  mime_type: "application/pdf";
  pdf_base64: string;
  pdf_data_url: string;
};

function resolveLatexScript(scriptName: "latex_preview.py" | "latex_renderer.py"): string {
  const candidates = [
    path.resolve(process.cwd(), "../backend/latex", scriptName),
    path.resolve(process.cwd(), "backend/latex", scriptName),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`LaTeX script not found: ${scriptName}`);
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

export async function generateLatexPreview(latex: string): Promise<LatexPreviewPayload> {
  const scriptPath = resolveLatexScript("latex_preview.py");
  const { stdout } = await runPythonScript(scriptPath, ["--stdin"], latex);

  let parsed: LatexPreviewPayload;
  try {
    parsed = JSON.parse(stdout) as LatexPreviewPayload;
  } catch {
    throw new Error("Preview script returned invalid JSON.");
  }

  if (!parsed.pdf_data_url || !parsed.pdf_base64) {
    throw new Error("Preview script response is missing PDF data.");
  }

  return parsed;
}

export async function renderLatexPdf(latex: string): Promise<Buffer> {
  const scriptPath = resolveLatexScript("latex_renderer.py");
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "previo-render-"));
  const outputPath = path.join(tempDir, "document.pdf");

  try {
    await runPythonScript(
      scriptPath,
      ["--stdin", "--output-file", outputPath],
      latex
    );
    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

