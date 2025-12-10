/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import Client from "../components/Client";
import Editor from "../components/Editor";
import Chat from "../components/Chat"; // Re-include Chat
import FileStructure from "../components/FileStructure";
import Logo from "../components/Logo";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
// import ACTIONS from "../Actions"; // FIX: Import ACTIONS

const EditorPage = () => {
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  // codeRef now stores the content of the currently active file
  const codeRef = useRef(null);
  const username = location.state?.username;

  const socketRef = useRef(null);

  // New File State Management
  const [files, setFiles] = useState({});
  const [activeFileId, setActiveFileId] = useState("");
  const [language, setLanguage] = useState("javascript");

  // CRITICAL FIX: Refs for latest state values in callbacks
  const activeFileIdRef = useRef(activeFileId);
  const filesRef = useRef(files);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  // END CRITICAL FIX

  // Effect to update codeRef and language when activeFileId or file content changes
  useEffect(() => {
    if (activeFileId && files[activeFileId]) {
      const { content, language } = files[activeFileId];
      console.log("[EditorPage] files effect - active file content:", {
        activeFileId,
        contentLength: content ? content.length : 0,
        language,
      });
      codeRef.current = content; // Keep the ref updated with the content of the new file
      setLanguage(language);

      // The Editor component will pick up the content change via its `code` prop.
    } else if (Object.keys(files).length > 0 && !activeFileId) {
      // FIX: If files are loaded but activeFileId is not set (e.g., initial state sync)
      // This should ideally be handled by SYNC_FILES, but this is a fallback.
      const firstFileId = Object.keys(files)[0];
      setActiveFileId(firstFileId);
    }
  }, [activeFileId, files]);

  // Local handler to update code content of the active file
  const onCodeChangeLocal = useCallback(
    (code) => {
      const currentActiveFileId = activeFileIdRef.current;

      codeRef.current = code;

      setFiles((prev) => {
        if (prev[currentActiveFileId]) {
          // CRITICAL FIX: Ensure remoteUpdated is cleared on local change
          return {
            ...prev,
            [currentActiveFileId]: {
              ...prev[currentActiveFileId],
              content: code,
              remoteUpdated: false, // Clear the indicator on local edit
            },
          };
        }
        return prev;
      });
    },
    [] // NO dependencies - uses activeFileIdRef.current
  );

  // Remote file synchronization handler (from useSocket)
  const onFileUpdate = useCallback(
    (fileId, code, allFiles = null, newActiveFileId = null) => {
      console.log("[EditorPage] onFileUpdate called:", {
        fileId,
        codeLength: code ? code.length : null,
        isSyncEvent: !!allFiles,
        newActiveFileId,
        currentActiveFileId: activeFileIdRef.current,
      });

      // Handle full state synchronization on join (triggered by ACTIONS.SYNC_FILES from server)
      if (allFiles && newActiveFileId) {
        console.log(
          "[EditorPage] Full sync event - setting all files and activeFileId"
        );
        setFiles(allFiles);
        setActiveFileId(newActiveFileId);
        return;
      }

      // Handle remote code change for a specific file (ACTIONS.CODE_CHANGE)
      if (code !== undefined && code !== null) {
        setFiles((prev) => {
          const existing = prev[fileId] || {};
          // CRITICAL FIX: Check if the receiving client's active file is NOT the one being updated
          const isRemoteUpdateIndicatorNeeded =
            fileId !== activeFileIdRef.current;

          const newFiles = {
            ...prev,
            [fileId]: {
              ...existing,
              language: existing.language || "javascript",
              content: code,
              // Only set/keep the indicator if it's not the active file, otherwise clear it.
              remoteUpdated: isRemoteUpdateIndicatorNeeded,
            },
          };

          return newFiles;
        });
      }

      // Handle remote file switch (ACTIONS.FILE_SWITCH)
      if (newActiveFileId) {
        // Only proceed if the new ID is different or if it's a forced switch to the same file
        if (newActiveFileId !== activeFileIdRef.current) {
          console.log(
            "[EditorPage] Remote/Forced file switch to:",
            newActiveFileId
          );

          // Update files state to clear the remoteUpdated flag for the new active file
          setFiles((prev) => {
            if (prev[newActiveFileId]) {
              return {
                ...prev,
                [newActiveFileId]: {
                  ...prev[newActiveFileId],
                  // CRITICAL FIX: Ensure the remoteUpdated flag is cleared when switching TO this file
                  remoteUpdated: false,
                },
              };
            }
            return prev;
          });

          setActiveFileId(newActiveFileId);
        }
      }
    },
    [] // NO dependencies - use refs for state access
  );

  // Use the custom hook, passing the ref to be initialized within the hook
  const { clients, messages, sendMessage, emitCodeChange, emitFileSwitch } =
    useSocket(roomId, username, onFileUpdate, socketRef);

  // Handler for local file structure click
  const handleFileSelect = useCallback(
    (fileId) => {
      // The socket event will trigger the setActiveFileId via the server bounce-back (onFileUpdate)
      emitFileSwitch(fileId);
    },
    [emitFileSwitch]
  );

  // ... (copyRoomId, leaveRoom, saveCode functions remain the same)
  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied!");
    } catch (err) {
      toast.error("Could not copy the Room ID");
      console.error(err);
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  function saveCode() {
    if (!codeRef.current) {
      toast.error("Editor is empty, nothing to save.");
      return;
    }

    const fileExtensions = {
      javascript: "js",
      html: "html",
      css: "css",
      python: "py",
    };

    const fileInfo = filesRef.current[activeFileIdRef.current]; // Use ref for latest info
    const extension =
      fileInfo && fileInfo.language ? fileExtensions[fileInfo.language] : "txt";
    // NOTE: If activeFileId is an empty string, this might fail, but it should be set by now.
    const filename = `${activeFileIdRef.current.split(".")[0]}.${extension}`;

    const blob = new Blob([codeRef.current], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`File saved as ${filename}`);
  }

  if (!location.state) {
    return <Navigate to='/' />;
  }

  // Determine the content to display in the editor
  const editorContent =
    activeFileId && files[activeFileId] ? files[activeFileId].content : "";

  return (
    <div className='mainWrap'>
      {/* 1. ASIDE - Sidebar for file structure and clients */}
      <div className='aside'>
        <div className='logo'>
          <Logo size='30px' />
        </div>
        <div className='asideInner'>
          <h3 className='asideTitle'>Explorer</h3>

          <FileStructure
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
          />

          <h3 className='asideTitle clientsHeader'>
            Connected Users ({clients.length})
          </h3>
          <div className='clientsList'>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>

        {/* Floating Controls at the bottom of the sidebar */}
        <div className='controls'>
          <button
            className='btn iconBtn saveBtn'
            onClick={saveCode}
            title='Save Active File (Ctrl+S)'
          >
            <span>&#x1F4BE;</span> Save
          </button>
          <button
            className='btn iconBtn copyBtn'
            onClick={copyRoomId}
            title='Copy Room ID'
          >
            <span>&#x2398;</span> Invite
          </button>
          <button
            className='btn iconBtn leaveBtn'
            onClick={leaveRoom}
            title='Leave Room'
          >
            <span>&#x2716;</span> Leave
          </button>
        </div>
      </div>

      {/* 2. EDITOR AREA */}
      <div className='editorWrap'>
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          activeFileId={activeFileId}
          onCodeChange={(code) => {
            onCodeChangeLocal(code);
            emitCodeChange(code, activeFileIdRef.current);
          }}
          language={language}
          code={editorContent}
        />
      </div>

      {/* 3. CHAT PANEL */}
      <div className='chatPanelWrap'>
        <Chat
          messages={messages}
          sendMessage={sendMessage}
          username={username}
        />
      </div>
    </div>
  );
};

export default EditorPage;
