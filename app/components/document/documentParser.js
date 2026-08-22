(function (global) {
  "use strict";

  // Regex to match {{VARIABLE}}, {{VARIABLE:DEFAULT_VALUE}}, or {{VARIABLE:LABEL:DEFAULT_VALUE}}
  var VAR_REGEX = /\{\{([A-Za-z0-9_-]+)(?::([^}]+))?\}\}/g;

  function extractVariablesFromText(text) {
    var str = String(text || "");
    var matches = [];
    var seen = {};
    var match;
    var re = new RegExp(VAR_REGEX.source, "g");

    while ((match = re.exec(str)) !== null) {
      var raw = match[0];
      var key = match[1];
      var rawMeta = match[2] || "";
      if (!seen[key]) {
        seen[key] = true;
        var parts = rawMeta.split(":");
        var label = key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, function (l) { return l.toUpperCase(); });
        var defaultValue = "";
        if (parts.length >= 2) {
          label = parts[0];
          defaultValue = parts.slice(1).join(":");
        } else if (parts.length === 1 && parts[0]) {
          defaultValue = parts[0];
        }
        matches.push({
          raw: raw,
          key: key,
          label: label,
          defaultValue: defaultValue,
        });
      }
    }
    return matches;
  }

  function extractVariablesFromSections(sections) {
    var all = [];
    var seen = {};
    (sections || []).forEach(function (sec) {
      var textToScan = (sec.title || "") + "\n" + (sec.content || "") + "\n" + (sec.subtitle || "") + "\n" + (sec.legalDisclaimer || "") + "\n" + (sec.versionText || "");
      var vars = extractVariablesFromText(textToScan);
      vars.forEach(function (v) {
        if (!seen[v.key]) {
          seen[v.key] = true;
          all.push(v);
        }
      });
    });
    return all;
  }

  function replaceVariablesInText(text, valuesMap) {
    if (!text || !valuesMap) return text || "";
    return String(text).replace(VAR_REGEX, function (match, key, rawMeta) {
      if (valuesMap[key] !== undefined && valuesMap[key] !== "") {
        return valuesMap[key];
      }
      var parts = (rawMeta || "").split(":");
      return parts.length >= 2 ? parts.slice(1).join(":") : (parts[0] || match);
    });
  }

  function formatInlineVariables(text) {
    if (!text) return "";
    return text.replace(VAR_REGEX, function (match, key, rawMeta) {
      var parts = (rawMeta || "").split(":");
      var displayVal = parts.length >= 2 ? parts.slice(1).join(":") : (parts[0] || key);
      return "🏷️ [" + displayVal + "]";
    });
  }

  function parseMarkdownToBlocks(content) {
    var lines = (content || "").split("\n");
    var blocks = [];
    var tableBuffer = [];
    var listBuffer = [];

    function flushTable() {
      if (tableBuffer.length >= 2) {
        var headers = tableBuffer[0].split("|").map(function (s) { return s.trim(); }).filter(Boolean);
        var rows = tableBuffer.slice(2).map(function (row) {
          return row.split("|").map(function (s) { return formatInlineVariables(s.trim()); }).filter(Boolean);
        });
        blocks.push({ type: "table", headers: headers, rows: rows });
      }
      tableBuffer = [];
    }

    function flushList() {
      if (!listBuffer.length) return;
      blocks.push({
        type: listBuffer[0].type,
        items: listBuffer.map(function (item) {
          return { text: formatInlineVariables(item.text), marker: item.marker, depth: item.depth };
        }),
      });
      listBuffer = [];
    }

    function parseListLine(raw) {
      var ordered = String(raw || "").match(/^(\s*)((?:\d+\.)*\d+)([.)])\s+(.+)$/);
      if (ordered) return {
        type: "ol",
        marker: ordered[2] + ordered[3],
        depth: Math.floor(ordered[1].replace(/\t/g, "  ").length / 2),
        text: ordered[4],
      };
      var bullet = String(raw || "").match(/^(\s*)[-+*]\s+(.+)$/);
      if (bullet) return {
        type: "ul",
        marker: "•",
        depth: Math.floor(bullet[1].replace(/\t/g, "  ").length / 2),
        text: bullet[2],
      };
      return null;
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var l = raw.trim();
      if (l.startsWith("|") && l.endsWith("|")) {
        flushList();
        tableBuffer.push(l);
        continue;
      } else if (tableBuffer.length > 0) {
        flushTable();
      }

      var listItem = parseListLine(raw);
      if (listItem) {
        if (listBuffer.length && listBuffer[0].type !== listItem.type) flushList();
        listBuffer.push(listItem);
        continue;
      }
      flushList();

      if (l.startsWith("> [!NOTE]")) {
        blocks.push({ type: "callout", tone: "info", title: "NOTA", text: formatInlineVariables(lines[++i]?.replace(/^>\s*/, "") || "") });
      } else if (l.startsWith("> [!IMPORTANT]")) {
        blocks.push({ type: "callout", tone: "important", title: "IMPORTANTE", text: formatInlineVariables(lines[++i]?.replace(/^>\s*/, "") || "") });
      } else if (l.startsWith("> [!WARNING]")) {
        blocks.push({ type: "callout", tone: "warning", title: "ADVERTENCIA", text: formatInlineVariables(lines[++i]?.replace(/^>\s*/, "") || "") });
      } else if (l.startsWith("# ")) {
        blocks.push({ type: "h1", text: formatInlineVariables(l.slice(2)) });
      } else if (l.startsWith("## ")) {
        blocks.push({ type: "h2", text: formatInlineVariables(l.slice(3)) });
      } else if (l.startsWith("### ")) {
        blocks.push({ type: "h3", text: formatInlineVariables(l.slice(4)) });
      } else if (l.startsWith("> ")) {
        blocks.push({ type: "quote", text: formatInlineVariables(l.slice(2)) });
      } else if (l.startsWith("- [ ] ") || l.startsWith("- [x] ")) {
        blocks.push({ type: "todo", checked: l.startsWith("- [x] "), text: formatInlineVariables(l.slice(6)) });
      } else if (l) {
        blocks.push({ type: "p", text: formatInlineVariables(l) });
      }
    }
    if (tableBuffer.length > 0) flushTable();
    flushList();
    return blocks;
  }

  // Converts incoming Markdown into the editor's section model. This keeps the
  // editor faithful to a project description instead of opening a generic mock.
  // It intentionally treats all content as text; Vue renders previews via text
  // bindings, never through raw HTML.
  function parseMarkdownToDocument(markdown, fallbackTitle) {
    var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    var title = String(fallbackTitle || "Untitled document").trim();
    var sections = [];
    var current = null;
    var mode = "standard";
    var sawDocumentTitle = false;
    var counter = 0;

    function newSection(type, heading, level) {
      counter += 1;
      return {
        id: "import-sec-" + counter,
        type: type || "standard",
        title: String(heading || "Untitled section").replace(/^\d+(?:\.\d+)*\.?\s+/, "").trim(),
        subtitle: "",
        content: "",
        legalDisclaimer: "",
        versionText: "",
        level: Math.min(3, Math.max(1, Number(level) || 1)),
        pageBreakBefore: sections.length > 0,
        alignVertical: type === "section_end" ? "bottom" : "center",
        showSignatures: type === "section_end",
      };
    }

    function flush() {
      if (!current) return;
      current.content = current.content.replace(/^\n+|\n+$/g, "");
      if (current.title || current.content || current.type !== "standard") sections.push(current);
      current = null;
    }

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var marker = line.match(/^<!--\s*(COVER|\/COVER|SECTION_END|\/SECTION_END|PAGEBREAK|HEADER:|FOOTER:)(.*?)-->\s*$/i);
      if (marker) {
        var token = marker[1].toUpperCase();
        if (token === "COVER" || token === "SECTION_END") {
          flush();
          mode = token === "COVER" ? "cover" : "section_end";
          current = newSection(mode, "", mode === "cover" ? 1 : 1);
        } else if (token === "/COVER" || token === "/SECTION_END") {
          flush();
          mode = "standard";
        } else if (token === "PAGEBREAK" && current) {
          current.pageBreakBefore = true;
        }
        continue;
      }

      var heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        var level = heading[1].length;
        var headingTitle = heading[2].trim();
        if (!sawDocumentTitle && level === 1 && !current && sections.length === 0) {
          title = headingTitle.replace(/^\d+(?:\.\d+)*\.?\s+/, "");
          sawDocumentTitle = true;
          continue;
        }
        if (mode === "cover" || mode === "section_end") {
          if (!current) current = newSection(mode, headingTitle, level);
          else current.title = headingTitle;
          continue;
        }
        flush();
        current = newSection("standard", headingTitle, level);
        continue;
      }

      if (!current && line.trim()) current = newSection(mode, "Overview", 1);
      if (!current) continue;
      if (mode === "cover" && /^\*\*Control de Versiones:\*\*/i.test(line)) {
        current.versionText = line.replace(/^\*\*Control de Versiones:\*\*\s*/i, "").trim();
      } else if (mode === "cover" && line === "> [!NOTE]" && lines[i + 1]) {
        current.legalDisclaimer = String(lines[i + 1]).replace(/^>\s*/, "").trim();
        i += 1;
      } else if (mode === "cover" && /^\*\*.+\*\*$/.test(line) && !current.subtitle) {
        current.subtitle = line.replace(/^\*\*|\*\*$/g, "").trim();
      } else {
        current.content += (current.content ? "\n" : "") + line;
      }
    }
    flush();
    if (!sections.length) sections.push(newSection("standard", "Overview", 1));
    return { title: title || "Untitled document", sections: sections };
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
      if (sec.pageBreakBefore || sec.type === "cover" || sec.type === "section_end") {
        md += "\n<!-- PAGEBREAK -->\n\n";
      }

      if (sec.type === "cover") {
        var align = sec.alignVertical || "center";
        md += "<!-- COVER align:" + align + " -->\n";
        md += "## " + (sec.title || "PORTADA") + "\n\n";
        if (sec.subtitle) md += "**" + sec.subtitle + "**\n\n";
        if (sec.content && sec.content.trim()) md += sec.content.trim() + "\n\n";
        if (sec.legalDisclaimer) md += "> [!NOTE]\n> " + sec.legalDisclaimer + "\n\n";
        if (sec.versionText) md += "**Control de Versiones:** " + sec.versionText + "\n\n";
        md += "<!-- /COVER -->\n\n";
      } else if (sec.type === "section_end") {
        var endAlign = sec.alignVertical || "bottom";
        md += "<!-- SECTION_END align:" + endAlign + " -->\n";
        md += "## " + (sec.title || "FIN DE SECCIÓN / CIERRE") + "\n\n";
        if (sec.content && sec.content.trim()) md += sec.content.trim() + "\n\n";
        if (sec.showSignatures) {
          md += "| Firma Comprador | Firma Proveedor | Firma Testigo |\n| :--- | :--- | :--- |\n| Nombre: ________________ | Nombre: ________________ | Nombre: ________________ |\n| Fecha: ________________ | Fecha: ________________ | Fecha: ________________ |\n\n";
        }
        md += "<!-- /SECTION_END -->\n\n";
      } else {
        var hashes = "#".repeat(sec.level || 1);
        md += hashes + " " + (sec.numberStr || "") + " " + sec.title + "\n\n";
        if (sec.content && sec.content.trim()) {
          md += sec.content.trim() + "\n\n";
        }
      }
    });

    if (config.footerText) {
      md += "<!-- FOOTER: " + config.footerText + " -->\n";
    }
    return md.trim();
  }

  var exports = {
    VAR_REGEX: VAR_REGEX,
    extractVariablesFromText: extractVariablesFromText,
    extractVariablesFromSections: extractVariablesFromSections,
    replaceVariablesInText: replaceVariablesInText,
    formatInlineVariables: formatInlineVariables,
    parseMarkdownToBlocks: parseMarkdownToBlocks,
    parseMarkdownToDocument: parseMarkdownToDocument,
    compileDocumentToMarkdown: compileDocumentToMarkdown,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
  global.DocumentParser = exports;
})(typeof window !== "undefined" ? window : globalThis);
