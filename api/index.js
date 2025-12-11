const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("../src/Actions");
const cors = require("cors");

// 1. Initialize HTTP server with Express app
// This is still needed for local development and for Vercel to *potentially* handle the socket upgrade,
// though long-lived socket connections are not officially supported on Vercel's serverless tier.
const server = http.createServer(app);

// 2. Initialize Socket.IO server by passing the HTTP server
const io = new Server(server, {
  // Allow all origins for the Vercel deployment setup
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

// --- Vercel Production/Build Setup ---
// Serve the static files from the build folder for the root path
app.use(express.static("build"));

// For any request that is not a static file, serve the index.html from the build folder
// This handles client-side routing.
app.use((req, res, next) => {
  // Only apply for requests not starting with /api and not requesting a static asset (file extension present)
  if (!req.path.startsWith("/api") && !req.path.includes(".")) {
    res.sendFile(path.join(__dirname, "../build", "index.html"));
  } else {
    next();
  }
});
// ------------------------------------

const userSocketMap = {};

// New structure to store room state: { roomId: { files: {}, activeFileId: '' } }
const roomStateMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);

    if (!roomStateMap[roomId]) {
      roomStateMap[roomId] = {
        files: {
          "index.js": {
            content: "// Start coding here (JavaScript)",
            language: "javascript",
          },
          "style.css": {
            content: "/* Add your styles here (CSS) */",
            language: "css",
          },
          "index.html": {
            content:
              "<!DOCTYPE html>\n<html>\n<head>\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>",
            language: "html",
          },
          "index.py": {
            content: "# Start coding here (Python)",
            language: "python",
          },
        },
        activeFileId: "index.js",
      };
    }

    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });

    io.to(socket.id).emit(ACTIONS.SYNC_FILES, roomStateMap[roomId]);
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, fileId }) => {
    if (
      roomStateMap[roomId] &&
      roomStateMap[roomId].files &&
      roomStateMap[roomId].files[fileId]
    ) {
      roomStateMap[roomId].files[fileId].content = code;

      socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {
        code,
        fileId,
        senderId: socket.id,
      });
    }
  });

  socket.on(ACTIONS.FILE_SWITCH, ({ roomId, fileId }) => {
    if (roomStateMap[roomId]) {
      roomStateMap[roomId].activeFileId = fileId;
    }
    io.to(roomId).emit(ACTIONS.FILE_SWITCH, { fileId });
  });

  socket.on(ACTIONS.SEND_MESSAGE, ({ roomId, message }) => {
    const username = userSocketMap[socket.id];
    socket.in(roomId).emit(ACTIONS.RECEIVE_MESSAGE, {
      message,
      username,
      socketId: socket.id,
    });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

// 3. EXPORT the Express app instance for Vercel
// Vercel will wrap this instance in a Serverless Function wrapper.
// Only listen on the server for local development, not for Vercel.
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
}

// Export the Express app instance for Vercel Serverless Function to use
module.exports = app;
