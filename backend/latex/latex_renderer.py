#!/usr/bin/env python3
"""
Compile LaTeX source into a PDF.

Usage examples:
  python latex_renderer.py --input-file sample.tex --output-file out.pdf
  cat sample.tex | python latex_renderer.py --stdin --output-file out.pdf
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path


class LatexRenderError(RuntimeError):
    """Raised when LaTeX compilation fails."""


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
        tex_path.write_text(latex_source, encoding="utf-8")

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
