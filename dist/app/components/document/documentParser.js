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

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l.startsWith("|") && l.endsWith("|")) {
        tableBuffer.push(l);
        continue;
      } else if (tableBuffer.length > 0) {
        flushTable();
      }

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
      } else if (l.startsWith("- ") || l.startsWith("* ")) {
        blocks.push({ type: "list-item", text: formatInlineVariables(l.slice(2)) });
      } else if (l) {
        blocks.push({ type: "p", text: formatInlineVariables(l) });
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
    compileDocumentToMarkdown: compileDocumentToMarkdown,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
  global.DocumentParser = exports;
})(typeof window !== "undefined" ? window : globalThis);
