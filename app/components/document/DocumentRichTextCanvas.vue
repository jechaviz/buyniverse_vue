<template>
  <section class="flex min-h-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
    <div class="flex items-center justify-between border-b border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/70">
      <span><i class="fa-solid fa-pen-nib mr-1 text-brand"></i>{{ store.t('Lienzo visual') }}</span>
      <span class="font-mono text-slate-400">{{ wordCount }} {{ store.t('palabras') }}</span>
    </div>
    <div class="flex-1 overflow-y-auto bg-slate-100/60 p-3 dark:bg-slate-950/70 sm:p-5">
      <div class="mx-auto min-h-[360px] max-w-4xl rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm transition focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15 dark:border-slate-800 dark:bg-slate-900 sm:px-8 sm:py-7">
        <div
          ref="editorEl"
          class="rich-canvas min-h-[310px] outline-none"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          :aria-label="store.t('Editor visual del contenido de la sección')"
          spellcheck="true"
          @input="commit"
          @keydown="handleKeydown"
          @keyup="rememberSelection"
          @mouseup="rememberSelection"
          @paste="pastePlainText"
        ></div>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200/90 px-3 py-1.5 font-mono text-[9px] text-slate-500 dark:border-slate-800">
      <span>Ctrl/⌘+B</span><span>Ctrl/⌘+I</span><span>Tab ↹ {{ store.t('anida listas') }}</span><span>Shift+Tab ⇧↹ {{ store.t('asciende') }}</span>
    </div>
  </section>
</template>

<script>
const { ref, computed, nextTick, onMounted, watch } = Vue;

function appendInline(parent, value, doc) {
  const token = /(\{\{[A-Za-z0-9_-]+(?::[^}]+)?\}\}|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;
  let cursor = 0;
  String(value || "").replace(token, (match, _token, offset) => {
    if (offset > cursor) parent.append(doc.createTextNode(String(value).slice(cursor, offset)));
    if (match.startsWith("{{")) {
      const variable = doc.createElement("span");
      variable.className = "rich-variable";
      variable.contentEditable = "false";
      variable.textContent = match.slice(2, -2).split(":")[0];
      parent.append(variable);
    } else {
      const tag = match.startsWith("**") ? "strong" : match.startsWith("~~") ? "s" : match.startsWith("`") ? "code" : "em";
      const formatted = doc.createElement(tag);
      formatted.textContent = match.slice(tag === "strong" || tag === "s" ? 2 : 1, tag === "strong" || tag === "s" ? -2 : -1);
      parent.append(formatted);
    }
    cursor = offset + match.length;
    return match;
  });
  if (cursor < String(value || "").length) parent.append(doc.createTextNode(String(value).slice(cursor)));
}

function markdownToEditableNodes(markdown, doc) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const nodes = [];
  let index = 0;
  while (index < lines.length) {
    const raw = lines[index], trimmed = raw.trim();
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const ordered = raw.match(/^(\s*)((?:\d+\.)*\d+)[.)]\s+(.+)$/);
    const bullet = raw.match(/^(\s*)[-+*]\s+(.+)$/);
    const task = raw.match(/^(\s*)- \[([ xX])\]\s+(.+)$/);
    if (!trimmed) { index += 1; continue; }
    if (heading) {
      const level = heading[1].length;
      const node = doc.createElement(`h${level}`);
      appendInline(node, heading[2], doc);
      nodes.push(node);
    } else if (trimmed.startsWith("> [!NOTE]") || trimmed.startsWith("> [!IMPORTANT]") || trimmed.startsWith("> [!WARNING]")) {
      const tone = trimmed.match(/^> \[!(NOTE|IMPORTANT|WARNING)\]/)?.[1] || "NOTE";
      const text = lines[index + 1]?.replace(/^>\s?/, "") || "";
      const node = doc.createElement("blockquote");
      node.dataset.callout = tone;
      node.className = `rich-callout rich-callout-${tone.toLowerCase()}`;
      const label = doc.createElement("b");
      label.textContent = tone;
      node.append(label, doc.createElement("br"));
      appendInline(node, text, doc);
      nodes.push(node);
      index += 1;
    } else if (task) {
      const node = doc.createElement("div"), status = task[2].toLowerCase() === "x" ? "done" : "todo", icon = doc.createElement("span"), text = doc.createElement("span");
      node.dataset.task = status; node.className = "rich-task"; node.style.setProperty("--depth", String(Math.floor(task[1].replace(/\t/g, "  ").length / 2)));
      icon.contentEditable = "false"; icon.textContent = status === "done" ? "☑" : "☐"; appendInline(text, task[3], doc); node.append(icon, text); nodes.push(node);
    } else if (ordered) {
      const depth = Math.floor(ordered[1].replace(/\t/g, "  ").length / 2);
      const node = doc.createElement("div"), marker = doc.createElement("span"), text = doc.createElement("span");
      node.dataset.marker = `${ordered[2]}.`; node.dataset.list = "ordered"; node.className = "rich-list-row"; node.style.setProperty("--depth", String(depth)); marker.className = "rich-marker"; marker.contentEditable = "false"; marker.textContent = `${ordered[2]}.`; appendInline(text, ordered[3], doc); node.append(marker, text); nodes.push(node);
    } else if (bullet) {
      const depth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2);
      const node = doc.createElement("div"), marker = doc.createElement("span"), text = doc.createElement("span");
      node.dataset.marker = "•"; node.dataset.list = "bullet"; node.className = "rich-list-row"; node.style.setProperty("--depth", String(depth)); marker.className = "rich-marker"; marker.contentEditable = "false"; marker.textContent = "•"; appendInline(text, bullet[2], doc); node.append(marker, text); nodes.push(node);
    } else if (trimmed.startsWith("> ")) {
      const node = doc.createElement("blockquote"); appendInline(node, trimmed.slice(2), doc); nodes.push(node);
    } else {
      const node = doc.createElement("p"); appendInline(node, raw, doc); nodes.push(node);
    }
    index += 1;
  }
  if (!nodes.length) {
    const empty = doc.createElement("p");
    empty.append(doc.createElement("br"));
    nodes.push(empty);
  }
  return nodes;
}

