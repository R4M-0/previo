#!/usr/bin/env python3
"""
Compile LaTeX source into a PDF.

Usage examples:
  python latex_renderer.py --input-file sample.tex --output-file out.pdf
  cat sample.tex | python latex_renderer.py --stdin --output-file out.pdf
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


class LatexRenderError(RuntimeError):
    """Raised when LaTeX compilation fails."""


def sanitize_latex_source(latex_source: str) -> str:
    """
    Normalize common placeholder float options copied from templates/docs.
    """
    replacements = [
        (r"\\begin\{figure\}\[\s*placement specifier\s*\]", r"\\begin{figure}[htbp]"),
        (r"\\begin\{table\}\[\s*placement specifier\s*\]", r"\\begin{table}[htbp]"),
        (r"\\begin\{figure\}\[\s*position\s*\]", r"\\begin{figure}[htbp]"),
        (r"\\begin\{table\}\[\s*position\s*\]", r"\\begin{table}[htbp]"),
        (r"\\includegraphics\[\s*options\s*\]\{", r"\\includegraphics{"),
    ]
    output = latex_source
    for pattern, replacement in replacements:
        output = re.sub(pattern, replacement, output, flags=re.IGNORECASE)
    return output


def workspace_root_path() -> Path:
    configured = os.getenv("PREVIO_WORKSPACES_DIR", "").strip()
    if configured:
        return Path(configured).resolve()
    return (Path.cwd() / ".workspaces").resolve()


def resolve_workspace_asset_path(raw: str) -> Path | None:
    parsed = urlparse(raw)
    path_value = parsed.path or raw
    match = re.match(r"^/api/projects/([^/]+)/workspace/file$", path_value)
    if not match:
        return None

    project_id = match.group(1)
    query = parse_qs(parsed.query)
    relative = query.get("path", [None])[0]
    if not relative:
        return None

    project_root = (workspace_root_path() / project_id).resolve()
    candidate = (project_root / unquote(relative)).resolve()
    project_prefix = str(project_root) + os.sep
    if str(candidate) != str(project_root) and not str(candidate).startswith(project_prefix):
        return None
    if not candidate.is_file():
        return None
    return candidate


def materialize_workspace_assets(latex_source: str, temp_dir: Path) -> str:
    include_re = re.compile(r"(\\includegraphics(?:\[[^\]]*\])?\{)([^{}]+)(\})")
    assets_dir = temp_dir / "workspace-assets"
    copied_count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal copied_count
        raw_path = match.group(2).strip()
        asset = resolve_workspace_asset_path(raw_path)
        if asset is None:
            return match.group(0)
        copied_count += 1
        assets_dir.mkdir(parents=True, exist_ok=True)
        ext = asset.suffix or ".bin"
        dest_name = f"asset_{copied_count}{ext.lower()}"
        dest = assets_dir / dest_name
        shutil.copy2(asset, dest)
        return f"{match.group(1)}workspace-assets/{dest_name}{match.group(3)}"

    return include_re.sub(repl, latex_source)


def read_text_with_fallback(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise LatexRenderError(
        f"Could not decode '{path}' with supported encodings (utf-8, cp1252, latin-1)."
    )


def render_latex_to_pdf(
    latex_source: str,
    output_file: Path,
    *,
    compiler: str = "pdflatex",
    timeout: int = 30,
) -> Path:
    """
    Compile a LaTeX document into a PDF.

    Args:
      latex_source: Full LaTeX source.
      output_file: Destination PDF path.
      compiler: LaTeX compiler command.
      timeout: Timeout for each compile pass in seconds.
    """
    if not latex_source.strip():
        raise LatexRenderError("LaTeX source is empty.")

    if shutil.which(compiler) is None:
        raise LatexRenderError(
            f"Compiler '{compiler}' not found in PATH. Install a TeX distribution first."
        )

    output_file = output_file.resolve()
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="previo-latex-") as tmp_dir:
        tmp_path = Path(tmp_dir)
        tex_path = tmp_path / "document.tex"
        prepared = sanitize_latex_source(latex_source)
        prepared = materialize_workspace_assets(prepared, tmp_path)
        tex_path.write_text(prepared, encoding="utf-8")

        cmd = [
            compiler,
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            str(tex_path.name),
        ]

        # Two passes help stabilize references/TOC when present.
        for _ in range(2):
            result = subprocess.run(
                cmd,
                cwd=tmp_path,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
                check=False,
            )
            if result.returncode != 0:
                log_excerpt = "\n".join(
                    line for line in (result.stdout + "\n" + result.stderr).splitlines()[-40:]
                )
                raise LatexRenderError(
                    "LaTeX compilation failed.\n"
                    f"Compiler: {compiler}\n"
                    f"Exit code: {result.returncode}\n"
                    f"Log tail:\n{log_excerpt}"
                )

        pdf_path = tmp_path / "document.pdf"
        if not pdf_path.exists():
            raise LatexRenderError("Compilation finished but no PDF was produced.")

        output_file.write_bytes(pdf_path.read_bytes())

    return output_file


def _read_latex_input(args: argparse.Namespace) -> str:
    if args.stdin:
        return input_stream_read()
    if args.input_file:
        return read_text_with_fallback(Path(args.input_file))
    raise LatexRenderError("Provide either --stdin or --input-file.")


def input_stream_read() -> str:
    import sys

    return sys.stdin.read()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render LaTeX into a PDF file.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--stdin", action="store_true", help="Read LaTeX source from stdin.")
    source.add_argument("--input-file", type=Path, help="Path to a .tex file.")
    parser.add_argument(
        "--output-file",
        type=Path,
        required=True,
        help="Destination PDF path (for downloadable output).",
    )
    parser.add_argument(
        "--compiler",
        default="pdflatex",
        help="LaTeX compiler command (default: pdflatex).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Per-pass compile timeout in seconds (default: 30).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        source = _read_latex_input(args)
        output = render_latex_to_pdf(
            source,
            args.output_file,
            compiler=args.compiler,
            timeout=args.timeout,
        )
        print(output)
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
