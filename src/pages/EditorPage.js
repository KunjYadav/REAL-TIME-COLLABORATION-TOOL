/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import Client from "../components/Client";
import Editor from "../components/Editor";
import Chat from "../components/Chat";
import FileStructure from "../components/FileStructure";
import Logo from "../components/Logo";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";
import { useSocket } from "../hooks/useSocket";

// Component for Mobile Toggle Button
const MobilePanelToggle = ({ label, icon, onClick, active }) => (
  <button
    className={`btn iconBtn ${active ? "active-mobile-btn" : ""}`}
    onClick={onClick}
  >
    <span role='img' aria-label={label}>
      {icon}
    </span>
  </button>
);

// Component for Mobile Action Button (Save/Copy/Leave)
const MobilePanelAction = ({ label, icon, onClick, colorClass }) => (
  <button
    className={`btn iconBtn ${colorClass}`}
    onClick={onClick}
    title={label}
  >
    <span role='img' aria-label={label}>
      {icon}
    </span>
  </button>
);

const EditorPage = () => {
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const codeRef = useRef(null);
  const username = location.state?.username;

  const socketRef = useRef(null);

  // File State Management
  const [files, setFiles] = useState({});
  const [activeFileId, setActiveFileId] = useState("");
  const [language, setLanguage] = useState("javascript");

  // Mobile Responsiveness State
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Refs for latest state values in callbacks
  const activeFileIdRef = useRef(activeFileId);
  const filesRef = useRef(files);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Effect to update codeRef and language when activeFileId or file content changes
  useEffect(() => {
    if (activeFileId && files[activeFileId]) {
      const { content, language } = files[activeFileId];
      codeRef.current = content;
      setLanguage(language);
    } else if (Object.keys(files).length > 0 && !activeFileId) {
      const firstFileId = Object.keys(files)[0];
      setActiveFileId(firstFileId);
    }
  }, [activeFileId, files]);

  // Local handler to update code content of the active file
  const onCodeChangeLocal = useCallback((code) => {
    const currentActiveFileId = activeFileIdRef.current;
    codeRef.current = code;

    setFiles((prev) => {
      if (prev[currentActiveFileId]) {
        return {
          ...prev,
          [currentActiveFileId]: {
            ...prev[currentActiveFileId],
            content: code,
            remoteUpdated: false,
          },
        };
      }
      return prev;
    });
  }, []);

  // Remote file synchronization handler
  const onFileUpdate = useCallback(
    (fileId, code, allFiles = null, newActiveFileId = null) => {
      if (allFiles && newActiveFileId) {
        setFiles(allFiles);
        setActiveFileId(newActiveFileId);
        return;
      }

      if (code !== undefined && code !== null) {
        setFiles((prev) => {
          const existing = prev[fileId] || {};
          const isRemoteUpdateIndicatorNeeded =
            fileId !== activeFileIdRef.current;

          return {
            ...prev,
            [fileId]: {
              ...existing,
              language: existing.language || "javascript",
              content: code,
              remoteUpdated: isRemoteUpdateIndicatorNeeded,
            },
          };
        });
      }

      if (newActiveFileId) {
        if (newActiveFileId !== activeFileIdRef.current) {
          setFiles((prev) => {
            if (prev[newActiveFileId]) {
              return {
                ...prev,
                [newActiveFileId]: {
                  ...prev[newActiveFileId],
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
    [],
  );

  const { clients, messages, sendMessage, emitCodeChange, emitFileSwitch } =
    useSocket(roomId, username, onFileUpdate, socketRef);

  const handleFileSelect = useCallback(
    (fileId) => {
      emitFileSwitch(fileId);
      setShowSidebar(false);
    },
    [emitFileSwitch],
  );

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

    const fileInfo = filesRef.current[activeFileIdRef.current];
    const extension =
      fileInfo && fileInfo.language ? fileExtensions[fileInfo.language] : "txt";
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

  const editorContent =
    activeFileId && files[activeFileId] ? files[activeFileId].content : "";

  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
    if (showChat) setShowChat(false);
  };

  const toggleChat = () => {
    setShowChat((prev) => !prev);
    if (showSidebar) setShowSidebar(false);
  };

  const closePanels = () => {
    setShowSidebar(false);
    setShowChat(false);
  };

  return (
    <div className='mainWrap'>
      <div
        className={`mobile-backdrop ${showSidebar || showChat ? "show-backdrop" : ""}`}
        onClick={closePanels}
      ></div>

      {/* 1. ASIDE - Sidebar for file structure and clients */}
      <div className={`aside ${showSidebar ? "show-panel" : ""}`}>
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
      </div>

      {/* 2. EDITOR AREA */}
      <div className='editorWrap'>
        {/* Mobile Controls Bar */}
        <div className='mobileControls'>
          <div className='mobileLeft'>
            <MobilePanelToggle
              label='Files'
              icon='&#x1F4C1;'
              onClick={toggleSidebar}
              active={showSidebar}
            />
          </div>

          <div className='mobileCenter' title={activeFileId}>
            {activeFileId || "Select a File"}
          </div>

          <div className='mobileRight'>
            <MobilePanelAction
              label='Save'
              icon='&#x1F4BE;'
              onClick={saveCode}
              colorClass='saveBtn'
            />
            <MobilePanelAction
              label='Invite'
              icon='&#x27A1;'
              onClick={copyRoomId}
              colorClass='copyBtn'
            />
            <MobilePanelToggle
              label='Chat'
              icon='&#x1F4AC;'
              onClick={toggleChat}
              active={showChat}
            />
          </div>
        </div>

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

        {/* FLOATING CONTROLS (Desktop Only) */}
        <div className='controls'>
          <button
            className='btn iconBtn saveBtn'
            onClick={saveCode}
            title='Save Active File'
          >
            <span>&#x1F4BE;</span> Save
          </button>
          <button
            className='btn iconBtn copyBtn'
            onClick={copyRoomId}
            title='Copy Room ID'
          >
            <span>&#x27A1;</span> Invite
          </button>
          <button
            className='btn iconBtn leaveBtn'
            onClick={leaveRoom}
            title='Leave Room'
          >
            <span>&#x274C;</span> Leave
          </button>
        </div>
      </div>

      {/* 3. CHAT PANEL */}
      <div className={`chatPanelWrap ${showChat ? "show-panel" : ""}`}>
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
