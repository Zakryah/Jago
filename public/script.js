// Replace with your Render backend URL:
const socket = io("https://jago-zsnx.onrender.com");

socket.on("connect", () => {
  console.log("Connected to server!", socket.id);

  // Example: Send a message to the server
  socket.emit("message", "Hello from frontend!");
});

// Example: Handle broadcast messages
socket.on("message", (msg) => {
  console.log("Received:", msg);
});
