/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/monokai.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/xml/xml"; // For HTML
import "codemirror/mode/css/css"; // For CSS
import "codemirror/mode/python/python"; // For Python
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";

// Note: `activeFileId` is the new prop used to check context
const Editor = ({ socketRef, onCodeChange, language, code, activeFileId }) => {
  const editorRef = useRef(null);
  const isInitialized = useRef(false); // New ref to track initialization
  // lastCodeRef tracks the content that was last set to the CodeMirror instance
  const lastCodeRef = useRef(code);
  const lastActiveFileIdRef = useRef(activeFileId);

  // Initialization useEffect: Runs once on mount to create the instance
  useEffect(() => {
    async function init() {
      if (!editorRef.current) {
        editorRef.current = Codemirror.fromTextArea(
          document.getElementById("realtimeEditor"),
          {
            mode: { name: "javascript", json: true }, // Default mode
            theme: "monokai",
            autoCloseTags: true,
            autoCloseBrackets: true,
            lineNumbers: true,
          }
        );
        isInitialized.current = true;

        // Handle local changes
        editorRef.current.on("change", (instance, changes) => {
          const { origin } = changes;
          const currentCode = instance.getValue();

          // Only emit if the change originated from the user, not from socket updates ('setValue')
          if (origin !== "setValue") {
            // CRITICAL FIX: Also check if the code has actually changed before calling onCodeChange
            // This prevents triggering socket events if an internal CodeMirror action (like 'setCursor')
            // somehow triggers a change event with a null origin but no content change.
            if (currentCode !== lastCodeRef.current) {
              lastCodeRef.current = currentCode; // Update the reference for comparison
              onCodeChange(currentCode);
            }
          }
        });

        // Set initial content if available (for initial render before socket sync)
        if (code !== undefined && code !== null) {
          editorRef.current.setValue(code);
          lastCodeRef.current = code;
        }
      }
    }
    init();
  }, []); // Runs once on mount

  // Effect to update the CodeMirror mode when the language prop changes
  useEffect(() => {
    if (editorRef.current) {
      // Mapping the human-readable language to Codemirror mode string
      const modeMap = {
        javascript: { name: "javascript", json: true },
        html: "xml",
        css: "css",
        python: "python",
      };
      const mode = modeMap[language] || { name: "javascript", json: true }; // Default to JavaScript
      editorRef.current.setOption("mode", mode);

      // Force a refresh when language/mode changes to ensure the editor correctly lays out
      setTimeout(() => {
        editorRef.current.refresh();
      }, 0);
    }
  }, [language]);

  // Effect to handle external code updates (Initial load, Sync, or File Switch)
  // This effect ensures the editor's content matches the 'code' prop from React state.
  useEffect(() => {
    if (!editorRef.current) return;

    const currentEditorContent = editorRef.current.getValue();
    const isCodeContentDifferent = currentEditorContent !== code;
    const isFileContextDifferent = lastActiveFileIdRef.current !== activeFileId;

    // Condition to update:
    // 1. If the code prop is different from the editor's current content (remote update).
    // 2. If the file context changed (file switch), even if content is identical.
    if (
      (isCodeContentDifferent || isFileContextDifferent) &&
      code !== undefined &&
      code !== null
    ) {
      console.log("[Editor] Forcing CodeMirror content update.", {
        activeFileId,
        isCodeContentDifferent,
        isFileContextDifferent,
      });

      // Set the code content. 'setValue' is the origin used to identify remote updates.
      // This is necessary because 'code' updates on remote changes OR file switches.
      editorRef.current.setValue(code);

      // Update our internal reference to match the new content
      lastCodeRef.current = code;
      lastActiveFileIdRef.current = activeFileId;

      // Crucial for CodeMirror layout and ensuring cursor is visible on switch
      editorRef.current.refresh();
      editorRef.current.setCursor(0, 0); // Reset cursor to start on content load/switch
    }
  }, [code, activeFileId]); // Dependencies: Code content and the active file context

  return <textarea id='realtimeEditor'></textarea>;
};

export default Editor;
