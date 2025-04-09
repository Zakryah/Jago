const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {}; // { roomCode: { players: [], deck, discardPile, gameState } }

const suits = ['H', 'D', 'C', 'S'];
const values = [1,2,3,4,5,6,7,8,9,10,'J','Q','K'];

function createDeck() {
  let deck = [];
  for (let suit of suits) {
    for (let val of values) {
      deck.push({ value: val, suit, revealed: false });
    }
  }
  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function dealCards(deck) {
  const hand = [];
  for (let i = 0; i < 6; i++) {
    hand.push({ ...deck.pop(), revealed: false });
  }
  return hand;
}

function getRoom(code) {
  if (!rooms[code]) {
    rooms[code] = { players: [], deck: [], discardPile: [], currentTurn: 0, started: false };
  }
  return rooms[code];
}

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', (nickname, callback) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const room = getRoom(code);
    room.players.push({ id: socket.id, name: nickname, hand: [], ready: false });
    socket.join(code);
    callback(code);
    io.to(code).emit('updatePlayers', room.players.map(p => p.name));
  });

  socket.on('joinRoom', (code, nickname, callback) => {
    const room = getRoom(code);
    if (room.players.length >= 4) return callback({ error: "Room full" });
    room.players.push({ id: socket.id, name: nickname, hand: [], ready: false });
    socket.join(code);
    callback({ success: true });
    io.to(code).emit('updatePlayers', room.players.map(p => p.name));
  });

  socket.on('startGame', code => {
    const room = rooms[code];
    if (!room || room.started) return;
    room.deck = createDeck();
    room.discardPile = [room.deck.pop()];
    room.started = true;

    room.players.forEach(p => {
      p.hand = dealCards(room.deck);
      p.peeks = 2;
      p.revealedIndices = [];
    });

    io.to(code).emit('gameStarted', {
      players: room.players.map(p => ({ name: p.name, hand: p.hand.map(() => null) })),
      discardTop: room.discardPile[room.discardPile.length - 1],
      currentTurn: room.currentTurn
    });

    room.players.forEach(p => {
      io.to(p.id).emit('yourCards', p.hand);
    });
  });

  socket.on('peekCard', (code, index) => {
    const room = rooms[code];
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.peeks <= 0 || player.hand[index].revealed) return;
    player.hand[index].revealed = true;
    player.peeks--;
    io.to(socket.id).emit('yourCards', player.hand);
  });

  // You'll need more events here for draw/replace/specials/golf/etc.

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        delete rooms[code];
      } else {
        io.to(code).emit('updatePlayers', room.players.map(p => p.name));
      }
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
