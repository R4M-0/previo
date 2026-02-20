// lib/renderer.ts

/**
 * Lightweight Markdown renderer (no external deps required).
 * For production: replace with `marked` or `markdown-it`.
 */
export function renderMarkdown(source: string): string {
  let html = source
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");

  // Headings
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Tables
  html = html.replace(
    /(\|.+\|\n)(\|[-| :]+\|\n)((?:\|.+\|\n?)*)/g,
    (match, header, sep, body) => {
      const parseRow = (row: string, tag: string) => {
        const cells = row
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => `<${tag}>${cell.trim()}</${tag}>`)
          .join("");
        return `<tr>${cells}</tr>`;
      };
      const headerRow = parseRow(header, "th");
      const bodyRows = body
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((row: string) => parseRow(row, "td"))
        .join("");
      return `<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
    }
  );

  // Task lists
  html = html.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>');

  // Unordered lists (simple)
  html = html.replace(/((?:^- .+\n?)+)/gm, (match) => {
    const items = match
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        if (line.startsWith("- ")) {
          return `<li>${line.slice(2)}</li>`;
        }
        return line;
      })
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (match) => {
    const items = match
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => `<li>${line.replace(/^\d+\. /, "")}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

  // Paragraphs: wrap lines that aren't already block-level
  const blockTags = /^(<h[1-6]|<ul|<ol|<li|<blockquote|<pre|<hr|<table|<thead|<tbody|<tr|<td|<th)/;
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (blockTags.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, " ")}</p>`;
    })
    .join("\n");

  return html;
}

/**
 * Lightweight LaTeX → structured HTML renderer.
 * For production: use a service like MathJax, KaTeX, or a Python compilation API.
 */
export function renderLatex(source: string): string {
  // Extract metadata
  const titleMatch = source.match(/\\title\{([^}]+)\}/);
  const authorMatch = source.match(/\\author\{([^}]+)\}/);
  const dateMatch = source.match(/\\date\{([^}]+)\}/);
  const abstractMatch = source.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);

  // Process body (between \begin{document} and \end{document})
  const bodyMatch = source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  let body = bodyMatch ? bodyMatch[1] : source;

  // Remove known control sequences used in header
  body = body
    .replace(/\\maketitle/g, "")
    .replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g, "")
    .replace(/\\tableofcontents/g, "");

  // Sections
  body = body.replace(/\\section\{([^}]+)\}/g, (_, t) => `<div class="latex-section">${t}</div>`);
  body = body.replace(/\\subsection\{([^}]+)\}/g, (_, t) => `<div class="latex-subsection">${t}</div>`);
  body = body.replace(/\\subsubsection\{([^}]+)\}/g, (_, t) => `<div class="latex-subsection" style="font-style:italic">${t}</div>`);

  // Equations
  body = body.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (_, eq) =>
    `<div class="latex-equation">${eq.trim()}</div>`
  );
  body = body.replace(/\$\$([^$]+)\$\$/g, (_, eq) => `<div class="latex-equation">${eq.trim()}</div>`);
  body = body.replace(/\$([^$]+)\$/g, (_, eq) => `<code style="font-family:serif">${eq.trim()}</code>`);

  // Text formatting
  body = body.replace(/\\textbf\{([^}]+)\}/g, '<span class="latex-bold">$1</span>');
  body = body.replace(/\\textit\{([^}]+)\}/g, '<span class="latex-italic">$1</span>');
  body = body.replace(/\\emph\{([^}]+)\}/g, '<span class="latex-italic">$1</span>');
  body = body.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
  body = body.replace(/\\large\s*/g, "");
  body = body.replace(/\\Large\s*/g, "");

  // Cleanup remaining commands
  body = body.replace(/\\[a-zA-Z]+(\[.*?\])?\{([^}]*)\}/g, "$2");
  body = body.replace(/\\[a-zA-Z]+(\[.*?\])?/g, "");
  body = body.replace(/\{([^}]*)\}/g, "$1");
  body = body.replace(/%%[^\n]*/g, "");
  body = body.replace(/%[^\n]*/g, "");

  // Paragraphs
  body = body
    .split(/\n\n+/)
    .map((p) => {
      const t = p.trim();
      if (!t) return "";
      if (t.startsWith("<div")) return t;
      return `<p>${t.replace(/\n/g, " ")}</p>`;
    })
    .join("\n");

  // Build title block
  const titleBlock = titleMatch
    ? `<div class="latex-title">${titleMatch[1].replace(/\\\\.*/, "")}</div>`
    : "";
  const authorBlock = authorMatch
    ? `<div class="latex-author">${authorMatch[1]}</div>`
    : "";
  const dateBlock = dateMatch
    ? `<div class="latex-date">${dateMatch[1].replace("\\today", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}</div>`
    : "";

  const abstractBlock = abstractMatch
    ? `<div class="latex-abstract">
        <div class="latex-abstract-title">Abstract</div>
        <p>${abstractMatch[1].trim()}</p>
      </div>`
    : "";

  return `<div class="latex-preview">
    ${titleBlock}${authorBlock}${dateBlock}
    ${abstractBlock}
    ${body}
  </div>`;
}
