const socket = io("https://your-render-url.onrender.com");

const loginDiv = document.getElementById("login");
const gameDiv = document.getElementById("game");
const joinBtn = document.getElementById("joinBtn");
const nameInput = document.getElementById("playerName");
const statusText = document.getElementById("status");

joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Please enter a name");

  socket.emit("joinGame", name);
  loginDiv.style.display = "none";
  gameDiv.style.display = "block";
  statusText.textContent = "Waiting for other players...";
});

socket.on("gameStart", (players) => {
  statusText.textContent = `Game started! Players: ${players.join(", ")}`;
});
