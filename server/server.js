const crypto = require('node:crypto');
const http = require('node:http');
const { Chess } = require('chess.js');
const { WebSocketServer, WebSocket } = require('ws');

const port = Number(process.env.OPENBOARD_PORT || process.env.PORT || 3001);
const rooms = new Map();
const roomLifetimeMs = 30 * 60 * 1000;
const maxChatHistory = 100;
const maxChatMessageLength = 300;
const chatRateWindowMs = 10_000;
const chatRateLimit = 5;
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
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

function normalizeLobbyName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 40);
}

async function authenticateAccessToken(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Online accounts are not configured on this server yet.');
  }
  if (typeof accessToken !== 'string' || accessToken.length < 20 || accessToken.length > 4096) {
    throw new Error('Sign in to your Openboard account before using online play.');
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
  };
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!userResponse.ok) throw new Error('Your sign-in expired. Sign in again to continue.');
  const user = await userResponse.json();
  if (!user?.id) throw new Error('Your sign-in is invalid. Sign in again to continue.');

  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  profileUrl.searchParams.set('id', `eq.${user.id}`);
  profileUrl.searchParams.set('select', 'username');
  const profileResponse = await fetch(profileUrl, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!profileResponse.ok) throw new Error('Could not load your reserved username.');
  const [profile] = await profileResponse.json();
  if (!profile?.username) throw new Error('Your account does not have a reserved username. Create a new account or contact the site owner.');
  return { id: user.id, username: profile.username };
}

function hashRoomPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32);
}

function roomPasswordMatches(room, password) {
  if (!room.passwordHash) return true;
  if (typeof password !== 'string' || password.length > 128) return false;
  const candidate = hashRoomPassword(password, room.passwordSalt);
  return crypto.timingSafeEqual(candidate, room.passwordHash);
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
      && room.players.w.socket?.readyState === WebSocket.OPEN)
    .map((room) => {
      const inProgress = Boolean(room.players.b.socket && room.players.b.socket.readyState === WebSocket.OPEN);
      return {
        code: room.code,
        name: room.lobbyName,
        host: room.players.w.name,
        locked: Boolean(room.passwordHash),
        inProgress,
        ...(inProgress ? { opponent: room.players.b.name } : {}),
        spectators: room.spectators.size,
      };
    });
}

function broadcast(room, payload) {
  for (const player of Object.values(room.players)) send(player.socket, payload);
  for (const spectator of room.spectators) send(spectator.socket, payload);
}

function broadcastSpectators(room, payload) {
  for (const spectator of room.spectators) send(spectator.socket, payload);
}

function sendRoomChat(room, player, text) {
  const channel = player.role === 'spectator' ? 'spectators' : 'players';
  const message = {
    type: 'chat-message',
    channel,
    name: player.identity.username,
    text,
    timestamp: Date.now(),
  };
  const history = channel === 'spectators' ? room.spectatorChat : room.playerChat;
  history.push(message);
  if (history.length > maxChatHistory) history.shift();

  broadcast(room, message);
}

function leaveRoom(player) {
  if (!player?.room) return;
  const room = player.room;
  if (player.role === 'spectator') {
    room.spectators.delete(player);
    player.room = null;
    player.role = null;
    room.expiresAt = Date.now() + roomLifetimeMs;
    broadcast(room, { type: 'spectator-count', count: room.spectators.size });
    return;
  }
  const slot = room.players[player.color];
  if (slot?.socket === player.socket) slot.socket = null;
  player.room = null;
  player.color = null;
  player.role = null;
  if (room.players.w.socket || room.players.b.socket) {
    broadcast(room, { type: 'opponent-left' });
  } else {
    room.expiresAt = Date.now() + roomLifetimeMs;
    for (const spectator of room.spectators) {
      send(spectator.socket, { type: 'room-ended' });
      spectator.room = null;
      spectator.role = null;
      spectator.socket.close(1000, 'Game ended.');
    }
    room.spectators.clear();
  }
}

