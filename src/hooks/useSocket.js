import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { initSocket } from "../socket";
import ACTIONS from "../Actions";

/**
 * Custom hook to handle all socket communication logic.
 * @param {string} roomId - The room ID to join.
 * @param {string} username - The username of the current user.
 * @param {function} onFileUpdate - Callback to handle remote file structure and code updates.
 * @param {object} socketRef - The external ref object to be initialized.
 */
export const useSocket = (
  roomId,
  username,
  // FIX: Removed onCodeSync argument as server now handles initial state sync.
  onFileUpdate,
  socketRef
) => {
  // const socketRef = useRef(null); // <-- REMOVED: Now passed from parent
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);

  // Function to connect and set up socket listeners
  // NOTE: Dependencies for connect must be carefully managed to avoid re-running the effect constantly.
  const connect = useCallback(async () => {
    // FIX 1: Assign socket instance to the passed-in ref
    socketRef.current = await initSocket();

    const handleErrors = (e) => {
      console.log("socket error", e);
      toast.error("Socket connection failed, try again later.");
      reactNavigator("/");
    };

    socketRef.current.on("connect_error", handleErrors);
    socketRef.current.on("connect_failed", handleErrors);

    // Emit JOIN action
    socketRef.current.emit(ACTIONS.JOIN, {
      roomId,
      username,
    });

    // Listening for JOINED event
    socketRef.current.on(
      ACTIONS.JOINED,
      ({ clients: newClients, username: joinedUsername, socketId }) => {
        if (joinedUsername !== username) {
          toast.success(`${joinedUsername} joined the room.`);
          console.log(`${joinedUsername} joined`);
        }
        setClients(newClients);

        // Sync code from the latest client
        // FIX: Removed redundant onCodeSync call as the server now handles the sync after JOINED
      }
    );

    // Listening for DISCONNECTED event
    socketRef.current.on(
      ACTIONS.DISCONNECTED,
      ({ socketId, username: leftUsername }) => {
        toast.success(`${leftUsername} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      }
    );

    // Listening for CODE_CHANGE event
    socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code, fileId, senderId }) => {
      // DEBUG: Log incoming code change for easier debugging
      try {
        console.log("useSocket: CODE_CHANGE received", {
          fileId,
          senderId,
          codePreview: code ? code.slice(0, 80) : null,
        });
      } catch (e) {
        console.log("useSocket: CODE_CHANGE (preview failed)");
      }

      // FIX: Only process remote changes to avoid re-triggering CodeMirror updates for the local user.
      if (senderId !== socketRef.current.id) {
        if (onFileUpdate) {
          // Pass the fileId and code
          onFileUpdate(fileId, code);
        }
      }
    });

    // Listening for SYNC_FILES event (full state sync)
    socketRef.current.on(ACTIONS.SYNC_FILES, ({ files, activeFileId }) => {
      if (onFileUpdate) {
        // Use a specific internal function to handle the full sync
        // Pass the initial content of the active file, along with all files and activeFileId
        onFileUpdate(
          activeFileId,
          files[activeFileId]?.content, // Added optional chaining for safety
          files,
          activeFileId
        );
      }
    });

    // Listening for FILE_SWITCH event
    socketRef.current.on(ACTIONS.FILE_SWITCH, ({ fileId }) => {
      if (onFileUpdate) {
        // Pass null for code/files but pass the new fileId as newActiveFileId
        // EditorPage will handle loading the content from its internal files state.
        onFileUpdate(fileId, null, null, fileId);
      }
    });

    // Listening for RECEIVE_MESSAGE event
    socketRef.current.on(
      ACTIONS.RECEIVE_MESSAGE,
      ({ message, username: senderUsername, socketId }) => {
        // FIX: Removed redundant check. The server uses socket.in(roomId).emit() which excludes the sender.

        setMessages((prevMessages) => [
          ...prevMessages,
          {
            message,
            username: senderUsername,
            socketId,
            isLocal: false,
          },
        ]);
      }
    );
  }, [roomId, username, reactNavigator, onFileUpdate, socketRef]); // FIX: Removed onCodeSync from dependencies

  useEffect(() => {
    connect();

    return () => {
      // FIX 3: Robust cleanup. Ensure disconnect is called if socketRef exists.
      const socket = socketRef.current;
      if (socket) {
        socket.disconnect();
        // It's good practice to turn off all listeners
        socket.off("connect_error");
        socket.off("connect_failed");
        socket.off(ACTIONS.JOINED);
        socket.off(ACTIONS.DISCONNECTED);
        socket.off(ACTIONS.CODE_CHANGE);
        socket.off(ACTIONS.RECEIVE_MESSAGE);
        socket.off(ACTIONS.SYNC_FILES);
        // Removed: socket.off(ACTIONS.SYNC_CODE);
        socket.off(ACTIONS.FILE_SWITCH);
        // Clear the ref to prevent stale references in subsequent renders if needed
        // socketRef.current = null;
      }
    };
  }, [connect, socketRef]);

  // ... (rest of the component logic remains the same)

  // Function to send code changes
  const emitCodeChange = useCallback(
    (code, fileId) => {
      if (socketRef.current && socketRef.current.connected) {
        // Check connection state
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code,
          fileId,
        });

        // FIX: Removed local state update here. The sender already updates their state
        // in EditorPage.js's onCodeChangeLocal before calling emitCodeChange.
      }
    },
    [roomId, socketRef] // Removed onFileUpdate dependency
  );

  // Function to emit file switch
  const emitFileSwitch = useCallback(
    (fileId) => {
      if (socketRef.current && socketRef.current.connected) {
        // Check connection state
        socketRef.current.emit(ACTIONS.FILE_SWITCH, {
          roomId,
          fileId,
        });
      }
    },
    [roomId, socketRef]
  );

  // Function to send a chat message
  const sendMessage = useCallback(
    (message) => {
      if (socketRef.current && socketRef.current.connected) {
        // Check connection state
        const localMessage = {
          message,
          username,
          // FIX: Add local socketId for accurate local message display/ID for consistency
          socketId: socketRef.current.id,
          isLocal: true,
        };
        // CRITICAL FIX: The local user should add their message to state *before* emitting,
        // and mark it as local. It should *not* rely on the server bouncing it back.
        setMessages((prevMessages) => [...prevMessages, localMessage]);

        socketRef.current.emit(ACTIONS.SEND_MESSAGE, {
          roomId,
          message,
        });
      }
    },
    [roomId, username, socketRef]
  );

  return {
    clients,
    messages,
    sendMessage,
    emitCodeChange,
    emitFileSwitch,
  };
};
