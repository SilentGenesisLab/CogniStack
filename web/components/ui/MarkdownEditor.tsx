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
    editorProps: {
      attributes: {
        class: "cogni-editor",
        style: "color: #1F2329; outline: none; min-height: 120px;",
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const md = editor.storage.markdown.getMarkdown();
      onChangeRef.current(md);
    },
  });

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
      <style>{editorCSS}</style>
      <div
        className={`rounded-sm border border-border bg-surface px-3 py-2 text-sm cursor-text ${className}`}
        style={{ color: "#1F2329" }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

/* Inline CSS string — guaranteed to load with the component */
const editorCSS = `
.cogni-editor,
.cogni-editor * {
  color: #1F2329 !important;
}
.dark .cogni-editor,
.dark .cogni-editor * {
  color: #E8EAED !important;
}

.cogni-editor h1 {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  margin: 0.75rem 0 0.5rem !important;
}
.cogni-editor h2 {
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  margin: 0.6rem 0 0.4rem !important;
}
.cogni-editor h3 {
  font-size: 1rem !important;
  font-weight: 600 !important;
  margin: 0.5rem 0 0.3rem !important;
}

.cogni-editor p {
  margin: 0.25rem 0;
}

.cogni-editor ul,
.cogni-editor ol {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}

.cogni-editor blockquote {
  border-left: 3px solid #E4E6EB;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
}
.cogni-editor blockquote,
.cogni-editor blockquote * {
  color: #646A73 !important;
}
.dark .cogni-editor blockquote,
.dark .cogni-editor blockquote * {
  color: #A1A5AB !important;
  border-left-color: #35383E;
}

.cogni-editor code {
  background: #F7F8FA !important;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.85em;
}
.dark .cogni-editor code {
  background: #25282E !important;
}

.cogni-editor pre {
  background: #F7F8FA !important;
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.dark .cogni-editor pre {
  background: #25282E !important;
}
.cogni-editor pre code {
  background: none !important;
  padding: 0;
}

.cogni-editor a {
  color: #1456F0 !important;
  text-decoration: underline;
}
.dark .cogni-editor a {
  color: #4B83F2 !important;
}

.cogni-editor hr {
  border-color: #E4E6EB;
  margin: 0.75rem 0;
}
.dark .cogni-editor hr {
  border-color: #35383E;
}

/* Placeholder */
.cogni-editor p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #8F959E !important;
  pointer-events: none;
  height: 0;
}
`;
