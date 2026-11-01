const crypto = require('node:crypto');
const http = require('node:http');
const { Chess } = require('chess.js');
const { WebSocketServer, WebSocket } = require('ws');

const port = Number(process.env.OPENBOARD_PORT || process.env.PORT || 3001);
const rooms = new Map();
const roomLifetimeMs = 30 * 60 * 1000;
const allowedOrigins = (process.env.OPENBOARD_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || !allowedOrigins.length) return true;
  return allowedOrigins.some((allowedOrigin) => {
    if (!allowedOrigin.includes('*')) return origin === allowedOrigin;
    const [prefix, suffix] = allowedOrigin.split('*');
    return origin.startsWith(prefix)
      && origin.endsWith(suffix)
      && origin.length > prefix.length + suffix.length;
  });
}

function send(socket, payload) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function normalizeName(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const name = value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 24);
  return name || fallback;
}

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from(crypto.randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join('');
  } while (rooms.has(code));
  return code;
}

function getPublicRooms() {
  const now = Date.now();
  return [...rooms.values()]
    .filter((room) => room.isPublic && room.expiresAt > now
      && room.players.w.socket?.readyState === WebSocket.OPEN
      && (!room.players.b.socket || room.players.b.socket.readyState !== WebSocket.OPEN))
    .map((room) => ({ code: room.code, name: room.players.w.name }));
}

function broadcast(room, payload) {
  for (const player of Object.values(room.players)) send(player.socket, payload);
}

function leaveRoom(player) {
  if (!player?.room) return;
  const room = player.room;
  const slot = room.players[player.color];
  if (slot?.socket === player.socket) slot.socket = null;
  player.room = null;
  if (room.players.w.socket || room.players.b.socket) {
    broadcast(room, { type: 'opponent-left' });
  } else {
    room.expiresAt = Date.now() + roomLifetimeMs;
  }
}

function handleMessage(socket, player, rawMessage) {
  if (typeof rawMessage !== 'string' || rawMessage.length > 2048) {
    send(socket, { type: 'error', message: 'Message was too large.' });
    return;
  }

  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch {
    send(socket, { type: 'error', message: 'Invalid message format.' });
    return;
  }
  if (!message || typeof message.type !== 'string') {
    send(socket, { type: 'error', message: 'Invalid message format.' });
    return;
  }

  if (message.type === 'list-public-rooms') {
    send(socket, { type: 'public-rooms', rooms: getPublicRooms() });
    return;
  }

  if (message.type === 'create-room' || message.type === 'create-public-room') {
    if (player.room) leaveRoom(player);
    const code = generateRoomCode();
    const room = {
      code,
      isPublic: message.type === 'create-public-room',
      chess: new Chess(),
      players: {
        w: { socket, name: normalizeName(message.name, 'White') },
        b: { socket: null, name: 'Black' },
      },
      expiresAt: Date.now() + roomLifetimeMs,
    };
    rooms.set(code, room);
    player.room = room;
    player.color = 'w';
    send(socket, {
      type: 'room-created',
      code,
      color: 'w',
      name: room.players.b.name,
      isPublic: room.isPublic,
    });
    return;
  }

  if (message.type === 'join-room' || message.type === 'join-public-room') {
    const code = typeof message.code === 'string' ? message.code.trim().toUpperCase() : '';
    const room = rooms.get(code);
    if (!room || room.expiresAt < Date.now()) {
      send(socket, { type: 'error', message: 'That invite code is not active.' });
      return;
    }
    if (message.type === 'join-public-room' && !room.isPublic) {
      send(socket, { type: 'error', message: 'That room is not listed as a public game.' });
      return;
    }
    if (!room.players.w.socket || room.players.w.socket.readyState !== WebSocket.OPEN) {
      send(socket, { type: 'error', message: 'The room host is no longer connected.' });
      return;
    }
    if (room.players.b.socket && room.players.b.socket.readyState === WebSocket.OPEN) {
      send(socket, { type: 'error', message: 'That game already has two players.' });
      return;
    }
    if (player.room) leaveRoom(player);
    room.players.b.socket = socket;
    room.players.b.name = normalizeName(message.name, 'Black');
    room.expiresAt = Date.now() + roomLifetimeMs;
    player.room = room;
    player.color = 'b';
    const players = { w: room.players.w.name, b: room.players.b.name };
    const gameStart = {
      type: 'game-start',
      code: room.code,
      players,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
    };
    send(room.players.w.socket, { ...gameStart, color: 'w' });
    send(room.players.b.socket, { ...gameStart, color: 'b' });
    return;
  }

  const room = player.room;
  if (!room || !player.color || room.players[player.color]?.socket !== socket) {
    send(socket, { type: 'error', message: 'Join or create a room before sending game actions.' });
    return;
  }

  if (message.type === 'move') {
    if (player.color !== room.chess.turn()) {
      send(socket, { type: 'error', message: 'It is not your turn.' });
      return;
    }
    const from = message.from;
    const to = message.to;
    const promotion = message.promotion;
    if (!/^[a-h][1-8]$/.test(from || '') || !/^[a-h][1-8]$/.test(to || '')
      || (promotion !== undefined && !['q', 'r', 'b', 'n'].includes(promotion))) {
      send(socket, { type: 'error', message: 'Invalid move coordinates.' });
      return;
    }
    let move;
    try {
      move = room.chess.move({ from, to, ...(promotion ? { promotion } : {}) });
    } catch {
      move = null;
    }
    if (!move) {
      send(socket, { type: 'error', message: 'The server rejected that illegal move.' });
      return;
    }
    room.expiresAt = Date.now() + roomLifetimeMs;
    broadcast(room, {
      type: 'move',
      color: player.color,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      turn: room.chess.turn(),
      gameOver: room.chess.game_over(),
    });
    return;
  }

  if (message.type === 'resign') {
    broadcast(room, { type: 'resigned', color: player.color });
    return;
  }

  send(socket, { type: 'error', message: 'Unsupported game action.' });
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' || request.url !== '/health') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  }).end(JSON.stringify({ status: 'ok', activeRooms: rooms.size }));
});
const websocketServer = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 2048,
  verifyClient: ({ origin }, done) => {
    if (!isAllowedOrigin(origin)) {
      done(false, 403, 'Origin not allowed');
      return;
    }
    done(true);
  },
});

websocketServer.on('connection', (socket) => {
  const player = { socket, room: null, color: null };
  socket.on('message', (rawMessage) => handleMessage(socket, player, rawMessage.toString()));
  socket.on('close', () => leaveRoom(player));
  socket.on('error', (error) => console.error('Online game socket error:', error.message));
});

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (!room.players.w.socket && !room.players.b.socket && room.expiresAt <= now) rooms.delete(code);
  }
}, 60_000);
cleanupTimer.unref();

server.listen(port, '0.0.0.0', () => {
  console.log(`Openboard online rooms listening on port ${port} (WebSocket /ws).`);
});

function shutdown() {
  clearInterval(cleanupTimer);
  for (const socket of websocketServer.clients) socket.close(1001, 'Server is shutting down.');
  websocketServer.close();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
