#!/usr/bin/env python3
"""
Generate browser-friendly LaTeX preview output.

Usage examples:
  python latex_preview.py --input-file sample.tex
  cat sample.tex | python latex_preview.py --stdin --output-html preview.html
"""

from __future__ import annotations

import argparse
import base64
import json
import tempfile
from pathlib import Path

from latex_renderer import LatexRenderError, render_latex_to_pdf


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compile LaTeX and emit preview payload.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--stdin", action="store_true", help="Read LaTeX source from stdin.")
    source.add_argument("--input-file", type=Path, help="Path to a .tex file.")
    parser.add_argument(
        "--output-html",
        type=Path,
        help="Optional output HTML file that embeds the PDF preview.",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Optional JSON file output. If omitted, JSON is printed to stdout.",
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


def _read_source(args: argparse.Namespace) -> str:
    if args.stdin:
        import sys

        return sys.stdin.read()
    return Path(args.input_file).read_text(encoding="utf-8")


def build_preview_html(data_url: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LaTeX Preview</title>
  <style>
    html, body {{ margin: 0; height: 100%; background: #f5f5f4; }}
    .frame {{ border: 0; width: 100%; height: 100%; }}
  </style>
</head>
<body>
  <iframe class="frame" src="{data_url}" title="LaTeX Preview"></iframe>
</body>
</html>
"""


def main() -> int:
    args = parse_args()
    try:
        latex_source = _read_source(args)
        with tempfile.TemporaryDirectory(prefix="previo-preview-") as tmp_dir:
            pdf_path = Path(tmp_dir) / "preview.pdf"
            render_latex_to_pdf(
                latex_source,
                pdf_path,
                compiler=args.compiler,
                timeout=args.timeout,
            )
            pdf_bytes = pdf_path.read_bytes()

        pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
        data_url = f"data:application/pdf;base64,{pdf_b64}"

        payload = {
            "mime_type": "application/pdf",
            "pdf_base64": pdf_b64,
            "pdf_data_url": data_url,
        }

        if args.output_html:
            args.output_html.parent.mkdir(parents=True, exist_ok=True)
            args.output_html.write_text(build_preview_html(data_url), encoding="utf-8")

        if args.output_json:
            args.output_json.parent.mkdir(parents=True, exist_ok=True)
            args.output_json.write_text(json.dumps(payload), encoding="utf-8")
        else:
            print(json.dumps(payload))

        return 0
    except (LatexRenderError, OSError, ValueError) as exc:
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
