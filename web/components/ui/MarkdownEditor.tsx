"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMParser as PmDOMParser } from "@tiptap/pm/model";
import { Extension } from "@tiptap/core";

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

const EDITOR_STYLES = `
[data-cogni-editor][contenteditable],
[data-cogni-editor][contenteditable] p,
[data-cogni-editor][contenteditable] h1,
[data-cogni-editor][contenteditable] h2,
[data-cogni-editor][contenteditable] h3,
[data-cogni-editor][contenteditable] li,
[data-cogni-editor][contenteditable] ul,
[data-cogni-editor][contenteditable] ol,
[data-cogni-editor][contenteditable] strong,
[data-cogni-editor][contenteditable] em,
[data-cogni-editor][contenteditable] span,
[data-cogni-editor][contenteditable] td,
[data-cogni-editor][contenteditable] th {
  color: var(--text-primary) !important;
  -webkit-text-fill-color: var(--text-primary) !important;
}

[data-cogni-editor][contenteditable] a {
  color: var(--primary) !important;
  -webkit-text-fill-color: var(--primary) !important;
  text-decoration: underline;
}

[data-cogni-editor][contenteditable] blockquote,
[data-cogni-editor][contenteditable] blockquote * {
  color: var(--text-secondary) !important;
  -webkit-text-fill-color: var(--text-secondary) !important;
  border-left: 3px solid var(--border);
  padding-left: 0.75rem;
}

[data-cogni-editor][contenteditable] code {
  background: var(--surface-secondary);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.85em;
}
[data-cogni-editor][contenteditable] pre {
  background: var(--surface-secondary);
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}
[data-cogni-editor][contenteditable] pre code {
  background: none;
  padding: 0;
}

[data-cogni-editor][contenteditable] h1 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
[data-cogni-editor][contenteditable] h2 { font-size: 1.1rem; font-weight: 600; margin: 0.6rem 0 0.4rem; }
[data-cogni-editor][contenteditable] h3 { font-size: 1rem; font-weight: 600; margin: 0.5rem 0 0.3rem; }
[data-cogni-editor][contenteditable] p { margin: 0.25rem 0; }
[data-cogni-editor][contenteditable] ul { padding-left: 1.25rem; margin: 0.25rem 0; list-style-type: disc; }
[data-cogni-editor][contenteditable] ol { padding-left: 1.25rem; margin: 0.25rem 0; list-style-type: decimal; }
[data-cogni-editor][contenteditable] li { margin: 0.1rem 0; }
[data-cogni-editor][contenteditable] li p { margin: 0; }
[data-cogni-editor][contenteditable] strong { font-weight: 600; }
[data-cogni-editor][contenteditable] hr { border-color: var(--border); margin: 0.75rem 0; }

/* Table styles */
[data-cogni-editor][contenteditable] table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}
[data-cogni-editor][contenteditable] th,
[data-cogni-editor][contenteditable] td {
  border: 1px solid var(--border);
  padding: 0.35rem 0.5rem;
  text-align: left;
  min-width: 60px;
}
[data-cogni-editor][contenteditable] th {
  background: var(--surface-secondary);
  font-weight: 600;
}

/* Markdown syntax hints — only show on active (cursor) line */
[data-cogni-editor][contenteditable] h1.md-active::before {
  content: "# ";
  color: var(--text-muted) !important;
  -webkit-text-fill-color: var(--text-muted) !important;
  font-weight: 400;
  font-size: 0.75em;
  opacity: 0.7;
}
[data-cogni-editor][contenteditable] h2.md-active::before {
  content: "## ";
  color: var(--text-muted) !important;
  -webkit-text-fill-color: var(--text-muted) !important;
  font-weight: 400;
  font-size: 0.75em;
  opacity: 0.7;
}
[data-cogni-editor][contenteditable] h3.md-active::before {
  content: "### ";
  color: var(--text-muted) !important;
  -webkit-text-fill-color: var(--text-muted) !important;
  font-weight: 400;
  font-size: 0.75em;
  opacity: 0.7;
}
[data-cogni-editor][contenteditable] blockquote.md-active::before {
  content: "> ";
  color: var(--text-muted) !important;
  -webkit-text-fill-color: var(--text-muted) !important;
  font-weight: 400;
  font-size: 0.85em;
  opacity: 0.7;
}

[data-cogni-editor][contenteditable] {
  outline: none;
  min-height: 60px;
  height: 100%;
}

/* Placeholder */
[data-cogni-editor] p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted) !important;
  -webkit-text-fill-color: var(--text-muted) !important;
  pointer-events: none;
  height: 0;
}
`;

