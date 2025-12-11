const express = require("express");
const app = express();
const http = require("http");
// const path = require("path"); // Removed as it's no longer needed for static serving
const { Server } = require("socket.io");
const ACTIONS = require("../src/Actions");
const cors = require("cors");

// 1. Initialize HTTP server with Express app
const server = http.createServer(app);

// Apply CORS middleware to the Express app itself for any other requests
// For Vercel, this is usually needed for API endpoints.
app.use(cors());

// --- Socket.IO Configuration ---
// 2. Initialize Socket.IO server by passing the HTTP server
// CRITICAL FIX: The path must be specified to match the vercel.json route
const io = new Server(server, {
  path: "/socket.io/", // Specify the path for Socket.IO connections
  // Allow all origins for the deployment setup (Vercel domain vs local)
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// REMOVED: Production Setup for Serving Frontend (Vercel static build handles this now)
/*
app.use(express.static("build"));
app.use((req, res, next) => {
  if (!req.path.includes('.')) {
    res.sendFile(path.join(__dirname, "../build", "index.html"));
  } else {
    next();
  }
});
*/
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
            content: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>",
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

// CRITICAL FIX: Add a simple GET route for the serverless function.
// This is not strictly required but can help with Vercel's readiness checks.
app.get('/', (req, res) => {
    res.send('Realtime Editor API is running.');
});


// 3. START the HTTP server listening on the port provided by the hosting platform
// NOTE: Vercel serverless functions handle the listening internally, 
// but we keep the listener for local development compatibility.
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));