function inlineFromDom(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.tagName.toUpperCase();
  if (node.classList?.contains("rich-marker")) return "";
  if (node.classList?.contains("rich-variable")) return `{{${node.textContent || "FIELD"}}}`;
  const children = Array.from(node.childNodes).map(inlineFromDom).join("");
  if (["B", "STRONG"].includes(tag)) return `**${children}**`;
  if (["I", "EM"].includes(tag)) return `*${children}*`;
  if (["S", "STRIKE", "DEL"].includes(tag)) return `~~${children}~~`;
  if (tag === "CODE") return `\`${children}\``;
  if (tag === "BR") return "\n";
  return children;
}

function markdownFromEditable(root) {
  const blocks = [];
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) blocks.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toUpperCase();
    const text = inlineFromDom(node).trim();
    if (!text && !node.dataset.marker) return;
    if (/^H[1-3]$/.test(tag)) blocks.push(`${"#".repeat(Number(tag.slice(1)))} ${text}`);
    else if (node.dataset.callout) blocks.push(`> [!${node.dataset.callout}]\n> ${text}`);
    else if (node.dataset.task) blocks.push(`${"  ".repeat(Number(node.style.getPropertyValue("--depth")) || 0)}- [${node.dataset.task === "done" ? "x" : " "}] ${text}`);
    else if (node.dataset.list === "ordered") blocks.push(`${"  ".repeat(Number(node.style.getPropertyValue("--depth")) || 0)}${node.dataset.marker || "1."} ${text}`);
    else if (node.dataset.list === "bullet") blocks.push(`${"  ".repeat(Number(node.style.getPropertyValue("--depth")) || 0)}- ${text}`);
    else if (tag === "BLOCKQUOTE") blocks.push(`> ${text}`);
    else if (tag === "LI") blocks.push(`- ${text}`);
    else if (tag === "OL" || tag === "UL") {
      Array.from(node.children).forEach((li, index) => blocks.push(`${tag === "OL" ? `${index + 1}.` : "-"} ${inlineFromDom(li).trim()}`));
    } else blocks.push(text);
  });
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default {
  name: "DocumentRichTextCanvas",
  props: { modelValue: { type: String, default: "" }, store: Object },
  emits: ["update:modelValue", "focus-source"],
  setup(props, { emit, expose }) {
    const editorEl = ref(null), syncing = ref(false);
    const wordCount = computed(() => String(props.modelValue || "").trim().split(/\s+/).filter(Boolean).length);
    let savedRange = null;
    function render(value, force = false) {
      if (!editorEl.value || (!force && document.activeElement === editorEl.value)) return;
      syncing.value = true;
      editorEl.value.replaceChildren(...markdownToEditableNodes(value, editorEl.value.ownerDocument));
      syncing.value = false;
    }
    function rememberSelection() {
      const selection = window.getSelection?.();
      if (!selection?.rangeCount || !editorEl.value) return;
      const range = selection.getRangeAt(0);
      if (editorEl.value.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
    }
    function restoreSelection() {
      if (!savedRange || !editorEl.value) return;
      const selection = window.getSelection?.();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    function commit() {
      if (syncing.value || !editorEl.value) return;
      emit("update:modelValue", markdownFromEditable(editorEl.value));
    }
    function execute(command) {
      if (!editorEl.value) return;
      editorEl.value.focus();
      restoreSelection();
      const actions = {
        undo: ["undo"], redo: ["redo"], bold: ["bold"], italic: ["italic"], strike: ["strikeThrough"],
        code: ["formatBlock", "pre"], h1: ["formatBlock", "h1"], h2: ["formatBlock", "h2"], h3: ["formatBlock", "h3"],
        paragraph: ["formatBlock", "p"], quote: ["formatBlock", "blockquote"], ordered: ["insertOrderedList"], bullet: ["insertUnorderedList"],
      };
      const action = actions[command];
      if (!action) return;
      document.execCommand(action[0], false, action[1] || null);
      commit();
    }
    function pastePlainText(event) {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") || "";
      document.execCommand("insertText", false, text.replace(/\r\n?/g, "\n"));
      commit();
    }
    function handleBeforeInput(event) {
      if (event.inputType === "insertFromDrop") event.preventDefault();
    }
    function handleKeydown(event) {
      const shortcut = event.ctrlKey || event.metaKey;
      if (shortcut && !event.altKey && event.key.toLowerCase() === "b") { event.preventDefault(); execute("bold"); }
      if (shortcut && !event.altKey && event.key.toLowerCase() === "i") { event.preventDefault(); execute("italic"); }
      if (event.key === "Tab") { event.preventDefault(); document.execCommand(event.shiftKey ? "outdent" : "indent"); commit(); }
    }
    onMounted(() => nextTick(() => render(props.modelValue)));
    watch(() => props.modelValue, (value) => render(value));
    expose({ execute, commit, focus: () => editorEl.value?.focus(), refresh: () => render(props.modelValue, true) });
    return { editorEl, wordCount, commit, pastePlainText, handleBeforeInput, handleKeydown, rememberSelection };
  },
};
</script>

<style scoped>
.rich-canvas { color:#1e293b; font-size:.93rem; line-height:1.75; }
.dark .rich-canvas { color:#e2e8f0; }
.rich-canvas :deep(h1) { margin:0 0 1rem; color:#0f172a; font-size:1.55rem; font-weight:800; line-height:1.25; }
.rich-canvas :deep(h2) { margin:1.4rem 0 .75rem; color:#0f172a; font-size:1.2rem; font-weight:800; line-height:1.35; }
.rich-canvas :deep(h3) { margin:1.1rem 0 .55rem; color:#1e293b; font-size:1rem; font-weight:800; }
.dark .rich-canvas :deep(h1), .dark .rich-canvas :deep(h2), .dark .rich-canvas :deep(h3) { color:#f8fafc; }
.rich-canvas :deep(p) { margin:.7rem 0; min-height:1.45rem; }
.rich-canvas :deep(blockquote) { margin:1rem 0; border-left:3px solid #94a3b8; padding:.25rem 0 .25rem 1rem; color:#475569; }
.dark .rich-canvas :deep(blockquote) { border-color:#475569; color:#cbd5e1; }
.rich-canvas :deep(pre) { margin:.9rem 0; overflow:auto; border-radius:.65rem; background:#0f172a; padding:.8rem 1rem; color:#dbeafe; font-family:ui-monospace, monospace; font-size:.82rem; }
.rich-canvas :deep(.rich-callout) { border-radius:.65rem; border-left:3px solid #0ea5e9; background:#f0f9ff; padding:.7rem .85rem; color:#0c4a6e; }
.rich-canvas :deep(.rich-callout-important) { border-color:#f59e0b; background:#fffbeb; color:#78350f; }
.rich-canvas :deep(.rich-callout-warning) { border-color:#f43f5e; background:#fff1f2; color:#881337; }
.dark .rich-canvas :deep(.rich-callout) { background:rgba(12,74,110,.25); color:#bae6fd; }
.dark .rich-canvas :deep(.rich-callout-important) { background:rgba(120,53,15,.22); color:#fde68a; }
.dark .rich-canvas :deep(.rich-callout-warning) { background:rgba(136,19,55,.23); color:#fecdd3; }
.rich-canvas :deep(.rich-list-row), .rich-canvas :deep(.rich-task) { display:flex; gap:.6rem; padding-left:calc(var(--depth, 0) * 1.35rem); margin:.28rem 0; }
.rich-canvas :deep(.rich-marker) { min-width:2.3rem; color:#2563eb; font-family:ui-monospace, monospace; font-weight:700; }
.dark .rich-canvas :deep(.rich-marker) { color:#60a5fa; }
.rich-canvas :deep(.rich-variable) { display:inline-block; border-radius:.35rem; background:#fef3c7; padding:0 .3rem; color:#92400e; font-family:ui-monospace, monospace; font-size:.8em; font-weight:700; }
.dark .rich-canvas :deep(.rich-variable) { background:rgba(120,53,15,.55); color:#fde68a; }
</style>
