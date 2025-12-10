const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  // REMOVED SYNC_CODE as it's deprecated by SYNC_FILES
  LEAVE: "leave",
  SEND_MESSAGE: "send-message",
  RECEIVE_MESSAGE: "receive-message",
  FILE_CHANGE: "file-change", // New action: Code content for a specific file changed
  FILE_SWITCH: "file-switch", // New action: User switched the active file
  SYNC_FILES: "sync-files", // New action: Synchronize all file contents/structure
};


module.exports = ACTIONS;