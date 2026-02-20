#!/usr/bin/env python3
"""
Generate browser-friendly Markdown preview payload.

Usage examples:
  python markdown_preview.py --input-file sample.md
  cat sample.md | python markdown_preview.py --stdin --output-html preview.html
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from markdown_renderer import build_full_html_document, markdown_to_html


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render Markdown and emit preview payload.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--stdin", action="store_true", help="Read markdown from stdin.")
    source.add_argument("--input-file", type=Path, help="Path to a markdown file.")
    parser.add_argument(
        "--title",
        default="Document",
        help="Title used in wrapped preview HTML.",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Optional JSON output path. If omitted, JSON is printed to stdout.",
    )
    parser.add_argument(
        "--output-html",
        type=Path,
        help="Optional full HTML output file for direct browser preview.",
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
        markdown_source = _read_source(args)
        body_html = markdown_to_html(markdown_source)
        full_html = build_full_html_document(args.title, body_html)

        payload = {
            "mime_type": "text/html",
            "html": body_html,
            "full_html": full_html,
        }

        if args.output_html:
            args.output_html.parent.mkdir(parents=True, exist_ok=True)
            args.output_html.write_text(full_html, encoding="utf-8")

        if args.output_json:
            args.output_json.parent.mkdir(parents=True, exist_ok=True)
            args.output_json.write_text(json.dumps(payload), encoding="utf-8")
        else:
            print(json.dumps(payload))

        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