/**
 * Force-parse pasted text as Markdown, regardless of source (rich text or plain text).
 * tiptap-markdown's built-in transformPastedText skips plain-text pastes,
 * so we override the clipboardTextParser ourselves.
 */
const MarkdownPaste = Extension.create({
  name: "markdownPaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            if (!text?.trim()) return false;
            event.preventDefault();
            // Parse the plain text as markdown using tiptap-markdown's parser
            const htmlString = editor.storage.markdown.parser.parse(text);
            // Create a temp DOM element to parse
            const tempEl = document.createElement("div");
            tempEl.innerHTML = htmlString;
            const slice = PmDOMParser.fromSchema(editor.schema).parseSlice(tempEl, {
              preserveWhitespace: true,
            });
            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});

export function MarkdownEditor({
  content,
  onChange,
  placeholder = "添加描述...",
  className = "",
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isExternalUpdate = useRef(false);

  // Track active block element for showing markdown hints
  const updateActiveBlock = useCallback((editorView: { dom: HTMLElement; state: { selection: { $from: { start: () => number } } }; domAtPos: (pos: number) => { node: Node } }) => {
    const dom = editorView.dom;
    // Remove all md-active classes
    dom.querySelectorAll(".md-active").forEach((el) => el.classList.remove("md-active"));
    try {
      const { $from } = editorView.state.selection;
      const startPos = $from.start();
      const resolved = editorView.domAtPos(startPos);
      // Walk up to find the direct child of the editor (the block element)
      let blockEl: HTMLElement | null =
        resolved.node.nodeType === 1
          ? (resolved.node as HTMLElement)
          : (resolved.node.parentElement as HTMLElement);
      while (blockEl && blockEl.parentElement !== dom) {
        blockEl = blockEl.parentElement;
      }
      if (blockEl) {
        blockEl.classList.add("md-active");
      }
    } catch {
      // ignore position errors
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({
        html: false,
        transformPastedText: false,
        transformCopiedText: true,
      }),
      MarkdownPaste,
    ],
    content,
    injectCSS: false,
    editorProps: {
      attributes: {
        "data-cogni-editor": "true",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Backspace") {
          const { state } = view;
          const { $from } = state.selection;
          if ($from.parentOffset === 0) {
            const nodeType = $from.parent.type.name;
            if (nodeType === "heading") {
              const tr = state.tr.setBlockType(
                $from.before(),
                $from.after(),
                state.schema.nodes.paragraph
              );
              view.dispatch(tr);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isExternalUpdate.current) return;
      const md = ed.storage.markdown.getMarkdown();
      onChangeRef.current(md);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      updateActiveBlock(ed.view);
    },
    onCreate: ({ editor: ed }) => {
      updateActiveBlock(ed.view);
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (!editor) return;
    const currentMd = editor.storage.markdown.getMarkdown();
    if (currentMd !== content) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content || "");
      isExternalUpdate.current = false;
    }
  }, [editor, content]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EDITOR_STYLES }} />
      <div
        className={`rounded-sm border px-3 py-2 text-sm cursor-text flex flex-col ${className}`}
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} className="flex-1 [&>.tiptap]:h-full" />
      </div>
    </>
  );
}
