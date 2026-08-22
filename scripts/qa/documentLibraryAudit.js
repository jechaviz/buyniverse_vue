function runDocumentLibraryAudit(root, read) {
  const storage = {};
  const scope = {
    localStorage: {
      getItem: (key) => storage[key] || null,
      setItem: (key, value) => { storage[key] = value; },
      removeItem: (key) => { delete storage[key]; },
    },
  };
  new Function("window", read("app/lib/web-common.js"))(scope);
  new Function("window", read("app/components/document/documentParser.js"))(scope);
  new Function("window", read("app/components/document/documentLibrary.js"))(scope);

  const library = scope.DocumentLibrary;
  if (!library || typeof library.save !== "function" || typeof library.loadDraft !== "function")
    throw new Error("Document library API is unavailable");

  const sections = Array.from({ length: 72 }, (_, index) => ({
    id: `sec-${index}`,
    type: "standard",
    title: `Scope ${index}\u202e`,
    level: index % 3 + 1,
    content: `Requirement ${index}`,
  }));
  const saved = library.save("qa-owner", {
    name: "Reusable supplier brief",
    title: "Reusable supplier brief",
    tags: ["rfq", "security", "rfq", "x".repeat(80)],
    sections,
  });
  if (!saved || saved.sections.length !== 60 || saved.tags.length !== 3 || /\u202e/.test(saved.sections[0].title))
    throw new Error("Document library normalization limits or text sanitization failed");
  if (library.list("qa-other").length !== 0)
    throw new Error("Document library is not user-scoped");

  const styled = library.save("qa-owner", {
    name: "Styled cover",
    title: "Styled cover",
    tags: ["cover"],
    sections: [{
      id: "cover-style",
      type: "cover",
      title: "Confidential sourcing brief",
      styles: { title: { align: "right", vertical: "bottom", size: "lg", tone: "brand", surface: "plain" } },
      headerFooter: { headerEnabled: true, headerMode: "section_title", footerEnabled: true, footerMode: "custom", footerText: "Restricted" },
    }],
  });
  const styledSection = styled && styled.sections[0];
  if (!styledSection || styledSection.styles.title.align !== "right" || styledSection.styles.title.vertical !== "bottom" || styledSection.headerFooter.headerMode !== "section_title" || styledSection.headerFooter.footerText !== "Restricted")
    throw new Error("Document cover styles or section header/footer settings were not preserved");
  const inheritedCover = library.normalize({ name: "Defaults", title: "Defaults", sections: [{ id: "default-cover", type: "cover", title: "Defaults" }] });
  if (inheritedCover.sections[0].styles.title.align !== "center" || inheritedCover.sections[0].styles.legal.surface !== "legal")
    throw new Error("Cover style defaults change after document persistence");

  const identity = library.fingerprint("# Brief\n\n## Scope\nControlled text");
  if (!library.saveDraft("qa-owner", identity, saved) || !library.loadDraft("qa-owner", identity))
    throw new Error("Scoped Markdown draft recovery failed");
  library.clearDraft("qa-owner", identity);
  if (library.loadDraft("qa-owner", identity)) throw new Error("Draft clear failed");

  const parsed = scope.DocumentParser.parseMarkdownToDocument("# Source brief\n\n## Scope\nControlled text");
  if (parsed.title !== "Source brief" || parsed.sections.length !== 1 || parsed.sections[0].title !== "Scope")
    throw new Error("Initial Markdown is not hydrated into document sections");

  const editor = read("app/components/document/DocumentEditorModal.vue");
  const fields = read("app/components/document/DocumentVariableDrawer.vue");
  const cover = read("app/components/document/DocumentCoverEditor.vue");
  const chrome = read("app/components/document/DocumentHeaderFooterModal.vue");
  const sidebar = read("app/components/document/DocumentSidebarPanel.vue");
  if (!editor.includes("DocumentLibraryDrawer") || !editor.includes("parseMarkdownToDocument") || /\bprompt\s*\(/.test(editor))
    throw new Error("Document editor lacks the reusable library or retains a native prompt");
  if (editor.includes("templatesOpen") || editor.includes("Floating templates dropdown"))
    throw new Error("Document editor retains the clipped duplicate templates dropdown");
  if (!editor.includes("hasCover") || !editor.includes("hasSectionEnd") || !sidebar.includes("canAddCover") || !sidebar.includes("canAddSectionEnd"))
    throw new Error("Document cover and ending singleton guards are incomplete");
  if (fields.includes("buyniverse_saved_doc_templates"))
    throw new Error("Saved-document persistence remains duplicated in the fields drawer");
  if (!cover.includes("DocumentBlockStyleToolbar") || !cover.includes("setBlockStyle") || !chrome.includes("apply-to-all") || !chrome.includes("section_title"))
    throw new Error("Cover style controls or section-level page chrome are incomplete");

  return { reusableDocuments: library.list("qa-owner").length, sectionLimit: saved.sections.length, styledCover: styledSection.title };
}

module.exports = { runDocumentLibraryAudit };
