const crypto = require('node:crypto');
const http = require('node:http');
const net = require('node:net');
const { Chess } = require('chess.js');
const geoip = require('geoip-lite');
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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const accountRequestAttempts = new Map();
const accountRequestWindowMs = 15 * 60 * 1000;
const accountRequestLimit = 10;
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

function addAuthCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
}

function readJsonBody(request, maxLength = 2048) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > maxLength) {
        tooLarge = true;
        body = '';
      }
    });
    request.on('end', () => {
      if (tooLarge) {
        reject(new Error('Request body is too large.'));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function allowAccountRequest(request, response) {
  const now = Date.now();
  for (const [ip, attempt] of accountRequestAttempts) {
    if (now - attempt.startedAt >= accountRequestWindowMs) accountRequestAttempts.delete(ip);
  }
  const ip = request.socket.remoteAddress || 'unknown';
  let attempt = accountRequestAttempts.get(ip);
  if (!attempt || now - attempt.startedAt >= accountRequestWindowMs) {
    attempt = { startedAt: now, count: 0 };
    accountRequestAttempts.set(ip, attempt);
  }
  attempt.count += 1;
  if (attempt.count <= accountRequestLimit) return true;
  response.writeHead(429, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Retry-After': String(Math.ceil((accountRequestWindowMs - (now - attempt.startedAt)) / 1000)),
  }).end(JSON.stringify({ message: 'Too many account requests. Try again later.' }));
  return false;
}

async function lookupUserByUsername(username) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Username lookup is not configured on this server.');
  }
  const headers = {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  };
  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  profileUrl.searchParams.set('username_key', `eq.${username.toLowerCase()}`);
  profileUrl.searchParams.set('select', 'id');
  const profileResponse = await fetch(profileUrl, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!profileResponse.ok) throw new Error('Could not look up the account.');
  const [profile] = await profileResponse.json();
  if (!profile?.id) return null;

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(profile.id)}`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!userResponse.ok) throw new Error('Could not look up the account.');
  const user = await userResponse.json();
  return user?.email ? user : null;
}

async function signInWithUsername(username, password) {
  const user = await lookupUserByUsername(username);
  if (!user?.email) return null;

  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: user.email, password }),
    signal: AbortSignal.timeout(5000),
  });
  if (tokenResponse.status === 400 || tokenResponse.status === 401) return null;
  if (!tokenResponse.ok) throw new Error('The account service could not complete sign-in.');
  const session = await tokenResponse.json();
  if (!session.user) return session;
  const sessionUser = { ...session.user };
  delete sessionUser.email;
  return { ...session, user: sessionUser };
}

async function sendPasswordRecovery(identity, redirectTo) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Password recovery is not configured on this server.');
  }
  let email = identity.toLowerCase();
  if (!identity.includes('@')) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(identity)) {
      return;
    }
    const user = await lookupUserByUsername(identity);
    if (!user?.email) return;
    email = user.email;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) || identity.length > 254) {
    return;
  }
  const recoverUrl = new URL(`${supabaseUrl}/auth/v1/recover`);
  recoverUrl.searchParams.set('redirect_to', redirectTo);
  const recoveryResponse = await fetch(recoverUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(5000),
  });
  if (!recoveryResponse.ok && recoveryResponse.status !== 400 && recoveryResponse.status !== 429) {
    throw new Error('The account service could not send a password recovery email.');
  }
}

async function verifyPasswordRecovery(identity, token) {
  let email = identity.toLowerCase();
  if (!identity.includes('@')) {
    const user = await lookupUserByUsername(identity);
    if (!user?.email) {
      const error = new Error('The recovery code is invalid or expired.');
      error.statusCode = 400;
      throw error;
    }
    email = user.email;
  }
  const verificationResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, token, type: 'recovery' }),
    signal: AbortSignal.timeout(5000),
  });
  const result = await verificationResponse.json();
  if (!verificationResponse.ok || !result.access_token || !result.refresh_token) {
    const error = new Error('The recovery code is invalid or expired.');
    error.statusCode = verificationResponse.status >= 500 ? 503 : 400;
    throw error;
  }
  if (result.user) {
    result.user = { ...result.user };
    delete result.user.email;
  }
  return result;
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
  profileUrl.searchParams.set('select', 'username,country_code');
  const profileResponse = await fetch(profileUrl, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!profileResponse.ok) throw new Error('Could not load your reserved username.');
  const [profile] = await profileResponse.json();
  if (!profile?.username) throw new Error('Your account does not have a reserved username. Create a new account or contact the site owner.');
  return { id: user.id, username: profile.username, countryCode: profile.country_code || null };
}

function countryCodeForRequest(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedAddress = typeof forwardedFor === 'string'
    ? forwardedFor.split(',').map((address) => address.trim()).filter(Boolean).at(-1)
    : '';
  const address = (forwardedAddress || request.socket.remoteAddress || '')
    .replace(/^::ffff:/, '')
    .replace(/^\[|\]$/g, '')
    .split('%')[0];
  if (!net.isIP(address)) return null;
  const countryCode = geoip.lookup(address)?.country;
  return /^[A-Z]{2}$/.test(countryCode || '') ? countryCode : null;
}

async function createAccountWithCountry({ username, email, password, countryCode }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Online accounts are not configured on this server yet.');
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      data: { username, ...(countryCode ? { country_code: countryCode } : {}) },
    }),
    signal: AbortSignal.timeout(8000),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The account service returned an unreadable signup response.');
  }
  return { status: response.status, result };
}

const publicProfileFields = 'username,country_code,online_elo,online_games,online_wins,online_draws,online_losses';

async function loadProfile(queryName, queryValue) {
  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  profileUrl.searchParams.set(queryName, `eq.${queryValue}`);
  profileUrl.searchParams.set('select', publicProfileFields);
  const profileResponse = await fetch(profileUrl, {
    headers: { apikey: supabaseAnonKey },
    signal: AbortSignal.timeout(5000),
  });
  if (!profileResponse.ok) throw new Error('Could not load this player profile.');
  const [profile] = await profileResponse.json();
  if (!profile) return null;
  return {
    username: profile.username,
    countryCode: profile.country_code || null,
    onlineElo: profile.online_elo,
    onlineGames: profile.online_games,
    onlineWins: profile.online_wins,
    onlineDraws: profile.online_draws,
    onlineLosses: profile.online_losses,
  };
}

async function recordOnlineResult(room, whiteScore) {
  if (room.ratingSettlementStarted) return;
  room.ratingSettlementStarted = true;
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Online rating storage is not configured. Apply the rating SQL schema and configure the service-role key.');
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/settle_openboard_rated_game`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_white_id: room.players.w.accountId,
        p_black_id: room.players.b.accountId,
        p_white_score: whiteScore,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('The account service could not save the online rating result.');
    broadcast(room, { type: 'rating-updated' });
  } catch (error) {
    console.error('Could not record online game ratings:', error.message);
    broadcast(room, { type: 'rating-update-failed' });
  }
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

