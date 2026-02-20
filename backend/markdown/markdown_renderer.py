#!/usr/bin/env python3
"""
Render Markdown source into downloadable HTML.

Usage examples:
  python markdown_renderer.py --input-file sample.md --output-file out.html
  cat sample.md | python markdown_renderer.py --stdin --output-file out.html
"""

from __future__ import annotations

import argparse
import html
from pathlib import Path

try:
    import markdown as md_lib
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "ERROR: Missing dependency 'markdown'. Install with: pip install -r backend/requirements.txt"
    ) from exc


class MarkdownRenderError(RuntimeError):
    """Raised when markdown rendering fails."""


def markdown_to_html(markdown_source: str) -> str:
    if not markdown_source.strip():
        raise MarkdownRenderError("Markdown source is empty.")

    body = md_lib.markdown(
        markdown_source,
        extensions=[
            "fenced_code",
            "tables",
            "toc",
            "sane_lists",
            "nl2br",
        ],
        output_format="html5",
    )
    return body


def build_full_html_document(title: str, body_html: str) -> str:
    safe_title = html.escape(title or "Document", quote=True)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{safe_title}</title>
  <style>
    :root {{
      color-scheme: light;
      --bg: #fafaf9;
      --surface: #ffffff;
      --text: #1f2937;
      --muted: #6b7280;
      --border: #e5e7eb;
      --code-bg: #f3f4f6;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 16px/1.6 "Georgia", "Times New Roman", serif;
    }}
    main {{
      max-width: 900px;
      margin: 2rem auto;
      padding: 2rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
    }}
    h1, h2, h3, h4, h5, h6 {{ line-height: 1.25; margin-top: 1.5em; }}
    p, ul, ol, table, pre, blockquote {{ margin: 1em 0; }}
    code {{
      background: var(--code-bg);
      padding: 0.1rem 0.35rem;
      border-radius: 6px;
      font-family: "Courier New", monospace;
      font-size: 0.95em;
    }}
    pre {{
      background: var(--code-bg);
      padding: 1rem;
      border-radius: 10px;
      overflow-x: auto;
    }}
    pre code {{
      padding: 0;
      background: transparent;
      border-radius: 0;
    }}
    blockquote {{
      border-left: 4px solid var(--border);
      margin-left: 0;
      padding-left: 1rem;
      color: var(--muted);
    }}
    table {{
      border-collapse: collapse;
      width: 100%;
    }}
    th, td {{
      border: 1px solid var(--border);
      padding: 0.5rem 0.6rem;
      text-align: left;
    }}
  </style>
</head>
<body>
  <main>
{body_html}
  </main>
</body>
</html>
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render Markdown into an HTML file.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--stdin", action="store_true", help="Read markdown from stdin.")
    source.add_argument("--input-file", type=Path, help="Path to a markdown file.")
    parser.add_argument(
        "--output-file",
        type=Path,
        required=True,
        help="Destination HTML file path.",
    )
    parser.add_argument(
        "--title",
        default="Document",
        help="Title used in the generated HTML document.",
    )
    return parser.parse_args()


def _read_source(args: argparse.Namespace) -> str:
    if args.stdin:
        import sys

        return sys.stdin.read()
    return Path(args.input_file).read_text(encoding="utf-8")


def main() -> int:
    args = parse_args()
    try:
        source = _read_source(args)
        body_html = markdown_to_html(source)
        full_html = build_full_html_document(args.title, body_html)

        args.output_file.parent.mkdir(parents=True, exist_ok=True)
        args.output_file.write_text(full_html, encoding="utf-8")

        print(args.output_file.resolve())
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
