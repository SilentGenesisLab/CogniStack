"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Editor styles as a global <style> tag.
 * Uses [data-cogni-editor] attribute selector for maximum specificity.
 */
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
[data-cogni-editor][contenteditable] span {
  color: #1F2329 !important;
  -webkit-text-fill-color: #1F2329 !important;
}

.dark [data-cogni-editor][contenteditable],
.dark [data-cogni-editor][contenteditable] p,
.dark [data-cogni-editor][contenteditable] h1,
.dark [data-cogni-editor][contenteditable] h2,
.dark [data-cogni-editor][contenteditable] h3,
.dark [data-cogni-editor][contenteditable] li,
.dark [data-cogni-editor][contenteditable] ul,
.dark [data-cogni-editor][contenteditable] ol,
.dark [data-cogni-editor][contenteditable] strong,
.dark [data-cogni-editor][contenteditable] em,
.dark [data-cogni-editor][contenteditable] span {
  color: #E8EAED !important;
  -webkit-text-fill-color: #E8EAED !important;
}

[data-cogni-editor][contenteditable] a {
  color: #1456F0 !important;
  -webkit-text-fill-color: #1456F0 !important;
  text-decoration: underline;
}

[data-cogni-editor][contenteditable] blockquote,
[data-cogni-editor][contenteditable] blockquote * {
  color: #646A73 !important;
  -webkit-text-fill-color: #646A73 !important;
  border-left: 3px solid #E4E6EB;
  padding-left: 0.75rem;
}

[data-cogni-editor][contenteditable] code {
  background: #F7F8FA;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.85em;
}
[data-cogni-editor][contenteditable] pre {
  background: #F7F8FA;
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
[data-cogni-editor][contenteditable] ul,
[data-cogni-editor][contenteditable] ol { padding-left: 1.25rem; margin: 0.25rem 0; }
[data-cogni-editor][contenteditable] strong { font-weight: 600; }
[data-cogni-editor][contenteditable] hr { border-color: #E4E6EB; margin: 0.75rem 0; }

[data-cogni-editor][contenteditable] {
  outline: none;
  min-height: 120px;
}

/* Placeholder */
[data-cogni-editor] p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #8F959E !important;
  -webkit-text-fill-color: #8F959E !important;
  pointer-events: none;
  height: 0;
}
`;

export function MarkdownEditor({
  content,
  onChange,
  placeholder = "添加描述...",
  className = "",
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isExternalUpdate = useRef(false);

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
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    injectCSS: false, // Disable tiptap's default CSS injection
    editorProps: {
      attributes: {
        "data-cogni-editor": "true",
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const md = editor.storage.markdown.getMarkdown();
      onChangeRef.current(md);
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
        className={`rounded-sm border border-border bg-surface px-3 py-2 text-sm cursor-text ${className}`}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
