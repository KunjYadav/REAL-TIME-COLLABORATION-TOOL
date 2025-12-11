import { io } from "socket.io-client";


export const initSocket = async () => {
  const options = {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ["websocket", "polling"],
    // CRITICAL FIX: Specify the path to match the Vercel routing
    path: "/socket.io/",
  };
  
  // CRITICAL FIX: Determine the backend URL
  let backendUrl;
  
  if (process.env.NODE_ENV === "production") {
    // In production (Vercel), the backend is hosted at the same domain.
    // We connect to the root URL, and Vercel will handle routing it to the serverless function.
    backendUrl = window.location.origin;
  } else {
    // Use REACT_APP_BACKEND_URL for local development
    backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  }


  return io(backendUrl, options);
};