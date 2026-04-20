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
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const md = editor.storage.markdown.getMarkdown();
      onChangeRef.current(md);
    },
  });

  // Force text color via direct DOM manipulation after editor mounts
  useEffect(() => {
    if (!editor) return;

    const el = editor.view.dom as HTMLElement;
    applyColors(el);

    // Watch for new nodes (e.g. when user types and new <p>/<h1> etc are created)
    const observer = new MutationObserver(() => applyColors(el));
    observer.observe(el, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [editor]);

  // Sync content from outside
  useEffect(() => {
    if (!editor) return;
    const currentMd = editor.storage.markdown.getMarkdown();
    if (currentMd !== content) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content || "");
      isExternalUpdate.current = false;
      // Re-apply colors after content change
      requestAnimationFrame(() => applyColors(editor.view.dom as HTMLElement));
    }
  }, [editor, content]);

  return (
    <div
      ref={wrapperRef}
      className={`rounded-sm border border-border bg-surface px-3 py-2 text-sm cursor-text ${className}`}
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

/** Directly set color on the editor element and ALL its children */
function applyColors(el: HTMLElement) {
  const isDark = document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#E8EAED" : "#1F2329";
  const mutedColor = isDark ? "#A1A5AB" : "#646A73";
  const linkColor = isDark ? "#4B83F2" : "#1456F0";
  const codeBg = isDark ? "#25282E" : "#F7F8FA";
  const borderColor = isDark ? "#35383E" : "#E4E6EB";

  // Root element
  el.style.color = textColor;
  el.style.outline = "none";
  el.style.minHeight = "120px";

  // All children
  el.querySelectorAll("*").forEach((child) => {
    const node = child as HTMLElement;
    const tag = node.tagName.toLowerCase();

    if (tag === "a") {
      node.style.color = linkColor;
      node.style.textDecoration = "underline";
    } else if (tag === "blockquote") {
      node.style.color = mutedColor;
      node.style.borderLeft = `3px solid ${borderColor}`;
      node.style.paddingLeft = "0.75rem";
      node.style.margin = "0.5rem 0";
    } else if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") {
      node.style.color = textColor;
      node.style.backgroundColor = codeBg;
      node.style.padding = "0.1rem 0.3rem";
      node.style.borderRadius = "4px";
      node.style.fontSize = "0.85em";
    } else if (tag === "pre") {
      node.style.color = textColor;
      node.style.backgroundColor = codeBg;
      node.style.padding = "0.75rem";
      node.style.borderRadius = "6px";
      node.style.margin = "0.5rem 0";
      node.style.overflowX = "auto";
    } else {
      node.style.color = textColor;
    }

    // Headings
    if (tag === "h1") {
      node.style.fontSize = "1.25rem";
      node.style.fontWeight = "600";
      node.style.margin = "0.75rem 0 0.5rem";
    } else if (tag === "h2") {
      node.style.fontSize = "1.1rem";
      node.style.fontWeight = "600";
      node.style.margin = "0.6rem 0 0.4rem";
    } else if (tag === "h3") {
      node.style.fontSize = "1rem";
      node.style.fontWeight = "600";
      node.style.margin = "0.5rem 0 0.3rem";
    }

    // Lists
    if (tag === "ul" || tag === "ol") {
      node.style.paddingLeft = "1.25rem";
      node.style.margin = "0.25rem 0";
    }

    // Strong
    if (tag === "strong") {
      node.style.fontWeight = "600";
    }

    // Paragraphs
    if (tag === "p") {
      node.style.margin = "0.25rem 0";
      // Placeholder
      if (node.classList.contains("is-editor-empty") && node.parentElement === el) {
        // Don't override placeholder color
      }
    }

    // HR
    if (tag === "hr") {
      node.style.borderColor = borderColor;
      node.style.margin = "0.75rem 0";
    }
  });
}