function getPublicRooms(accountId) {
  const now = Date.now();
  return [...rooms.values()]
    .filter((room) => room.isPublic && room.expiresAt > now
      && room.players.w.accountId
      && [room.players.w, room.players.b].some(
        (slot) => slot.socket?.readyState === WebSocket.OPEN,
      ))
    .map((room) => {
      const hostOnline = room.players.w.socket?.readyState === WebSocket.OPEN;
      const opponentOnline = room.players.b.socket?.readyState === WebSocket.OPEN;
      const inProgress = Boolean(room.players.b.accountId);
      const ownColor = ['w', 'b'].find((color) => room.players[color].accountId === accountId);
      const ownSeatOnline = ownColor
        ? room.players[ownColor].socket?.readyState === WebSocket.OPEN
        : false;
      return {
        code: room.code,
        name: room.lobbyName,
        host: room.players.w.name,
        ...(room.players.w.countryCode ? { hostCountryCode: room.players.w.countryCode } : {}),
        hostOnline,
        locked: Boolean(room.passwordHash),
        inProgress,
        ...(inProgress ? {
          opponent: room.players.b.name,
          ...(room.players.b.countryCode ? { opponentCountryCode: room.players.b.countryCode } : {}),
          opponentOnline,
        } : {}),
        joinable: !hostOnline || !opponentOnline,
        isYourGame: Boolean(ownColor),
        canJoin: ownColor ? !ownSeatOnline : (!hostOnline || !opponentOnline),
        canWatch: !ownColor,
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
    ...(player.identity.countryCode ? { countryCode: player.identity.countryCode } : {}),
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
  room.expiresAt = Date.now() + roomLifetimeMs;
  const hasConnectedPlayer = [room.players.w, room.players.b]
    .some((slot) => slot.socket?.readyState === WebSocket.OPEN);
  if (hasConnectedPlayer) {
    broadcast(room, { type: 'opponent-left' });
  } else {
    for (const spectator of room.spectators) {
      send(spectator.socket, { type: 'room-ended' });
      spectator.room = null;
      spectator.role = null;
      spectator.socket.close(1000, 'Game ended.');
    }
    room.spectators.clear();
    rooms.delete(room.code);
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
      send(socket, {
        type: 'authenticated',
        username: player.identity.username,
        ...(player.identity.countryCode ? { countryCode: player.identity.countryCode } : {}),
      });
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
    send(socket, { type: 'public-rooms', rooms: getPublicRooms(player.identity.id) });
    return;
  }

  if (message.type === 'leave-room') {
    leaveRoom(player);
    send(socket, { type: 'left-room' });
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
        w: {
          socket,
          name: player.identity.username,
          countryCode: player.identity.countryCode,
          accountId: player.identity.id,
        },
        b: { socket: null, name: 'Black', accountId: null },
      },
      spectators: new Set(),
      playerChat: [],
      spectatorChat: [],
      gameEnded: false,
      ratingSettlementStarted: false,
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
      countryCode: player.identity.countryCode || null,
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
    if (![room.players.w, room.players.b].some(
      (slot) => slot.socket?.readyState === WebSocket.OPEN,
    )) {
      send(socket, { type: 'error', message: 'That lobby is empty and can no longer be rejoined.' });
      return;
    }
    const reconnectColor = ['w', 'b'].find((color) => room.players[color].accountId === player.identity.id);
    if (reconnectColor && room.players[reconnectColor].socket?.readyState === WebSocket.OPEN) {
      send(socket, { type: 'error', message: `You are already connected to room ${room.code}.` });
      return;
    }
    let color = reconnectColor;
    if (!color) {
      color = ['w', 'b'].find((candidate) => (
        room.players[candidate].accountId
        && room.players[candidate].socket?.readyState !== WebSocket.OPEN
      ));
      if (!color && room.players.w.socket?.readyState === WebSocket.OPEN && !room.players.b.accountId) {
        color = 'b';
      }
      if (!color) {
        send(socket, { type: 'error', message: 'That game already has two players.' });
        return;
      }
    }
    if (player.room) leaveRoom(player);
    if (!reconnectColor && room.players[color].accountId) {
      room.chess = new Chess();
      room.gameEnded = false;
      room.ratingSettlementStarted = false;
    }
    room.players[color].socket = socket;
    room.players[color].name = player.identity.username;
    room.players[color].countryCode = player.identity.countryCode;
    room.players[color].accountId = player.identity.id;
    room.expiresAt = Date.now() + roomLifetimeMs;
    player.room = room;
    player.color = color;
    player.role = 'player';
    const players = { w: room.players.w.name, b: room.players.b.name };
    const playerCountries = {
      w: room.players.w.countryCode || null,
      b: room.players.b.countryCode || null,
    };
    const gameStart = {
      type: 'game-start',
      code: room.code,
      players,
      playerCountries,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      spectators: room.spectators.size,
      playerChat: room.playerChat,
      spectatorChat: room.spectatorChat,
    };
    broadcastSpectators(room, {
      type: 'spectator-start',
      code: room.code,
      players,
      playerCountries,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      waiting: false,
      spectatorChat: room.spectatorChat,
    });
    for (const playerColor of ['w', 'b']) {
      if (room.players[playerColor].socket?.readyState === WebSocket.OPEN) {
        send(room.players[playerColor].socket, { ...gameStart, color: playerColor });
      }
    }
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
    if ([room.players.w, room.players.b].some((slot) => slot.accountId === player.identity.id)) {
      send(socket, { type: 'error', message: 'Players cannot spectate their own game.' });
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
      playerCountries: {
        w: room.players.w.countryCode || null,
        b: room.players.b.countryCode || null,
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
    if (room.gameEnded) {
      send(socket, { type: 'error', message: 'This game has already ended.' });
      return;
    }
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
    if (room.chess.game_over()) {
      room.gameEnded = true;
      const whiteScore = room.chess.in_checkmate()
        ? room.chess.turn() === 'w' ? 0 : 1
        : 0.5;
      await recordOnlineResult(room, whiteScore);
    }
    return;
  }

  if (message.type === 'resign') {
    if (room.gameEnded) {
      send(socket, { type: 'error', message: 'This game has already ended.' });
      return;
    }
    room.gameEnded = true;
    broadcast(room, { type: 'resigned', color: player.color });
    if (room.chess.history().length) {
      await recordOnlineResult(room, player.color === 'w' ? 0 : 1);
    } else {
      broadcast(room, { type: 'rating-not-counted' });
    }
    return;
  }

  send(socket, { type: 'error', message: 'Unsupported game action.' });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');
  const publicProfileMatch = /^\/profiles\/([^/]+)$/.exec(requestUrl.pathname);
  const isOwnProfileRequest = requestUrl.pathname === '/profile/me';
  if (publicProfileMatch || isOwnProfileRequest) {
    addAuthCorsHeaders(request, response);
    if (request.headers.origin && !isAllowedOrigin(request.headers.origin)) {
      response.writeHead(403).end();
      return;
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
      }).end();
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET, OPTIONS' }).end();
      return;
    }
    try {
      let profile;
      if (isOwnProfileRequest) {
        const [, accessToken] = /^Bearer\s+(.+)$/i.exec(request.headers.authorization || '') || [];
        if (!accessToken) {
          response.writeHead(401, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
          }).end(JSON.stringify({ message: 'Sign in to view your player profile.' }));
          return;
        }
        const identity = await authenticateAccessToken(accessToken);
        profile = await loadProfile('id', identity.id);
      } else {
        let username;
        try {
          username = decodeURIComponent(publicProfileMatch[1]);
        } catch {
          response.writeHead(400, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
          }).end(JSON.stringify({ message: 'Enter a valid player username.' }));
          return;
        }
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
          response.writeHead(400, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
          }).end(JSON.stringify({ message: 'Enter a valid player username.' }));
          return;
        }
        profile = await loadProfile('username_key', username.toLowerCase());
      }
      if (!profile) {
        response.writeHead(404, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: 'No player profile was found for that username.' }));
        return;
      }
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      }).end(JSON.stringify(profile));
    } catch (error) {
      console.error('Player profile request failed:', error.message);
      response.writeHead(503, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      }).end(JSON.stringify({ message: error.message || 'Player profiles are temporarily unavailable.' }));
    }
    return;
  }
  if (['/auth/signup', '/auth/username', '/auth/recover', '/auth/verify-recovery'].includes(requestUrl.pathname)) {
    const isSignup = requestUrl.pathname === '/auth/signup';
    const isRecovery = requestUrl.pathname === '/auth/recover';
    const isRecoveryVerification = requestUrl.pathname === '/auth/verify-recovery';
    addAuthCorsHeaders(request, response);
    if (request.headers.origin && !isAllowedOrigin(request.headers.origin)) {
      response.writeHead(403).end();
      return;
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      }).end();
      return;
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST, OPTIONS' }).end();
      return;
    }
    if (!allowAccountRequest(request, response)) return;
    let credentials;
    try {
      credentials = await readJsonBody(request);
    } catch (error) {
      response.writeHead(400, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      }).end(JSON.stringify({ message: error.message }));
      return;
    }
    if (isSignup) {
      const username = typeof credentials?.username === 'string' ? credentials.username.trim() : '';
      const email = typeof credentials?.email === 'string' ? credentials.email.trim() : '';
      const password = typeof credentials?.password === 'string' ? credentials.password : '';
      if (!/^[A-Za-z0-9_]{3,20}$/.test(username)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || email.length > 254
        || password.length < 8
        || password.length > 72) {
        response.writeHead(400, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: 'Enter a valid username, email address, and password.' }));
        return;
      }
      try {
        const { status, result } = await createAccountWithCountry({
          username,
          email,
          password,
          countryCode: countryCodeForRequest(request),
        });
        response.writeHead(status >= 200 && status < 300 ? status : status === 400 || status === 422 ? status : 503, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify(result));
      } catch (error) {
        console.error('Account signup failed:', error.message);
        response.writeHead(503, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: error.message || 'Account signup is unavailable.' }));
      }
      return;
    }
    if (isRecoveryVerification) {
      const identity = typeof credentials?.identity === 'string' ? credentials.identity.trim() : '';
      const token = typeof credentials?.token === 'string' ? credentials.token.trim() : '';
      if ((!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) && !/^[A-Za-z0-9_]{3,20}$/.test(identity))
        || !/^\d{6}$/.test(token)) {
        response.writeHead(400, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: 'Enter the account email or username and the six-digit recovery code.' }));
        return;
      }
      try {
        const session = await verifyPasswordRecovery(identity, token);
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify(session));
      } catch (error) {
        if (error.statusCode !== 400) {
          console.error('Password recovery code verification failed:', error.message);
        }
        response.writeHead(error.statusCode || 503, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: error.message || 'Password recovery is unavailable.' }));
      }
      return;
    }
    if (isRecovery) {
      const identity = typeof credentials?.identity === 'string' ? credentials.identity.trim() : '';
      let redirectUrl;
      try {
        redirectUrl = new URL(credentials?.redirectTo);
      } catch {
        response.writeHead(400, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: 'Enter a valid password-reset link destination.' }));
        return;
      }
      if (!isAllowedOrigin(redirectUrl.origin) || !['https:', 'http:'].includes(redirectUrl.protocol)) {
        response.writeHead(400, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: 'Password-reset links can only return to an approved website.' }));
        return;
      }
      if (!identity || identity.length > 254
        || (!identity.includes('@') && !/^[A-Za-z0-9_]{3,20}$/.test(identity))) {
        response.writeHead(400, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: 'Enter a valid account email or username.' }));
        return;
      }
      try {
        await sendPasswordRecovery(identity, redirectUrl.toString());
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({
          message: 'If an account exists for that email or username, password reset instructions have been sent.',
        }));
      } catch (error) {
        console.error('Password recovery request failed:', error.message);
        response.writeHead(503, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: error.message || 'Password recovery is unavailable.' }));
      }
      return;
    }

    const username = typeof credentials?.username === 'string' ? credentials.username.trim() : '';
    const password = typeof credentials?.password === 'string' ? credentials.password : '';
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username) || password.length < 8 || password.length > 72) {
      response.writeHead(400, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      }).end(JSON.stringify({ message: 'Enter a valid username and password.' }));
      return;
    }
    try {
      const session = await signInWithUsername(username, password);
      if (!session?.access_token || !session.refresh_token) {
        response.writeHead(401, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: 'Invalid username or password.' }));
        return;
      }
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      }).end(JSON.stringify(session));
    } catch (error) {
      console.error('Username sign-in failed:', error.message);
      response.writeHead(503, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      }).end(JSON.stringify({ message: error.message || 'Username sign-in is unavailable.' }));
    }
    return;
  }
  if (request.method !== 'GET' || requestUrl.pathname !== '/health') {
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
    if (room.expiresAt <= now) {
      for (const slot of Object.values(room.players)) {
        send(slot.socket, { type: 'room-ended' });
        slot.socket?.close(1000, 'Room expired.');
        slot.socket = null;
      }
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
