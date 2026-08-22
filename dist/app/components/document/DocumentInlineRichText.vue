<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-950/70">
    <div v-if="showToolbar" class="flex items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-1.5 py-1 dark:border-slate-800 dark:bg-slate-900" role="toolbar" :aria-label="store.t('Visual text formatting')" @mousedown.prevent>
      <button v-for="action in actions" :key="action.key" type="button" class="grid h-6 w-6 place-items-center rounded text-[10px] text-slate-500 transition hover:bg-white hover:text-brand dark:hover:bg-slate-800" :title="store.t(action.title)" @click="execute(action.key)"><i class="fa-solid" :class="action.icon"></i></button>
      <span class="ml-auto pr-1 text-[8px] font-bold uppercase tracking-wide text-slate-400">{{ store.t('Visual') }}</span>
    </div>
    <div ref="editorEl" class="min-h-9 px-2.5 py-2 text-xs leading-relaxed text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] dark:text-slate-100" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" :aria-label="label" :data-placeholder="placeholder" @focus="$emit('focus')" @input="commit" @mouseup="rememberSelection" @keyup="rememberSelection" @paste="pastePlainText"></div>
  </div>
</template>

<script>
const { ref, nextTick, onMounted, watch } = Vue;

function appendInline(parent, value, doc) {
  const token = /(\{\{[A-Za-z0-9_-]+(?::[^}]+)?\}\}|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;
  let cursor = 0;
  String(value || "").replace(token, (match, _token, offset) => {
    if (offset > cursor) parent.append(doc.createTextNode(String(value).slice(cursor, offset)));
    const tag = match.startsWith("**") ? "strong" : match.startsWith("~~") ? "s" : match.startsWith("`") ? "code" : match.startsWith("{{") ? "span" : "em";
    const formatted = doc.createElement(tag);
    if (tag === "span") { formatted.className = "rounded bg-amber-100 px-1 font-mono text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"; formatted.textContent = match.slice(2, -2).split(":")[0]; }
    else formatted.textContent = match.slice(tag === "strong" || tag === "s" ? 2 : 1, tag === "strong" || tag === "s" ? -2 : -1);
    parent.append(formatted);
    cursor = offset + match.length;
    return match;
  });
  if (cursor < String(value || "").length) parent.append(doc.createTextNode(String(value).slice(cursor)));
}

function toMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.tagName.toUpperCase(), children = Array.from(node.childNodes).map(toMarkdown).join("");
  if (["B", "STRONG"].includes(tag)) return `**${children}**`;
  if (["I", "EM"].includes(tag)) return `*${children}*`;
  if (["S", "STRIKE", "DEL"].includes(tag)) return `~~${children}~~`;
  if (tag === "CODE") return `\`${children}\``;
  if (tag === "PRE") return `\`${children}\``;
  if (tag === "BR") return "\n";
  if (tag === "DIV" || tag === "P") return `${children}\n`;
  return children;
}

export default {
  name: "DocumentInlineRichText",
  props: { modelValue: { type: String, default: "" }, store: Object, label: { type: String, default: "Visual editor" }, placeholder: { type: String, default: "" }, showToolbar: { type: Boolean, default: true } },
  emits: ["update:modelValue", "focus"],
  setup(props, { emit, expose }) {
    const editorEl = ref(null);
    let syncing = false, savedRange = null;
    const actions = [
      { key: "bold", icon: "fa-bold", title: "Bold" }, { key: "italic", icon: "fa-italic", title: "Italic" },
      { key: "strike", icon: "fa-strikethrough", title: "Strikethrough" }, { key: "code", icon: "fa-code", title: "Inline code" },
    ];
    function render(value, force = false) {
      if (!editorEl.value || (!force && document.activeElement === editorEl.value)) return;
      syncing = true;
      const doc = editorEl.value.ownerDocument, fragment = doc.createDocumentFragment();
      String(value || "").split("\n").forEach((line, index) => { if (index) fragment.append(doc.createElement("br")); appendInline(fragment, line, doc); });
      editorEl.value.replaceChildren(fragment);
      syncing = false;
    }
    function rememberSelection() {
      const selection = window.getSelection?.();
      if (!selection?.rangeCount || !editorEl.value) return;
      const range = selection.getRangeAt(0);
      if (editorEl.value.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
    }
    function restoreSelection() { const selection = window.getSelection?.(); if (!selection || !savedRange) return; selection.removeAllRanges(); selection.addRange(savedRange); }
    function commit() { if (!syncing && editorEl.value) emit("update:modelValue", toMarkdown(editorEl.value).replace(/\n+$/g, "")); }
    function execute(command) {
      if (!editorEl.value) return;
      editorEl.value.focus(); restoreSelection();
      const action = { bold: ["bold"], italic: ["italic"], strike: ["strikeThrough"], code: ["formatBlock", "pre"] }[command];
      if (!action) return;
      document.execCommand(action[0], false, action[1] || null); commit();
    }
    function pastePlainText(event) { event.preventDefault(); document.execCommand("insertText", false, (event.clipboardData?.getData("text/plain") || "").replace(/\r\n?/g, "\n")); commit(); }
    onMounted(() => nextTick(() => render(props.modelValue, true)));
    watch(() => props.modelValue, (value) => render(value));
    expose({ focus: () => editorEl.value?.focus(), refresh: () => render(props.modelValue, true) });
    return { editorEl, actions, execute, commit, rememberSelection, pastePlainText };
  },
};
</script>