async function handleMessage(socket, player, rawMessage) {
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

  if (message.type === 'authenticate') {
    if (player.identity || player.authenticating) {
      send(socket, { type: 'error', message: 'This connection is already authenticated.' });
      return;
    }
    player.authenticating = true;
    try {
      player.identity = await authenticateAccessToken(message.accessToken);
      send(socket, { type: 'authenticated', username: player.identity.username });
    } catch (error) {
      send(socket, { type: 'error', message: error.message || 'Account authentication failed.' });
    } finally {
      player.authenticating = false;
    }
    return;
  }

  if (!player.identity) {
    send(socket, {
      type: 'error',
      message: player.authenticating
        ? 'Account sign-in is still being checked.'
        : 'Sign in to your Openboard account before using online play.',
    });
    return;
  }

  if (message.type === 'list-public-rooms') {
    send(socket, { type: 'public-rooms', rooms: getPublicRooms() });
    return;
  }

  if (message.type === 'create-room' || message.type === 'create-public-room') {
    const existingRoom = [...rooms.values()].find((room) => (
      [room.players.w, room.players.b].some((roomPlayer) => (
        roomPlayer.accountId === player.identity.id
        && roomPlayer.socket?.readyState === WebSocket.OPEN
      ))
    ));
    if (existingRoom) {
      send(socket, {
        type: 'error',
        message: `You are already playing in room ${existingRoom.code}. Leave that room before creating another.`,
      });
      return;
    }
    const lobbyName = normalizeLobbyName(message.lobbyName);
    const roomPassword = message.password === undefined ? '' : message.password;
    if (!lobbyName) {
      send(socket, { type: 'error', message: 'Enter a lobby name.' });
      return;
    }
    if (typeof roomPassword !== 'string' || roomPassword.length > 128) {
      send(socket, { type: 'error', message: 'Lobby passwords must be 128 characters or fewer.' });
      return;
    }
    if (player.room) leaveRoom(player);
    const code = generateRoomCode();
    const passwordSalt = roomPassword ? crypto.randomBytes(16) : null;
    const room = {
      code,
      lobbyName,
      isPublic: message.type === 'create-public-room',
      passwordSalt,
      passwordHash: passwordSalt ? hashRoomPassword(roomPassword, passwordSalt) : null,
      chess: new Chess(),
      players: {
        w: { socket, name: player.identity.username, accountId: player.identity.id },
        b: { socket: null, name: 'Black', accountId: null },
      },
      spectators: new Set(),
      playerChat: [],
      spectatorChat: [],
      expiresAt: Date.now() + roomLifetimeMs,
    };
    rooms.set(code, room);
    player.room = room;
    player.color = 'w';
    player.role = 'player';
    send(socket, {
      type: 'room-created',
      code,
      color: 'w',
      name: room.players.b.name,
      isPublic: room.isPublic,
      lobbyName: room.lobbyName,
      locked: Boolean(room.passwordHash),
      playerChat: room.playerChat,
      spectatorChat: room.spectatorChat,
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
    if (!roomPasswordMatches(room, message.password)) {
      send(socket, { type: 'error', message: 'That lobby password is incorrect.' });
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
    room.players.b.name = player.identity.username;
    room.players.b.accountId = player.identity.id;
    room.expiresAt = Date.now() + roomLifetimeMs;
    player.room = room;
    player.color = 'b';
    player.role = 'player';
    const players = { w: room.players.w.name, b: room.players.b.name };
    const gameStart = {
      type: 'game-start',
      code: room.code,
      players,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      playerChat: room.playerChat,
      spectatorChat: room.spectatorChat,
    };
    broadcastSpectators(room, {
      type: 'spectator-start',
      code: room.code,
      players,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      waiting: false,
      spectatorChat: room.spectatorChat,
    });
    send(room.players.w.socket, { ...gameStart, color: 'w' });
    send(room.players.b.socket, { ...gameStart, color: 'b' });
    return;
  }

  if (message.type === 'spectate-room') {
    const code = typeof message.code === 'string' ? message.code.trim().toUpperCase() : '';
    const room = rooms.get(code);
    if (!room || room.expiresAt < Date.now()) {
      send(socket, { type: 'error', message: 'That invite code is not active.' });
      return;
    }
    if (!roomPasswordMatches(room, message.password)) {
      send(socket, { type: 'error', message: 'That lobby password is incorrect.' });
      return;
    }
    if (![room.players.w, room.players.b].some((slot) => slot.socket?.readyState === WebSocket.OPEN)) {
      send(socket, { type: 'error', message: 'That game is no longer active.' });
      return;
    }
    if (player.room) leaveRoom(player);
    player.room = room;
    player.role = 'spectator';
    room.spectators.add(player);
    room.expiresAt = Date.now() + roomLifetimeMs;
    send(socket, {
      type: 'spectator-start',
      code: room.code,
      players: {
        w: room.players.w.name,
        b: room.players.b.name,
      },
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      waiting: !(room.players.w.socket?.readyState === WebSocket.OPEN
        && room.players.b.socket?.readyState === WebSocket.OPEN),
      spectators: room.spectators.size,
      playerChat: room.playerChat,
      spectatorChat: room.spectatorChat,
    });
    broadcast(room, { type: 'spectator-count', count: room.spectators.size });
    return;
  }

  const room = player.room;
  if (!room) {
    send(socket, { type: 'error', message: 'Join or create a room before sending game actions.' });
    return;
  }

  if (message.type === 'chat-send') {
    const isSpectator = player.role === 'spectator' && room.spectators.has(player);
    const isPlayer = player.role === 'player' && player.color
      && room.players[player.color]?.socket === socket;
    if (!isSpectator && !isPlayer) {
      send(socket, { type: 'error', message: 'Join the room before sending a chat message.' });
      return;
    }
    if (typeof message.text !== 'string') {
      send(socket, { type: 'error', message: 'Chat messages must be text.' });
      return;
    }
    const text = message.text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text || text.length > maxChatMessageLength) {
      send(socket, { type: 'error', message: `Chat messages must be 1–${maxChatMessageLength} characters.` });
      return;
    }
    const now = Date.now();
    player.chatTimestamps = (player.chatTimestamps || []).filter((timestamp) => now - timestamp < chatRateWindowMs);
    if (player.chatTimestamps.length >= chatRateLimit) {
      send(socket, { type: 'error', message: 'You are sending chat messages too quickly. Please wait a moment.' });
      return;
    }
    player.chatTimestamps.push(now);
    sendRoomChat(room, player, text);
    return;
  }

  if (player.role === 'spectator' || !player.color || room.players[player.color]?.socket !== socket) {
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
  const player = { socket, room: null, color: null, role: null, identity: null, authenticating: false };
  socket.on('message', (rawMessage) => {
    handleMessage(socket, player, rawMessage.toString()).catch((error) => {
      console.error('Online game request failed:', error);
      send(socket, { type: 'error', message: 'The server could not process that request.' });
    });
  });
  socket.on('close', () => leaveRoom(player));
  socket.on('error', (error) => console.error('Online game socket error:', error.message));
});

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (!room.players.w.socket && !room.players.b.socket && room.expiresAt <= now) {
      for (const spectator of room.spectators) {
        send(spectator.socket, { type: 'room-ended' });
        spectator.room = null;
        spectator.role = null;
        spectator.socket.close(1000, 'Room expired.');
      }
      room.spectators.clear();
      rooms.delete(code);
    }
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
