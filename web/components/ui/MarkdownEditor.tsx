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
import { DOMParser as PmDOMParser, Node as PmNode } from "@tiptap/pm/model";
import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";

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

/* Image styles */
[data-cogni-editor][contenteditable] img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5rem 0;
  cursor: default;
}
[data-cogni-editor][contenteditable] img.ProseMirror-selectednode {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
[data-cogni-editor] .image-uploading {
  opacity: 0.5;
  pointer-events: none;
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

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("上传失败");
  const data = await res.json();
  return data.url;
}

/**
 * Image paste + Markdown paste extension.
 * Uses editor.storage.markdownPaste to coordinate with the component:
 *   - uploading: number of in-flight uploads (>0 blocks external sync)
 *   - emitChange: callback set by the component to emit markdown onChange
 */
const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addStorage() {
    return {
      uploading: 0,
      emitChange: null as (() => void) | null,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste: (view, event) => {
            // Handle image paste (screenshot / copied image)
            const items = event.clipboardData?.items;
            if (items) {
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image/")) {
                  event.preventDefault();
                  const file = items[i].getAsFile();
                  if (!file) return true;

                  const placeholderSrc = URL.createObjectURL(file);
                  editor.storage.markdownPaste.uploading++;
                  editor.chain().focus().setImage({ src: placeholderSrc }).run();

                  uploadImage(file).then((url) => {
                    // Replace placeholder blob URL with the real OSS URL
                    const { state } = editor.view;
                    let found = false;
                    state.doc.descendants((node: PmNode, nodePos: number) => {
                      if (found) return false;
                      if (node.type.name === "image" && node.attrs.src === placeholderSrc) {
                        found = true;
                        const tr = state.tr.setNodeMarkup(nodePos, undefined, {
                          ...node.attrs,
                          src: url,
                        });
                        editor.view.dispatch(tr);
                      }
                    });
                  }).catch(() => {
                    // Remove only the placeholder image, not undo all changes
                    const { state } = editor.view;
                    state.doc.descendants((node: PmNode, nodePos: number) => {
                      if (node.type.name === "image" && node.attrs.src === placeholderSrc) {
                        const tr = editor.view.state.tr.delete(nodePos, nodePos + node.nodeSize);
                        editor.view.dispatch(tr);
                        return false;
                      }
                    });
                  }).finally(() => {
                    URL.revokeObjectURL(placeholderSrc);
                    editor.storage.markdownPaste.uploading--;
                    // After all uploads complete, emit the final clean markdown
                    if (editor.storage.markdownPaste.uploading <= 0) {
                      editor.storage.markdownPaste.uploading = 0;
                      editor.storage.markdownPaste.emitChange?.();
                    }
                  });
                  return true;
                }
              }
            }
            // Handle text paste as markdown
            const text = event.clipboardData?.getData("text/plain");
            if (!text?.trim()) return false;
            event.preventDefault();
            const htmlString = editor.storage.markdown.parser.parse(text);
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
  const lastInternalMd = useRef(content);

  // Track active block element for showing markdown hints
  const updateActiveBlock = useCallback((editorView: { dom: HTMLElement; state: { selection: { $from: { start: () => number } } }; domAtPos: (pos: number) => { node: Node } }) => {
    const dom = editorView.dom;
    dom.querySelectorAll(".md-active").forEach((el) => el.classList.remove("md-active"));
    try {
      const { $from } = editorView.state.selection;
      const startPos = $from.start();
      const resolved = editorView.domAtPos(startPos);
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
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
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
      // Block onChange during image upload to prevent blob URLs from
      // being saved to server and causing stale-data race conditions
      if (ed.storage.markdownPaste?.uploading > 0) return;
      const md = ed.storage.markdown.getMarkdown();
      lastInternalMd.current = md;
      onChangeRef.current(md);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      updateActiveBlock(ed.view);
    },
    onCreate: ({ editor: ed }) => {
      // Store emitChange callback so the module-scope extension can call it
      ed.storage.markdownPaste.emitChange = () => {
        const md = ed.storage.markdown.getMarkdown();
        lastInternalMd.current = md;
        onChangeRef.current(md);
      };
      updateActiveBlock(ed.view);
    },
  });

  // Sync content from outside — only when the change is truly external
  useEffect(() => {
    if (!editor) return;
    // Never reset during upload
    if (editor.storage.markdownPaste?.uploading > 0) return;
    // Skip if content matches what the editor last emitted
    if (content === lastInternalMd.current) return;
    isExternalUpdate.current = true;
    editor.commands.setContent(content || "");
    isExternalUpdate.current = false;
    lastInternalMd.current = content;
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
