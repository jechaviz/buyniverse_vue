(function (global) {
  "use strict";

  function parseMarkdownToBlocks(content) {
    var lines = (content || "").split("\n");
    var blocks = [];
    var tableBuffer = [];

    function flushTable() {
      if (tableBuffer.length >= 2) {
        var headers = tableBuffer[0].split("|").map(function (s) { return s.trim(); }).filter(Boolean);
        var rows = tableBuffer.slice(2).map(function (row) {
          return row.split("|").map(function (s) { return s.trim(); }).filter(Boolean);
        });
        blocks.push({ type: "table", headers: headers, rows: rows });
      }
      tableBuffer = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l.startsWith("|") && l.endsWith("|")) {
        tableBuffer.push(l);
        continue;
      } else if (tableBuffer.length > 0) {
        flushTable();
      }

      if (l.startsWith("> [!NOTE]")) {
        blocks.push({ type: "callout", tone: "info", title: "NOTA", text: lines[++i]?.replace(/^>\s*/, "") || "" });
      } else if (l.startsWith("> [!IMPORTANT]")) {
        blocks.push({ type: "callout", tone: "important", title: "IMPORTANTE", text: lines[++i]?.replace(/^>\s*/, "") || "" });
      } else if (l.startsWith("> [!WARNING]")) {
        blocks.push({ type: "callout", tone: "warning", title: "ADVERTENCIA", text: lines[++i]?.replace(/^>\s*/, "") || "" });
      } else if (l.startsWith("# ")) {
        blocks.push({ type: "h1", text: l.slice(2) });
      } else if (l.startsWith("## ")) {
        blocks.push({ type: "h2", text: l.slice(3) });
      } else if (l.startsWith("### ")) {
        blocks.push({ type: "h3", text: l.slice(4) });
      } else if (l.startsWith("> ")) {
        blocks.push({ type: "quote", text: l.slice(2) });
      } else if (l.startsWith("- [ ] ") || l.startsWith("- [x] ")) {
        blocks.push({ type: "todo", checked: l.startsWith("- [x] "), text: l.slice(6) });
      } else if (l.startsWith("- ") || l.startsWith("* ")) {
        blocks.push({ type: "list-item", text: l.slice(2) });
      } else if (l) {
        blocks.push({ type: "p", text: l });
      }
    }
    if (tableBuffer.length > 0) flushTable();
    return blocks;
  }

  function compileDocumentToMarkdown(config) {
    var md = "";
    if (config.showRunningHeader && config.headerText) {
      md += "<!-- HEADER: " + config.headerText + " -->\n";
    }
    if (config.docTitle) {
      md += "# " + config.docTitle + "\n\n";
    }

    config.flatSections.forEach(function (sec) {
      if (sec.pageBreakBefore) {
        md += "\n<!-- PAGEBREAK -->\n\n";
      }
      var hashes = "#".repeat(sec.level || 1);
      md += hashes + " " + sec.numberStr + " " + sec.title + "\n\n";
      if (sec.content && sec.content.trim()) {
        md += sec.content.trim() + "\n\n";
      }
    });

    if (config.footerText) {
      md += "<!-- FOOTER: " + config.footerText + " -->\n";
    }
    return md.trim();
  }

  var exports = {
    parseMarkdownToBlocks: parseMarkdownToBlocks,
    compileDocumentToMarkdown: compileDocumentToMarkdown,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
  global.DocumentParser = exports;
})(typeof window !== "undefined" ? window : globalThis);
