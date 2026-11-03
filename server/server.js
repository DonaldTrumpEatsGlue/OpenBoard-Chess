const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const Module = require('node:module');
const net = require('node:net');
const path = require('node:path');
let { Chess } = require('chess.js');
const geoip = require('geoip-lite');
const { WebSocketServer, WebSocket } = require('ws');

const port = Number(process.env.OPENBOARD_PORT || process.env.PORT || 3001);
const rooms = new Map();
const playersBySocket = new WeakMap();
const roomLifetimeMs = 30 * 60 * 1000;
const rematchRequestLifetimeMs = 60 * 1000;
const maxChatHistory = 100;
const maxChatMessageLength = 300;
const chatRateWindowMs = 10_000;
const chatRateLimit = 5;
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const accountRequestAttempts = new Map();
const socialRequestAttempts = new Map();
const accountRequestWindowMs = 15 * 60 * 1000;
const accountRequestLimits = new Map([
  ['/auth/signup', 10],
  ['/auth/username', 30],
  ['/auth/recover', 10],
  ['/auth/verify-recovery', 20],
]);
const trustProxy = process.env.OPENBOARD_TRUST_PROXY === 'true';
const socialRequestLimit = 120;
const allowedOrigins = (process.env.OPENBOARD_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const standardPieceMovements = {
  p: { w: ['p'], b: ['p'] },
  n: { w: ['n'], b: ['n'] },
  b: { w: ['b'], b: ['b'] },
  r: { w: ['r'], b: ['r'] },
  q: { w: ['q'], b: ['q'] },
};
const movementTypes = new Set(['p', 'n', 'b', 'r', 'q']);
const replacementTypes = new Set(['p', 'n', 'b', 'r', 'q']);
const customMoveModes = new Set(['both', 'move', 'capture', 'attack']);

function normalizeStudioMovement(value) {
  if (!value || typeof value !== 'object' || value.royal === true
    || !['step', 'slide', 'leap'].includes(value.movementType)
    || !Number.isInteger(value.range) || value.range < 1 || value.range > 8
    || !Array.isArray(value.vectors) || value.vectors.length < 1 || value.vectors.length > 32
    || !customMoveModes.has(value.captureMode ?? 'both')) return null;
  const vectors = [];
  const seen = new Set();
  for (const vector of value.vectors) {
    if (!vector || !Number.isInteger(vector.dx) || !Number.isInteger(vector.dy)
      || Math.abs(vector.dx) > 8 || Math.abs(vector.dy) > 8
      || (vector.dx === 0 && vector.dy === 0)
      || !customMoveModes.has(vector.mode ?? value.captureMode ?? 'both')) return null;
    const key = `${vector.dx},${vector.dy}`;
    if (seen.has(key)) return null;
    seen.add(key);
    vectors.push({
      dx: vector.dx,
      dy: vector.dy,
      mode: vector.mode ?? value.captureMode ?? 'both',
    });
  }
  return {
    vectors,
    movementType: value.movementType,
    captureMode: value.captureMode ?? 'both',
    range: value.range,
    mirror: value.mirror === true,
    jump: value.jump === true,
    promotion: value.promotion === true,
  };
}

function normalizeOnlineVariant(value) {
  if (value === undefined) {
    return {
      boardSize: 8,
      noDraws: false,
      pieceMovements: structuredClone(standardPieceMovements),
      customPieces: [],
    };
  }
  if (!value || typeof value !== 'object' || value.boardSize !== 8
    || typeof value.noDraws !== 'boolean'
    || !value.pieceMovements || typeof value.pieceMovements !== 'object'
    || !Array.isArray(value.customPieces) || value.customPieces.length > 10) return null;
  const pieceMovements = {};
  for (const type of movementTypes) {
    const sides = value.pieceMovements[type];
    if (!sides || typeof sides !== 'object') return null;
    pieceMovements[type] = {};
    for (const color of ['w', 'b']) {
      const movements = sides[color];
      if (!Array.isArray(movements) || movements.length < 1 || movements.length > 5
        || movements.some((movement) => !movementTypes.has(movement))
        || new Set(movements).size !== movements.length) return null;
      pieceMovements[type][color] = [...movements];
    }
  }
  const customPieces = [];
  const replacementKeys = new Set();
  const ids = new Set();
  for (const piece of value.customPieces) {
    if (!piece || typeof piece.id !== 'string' || piece.id.length < 1 || piece.id.length > 80
      || ids.has(piece.id) || typeof piece.name !== 'string' || piece.name.length < 1 || piece.name.length > 18
      || typeof piece.symbol !== 'string' || [...piece.symbol].length < 1 || [...piece.symbol].length > 4
      || !replacementTypes.has(piece.replaces) || !['both', 'w', 'b'].includes(piece.color)) return null;
    ids.add(piece.id);
    const colors = piece.color === 'both' ? ['w', 'b'] : [piece.color];
    for (const color of colors) {
      const key = `${piece.replaces}:${color}`;
      if (replacementKeys.has(key)) return null;
      replacementKeys.add(key);
    }
    if (piece.studio !== undefined) {
      const studio = normalizeStudioMovement(piece.studio);
      if (!studio) return null;
      customPieces.push({
        id: piece.id,
        name: piece.name,
        symbol: piece.symbol,
        replaces: piece.replaces,
        color: piece.color,
        movements: Array.isArray(piece.movements) ? piece.movements.filter((item) => movementTypes.has(item)) : [piece.replaces],
        studio,
      });
    } else {
      if (!Array.isArray(piece.movements) || piece.movements.length < 1 || piece.movements.length > 5
        || piece.movements.some((movement) => !movementTypes.has(movement))
        || new Set(piece.movements).size !== piece.movements.length) return null;
      customPieces.push({
        id: piece.id,
        name: piece.name,
        symbol: piece.symbol,
        replaces: piece.replaces,
        color: piece.color,
        movements: [...piece.movements],
      });
    }
  }
  return { boardSize: 8, noDraws: value.noDraws, pieceMovements, customPieces };
}

function publicRoomVariantLabel(variant) {
  const pieceNames = [...new Set(variant.customPieces.map((piece) => piece.name.trim()).filter(Boolean))];
  const changedMovements = Object.entries(standardPieceMovements).filter(([piece, standardSides]) => (
    ['w', 'b'].some((color) => (
      JSON.stringify(variant.pieceMovements[piece][color]) !== JSON.stringify(standardSides[color])
    ))
  )).length;
  const hasCustomRules = variant.noDraws || changedMovements > 0 || variant.customPieces.length > 0;
  const details = [];
  if (pieceNames.length) {
    const visibleNames = pieceNames.slice(0, 3);
    if (pieceNames.length > visibleNames.length) visibleNames.push(`+${pieceNames.length - visibleNames.length} more`);
    details.push(`${visibleNames.join(', ')} variant`);
  } else {
    details.push(hasCustomRules ? 'Custom rules' : 'Standard chess');
  }
  if (pieceNames.length && hasCustomRules) details.push('custom rules');
  if (changedMovements) details.push(`${changedMovements} movement rule${changedMovements === 1 ? '' : 's'} changed`);
  if (variant.noDraws) details.push('no draws');
  return details.join(' · ');
}

function configureRoomChess(room) {
  room.chess = new Chess();
  room.drawOfferBy = null;
  room.customMovementBySquare = new Map();
  room.customPieceBySquare = new Map();
  room.chess.clearCustomMovements();
  for (let rank = 1; rank <= 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${String.fromCharCode(97 + file)}${rank}`;
      const piece = room.chess.get(square);
      if (!piece || piece.type === 'k') continue;
      const customDefinition = room.variant.customPieces.find((candidate) => (
        candidate.replaces === piece.type
        && (candidate.color === 'both' || candidate.color === piece.color)
      ));
      if (customDefinition?.studio) {
        room.customPieceBySquare.set(square, customDefinition.id);
        room.chess.setCustomMovement(square, customDefinition.studio);
        continue;
      }
      const movements = customDefinition?.movements ?? room.variant.pieceMovements[piece.type][piece.color];
      const customMovement = movements[0] ?? piece.type;
      if (customDefinition) room.customPieceBySquare.set(square, customDefinition.id);
      else if (movements.length !== 1 || customMovement !== piece.type) {
        room.customMovementBySquare.set(square, { original: piece.type, movements });
      }
      if (customMovement !== piece.type) {
        room.chess.remove(square);
        room.chess.put({ type: customMovement, color: piece.color }, square);
      }
    }
  }
}

function makeRoomMove(room, from, to, promotion) {
  const piece = room.chess.get(from);
  if (!piece) return null;
  const customId = room.customPieceBySquare.get(from);
  const customDefinition = room.variant.customPieces.find((candidate) => candidate.id === customId);
  const identity = room.customMovementBySquare.get(from);
  const pawnIdentity = piece.type === 'p' || identity?.original === 'p'
    || customDefinition?.replaces === 'p' || customDefinition?.studio?.promotion === true;
  const patterns = customDefinition?.studio
    ? [piece.type]
    : customDefinition?.movements ?? identity?.movements ?? [piece.type];
  const originalType = piece.type;
  let move = null;
  for (const pattern of patterns) {
    if (pattern !== originalType) {
      room.chess.remove(from);
      room.chess.put({ type: pattern, color: piece.color }, from);
    }
    try {
      move = room.chess.move({ from, to, ...(promotion ? { promotion } : {}) });
    } catch {
      move = null;
    }
    if (move) break;
    if (pattern !== originalType) {
      room.chess.remove(from);
      room.chess.put(piece, from);
    }
  }
  if (!move) return null;

  const capturedFile = move.to.match(/^[a-z]+/)[0];
  const capturedRank = move.from.slice(move.from.match(/[0-9]/).index);
  const capturedSquare = move.flags.includes('e') ? `${capturedFile}${capturedRank}` : move.to;
  room.customMovementBySquare.delete(capturedSquare);
  room.customPieceBySquare.delete(capturedSquare);
  const movingIdentity = room.customMovementBySquare.get(from);
  room.customMovementBySquare.delete(from);
  room.customMovementBySquare.delete(to);
  if (movingIdentity) room.customMovementBySquare.set(to, movingIdentity);
  const movingCustomId = room.customPieceBySquare.get(from);
  room.customPieceBySquare.delete(from);
  room.customPieceBySquare.delete(to);
  if (movingCustomId) room.customPieceBySquare.set(to, movingCustomId);

  const destinationRank = Number(to.slice(to.match(/[0-9]/).index));
  const reachesPromotionRank = destinationRank === (piece.color === 'w' ? 8 : 1);
  if (pawnIdentity && reachesPromotionRank && !move.promotion) {
    const promotedType = promotion || 'q';
    room.chess.remove(to);
    room.chess.put({ type: promotedType, color: piece.color }, to);
    room.customMovementBySquare.delete(to);
    room.customPieceBySquare.delete(to);
    move.promotion = promotedType;
  }
  if (move.flags.includes('k') || move.flags.includes('q')) {
    const rank = move.color === 'w' ? '1' : '8';
    const rookFrom = `${move.flags.includes('k') ? 'h' : 'a'}${rank}`;
    const rookTo = `${move.flags.includes('k') ? 'f' : 'd'}${rank}`;
    const rookMovement = room.customMovementBySquare.get(rookFrom);
    room.customMovementBySquare.delete(rookFrom);
    if (rookMovement) room.customMovementBySquare.set(rookTo, rookMovement);
    const rookId = room.customPieceBySquare.get(rookFrom);
    room.customPieceBySquare.delete(rookFrom);
    if (rookId) room.customPieceBySquare.set(rookTo, rookId);
  }
  return move;
}

function isRoomGameOver(room) {
  return room.chess.in_checkmate() || room.chess.in_stalemate()
    || (!room.variant.noDraws && room.chess.game_over());
}

function roomTermination(room) {
  if (room.chess.in_checkmate()) return 'checkmate';
  if (room.chess.in_stalemate()) return 'stalemate';
  if (room.chess.in_threefold_repetition()) return 'threefold';
  if (Number(room.chess.fen().split(' ')[4]) >= 100) return 'fiftyMove';
  if (room.chess.insufficient_material()) return 'insufficient';
  return 'draw';
}

function roomPosition(room) {
  return {
    gameId: room.gameId,
    fen: room.chess.fen(),
    pgn: room.chess.pgn(),
    moves: room.chess.history({ verbose: true }).map(({ from, to, promotion }) => ({
      from,
      to,
      ...(promotion ? { promotion } : {}),
    })),
    variant: room.variant,
    gameOver: room.gameEnded,
    ...(room.gameEnded ? {
      termination: room.termination,
      whiteScore: room.resultWhiteScore,
    } : {}),
  };
}

function roomPlayerProfiles(room) {
  const profiles = {};
  for (const color of ['w', 'b']) {
    const player = room.players[color];
    if (!player.accountId) continue;
    profiles[color] = {
      id: player.accountId,
      username: player.name,
      countryCode: player.countryCode || null,
      onlineElo: Number.isInteger(player.onlineGames) && player.onlineGames > 0
        && Number.isInteger(player.onlineElo)
        ? player.onlineElo
        : null,
    };
  }
  return profiles;
}

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
    response.setHeader('Access-Control-Expose-Headers', 'Retry-After');
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
  for (const [key, attempt] of accountRequestAttempts) {
    if (now - attempt.startedAt >= accountRequestWindowMs) accountRequestAttempts.delete(key);
  }
  const forwardedIp = trustProxy ? clientAddressFromForwardedHeader(request) : null;
  const ip = forwardedIp || request.socket.remoteAddress || 'unknown';
  const route = new URL(request.url, 'http://localhost').pathname;
  const key = `${ip}:${route}`;
  let attempt = accountRequestAttempts.get(key);
  if (!attempt || now - attempt.startedAt >= accountRequestWindowMs) {
    attempt = { startedAt: now, count: 0 };
    accountRequestAttempts.set(key, attempt);
  }
  attempt.count += 1;
  if (attempt.count <= (accountRequestLimits.get(route) || 10)) return true;
  response.writeHead(429, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Retry-After': String(Math.ceil((accountRequestWindowMs - (now - attempt.startedAt)) / 1000)),
  }).end(JSON.stringify({ message: 'Too many account requests. Try again later.' }));
  return false;
}

function clientAddressFromForwardedHeader(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor !== 'string') return null;
  const address = forwardedFor.split(',').map((entry) => entry.trim()).find((entry) => net.isIP(entry));
  return address || null;
}

function allowSocialRequest(request, response) {
  const now = Date.now();
  const ip = request.socket.remoteAddress || 'unknown';
  let attempt = socialRequestAttempts.get(ip);
  if (!attempt || now - attempt.startedAt >= accountRequestWindowMs) {
    attempt = { startedAt: now, count: 0 };
    socialRequestAttempts.set(ip, attempt);
  }
  attempt.count += 1;
  if (attempt.count <= socialRequestLimit) return true;
  sendSocialResponse(response, 429, { message: 'Too many social requests. Try again later.' });
  return false;
}

async function lookupUserByUsername(username) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Username lookup is not configured on this server.');
  }
  const headers = {
    apikey: supabaseServiceRoleKey,
    Authorization: makeAuthorizationHeader(supabaseServiceRoleKey),
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
    Authorization: makeAuthorizationHeader(accessToken),
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
  let profile = null;
  for (const fields of [
    'username,country_code,online_elo,online_games',
    'username,country_code',
    'username',
  ]) {
    profileUrl.searchParams.set('select', fields);
    const result = await requestProfileRows(
      profileUrl,
      headers,
      'Could not load your reserved username.',
    );
    if (!result.missingColumns) {
      [profile] = result.rows;
      break;
    }
  }
  if (!profile?.username) throw new Error('Your account does not have a reserved username. Create a new account or contact the site owner.');
  return {
    id: user.id,
    username: profile.username,
    countryCode: profile.country_code || null,
    onlineElo: Number.isInteger(profile.online_elo) ? profile.online_elo : null,
    onlineGames: Number.isInteger(profile.online_games) ? profile.online_games : null,
  };
}

function countryCodeForRequest(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedAddress = typeof forwardedFor === 'string'
    ? forwardedFor.split(',').map((address) => address.trim()).find(Boolean)
    : '';
  const address = (forwardedAddress || request.socket.remoteAddress || '')
    .replace(/^::ffff:/, '')
    .replace(/^\[|\]$/g, '')
    .split('%')[0];
  if (!net.isIP(address)) return null;
  const countryCode = geoip.lookup(address)?.country;
  return /^[A-Z]{2}$/.test(countryCode || '') ? countryCode : null;
}

function validateSignupRedirectUrl(value, requestOrigin) {
  let origin;
  let redirectUrl;
  try {
    origin = new URL(requestOrigin);
    redirectUrl = new URL(value);
  } catch {
    throw new Error('Enter a valid email confirmation destination.');
  }
  if (!['https:', 'http:'].includes(origin.protocol)
    || !['https:', 'http:'].includes(redirectUrl.protocol)
    || redirectUrl.origin !== origin.origin
    || !isAllowedOrigin(redirectUrl.origin)
    || redirectUrl.username
    || redirectUrl.password
    || redirectUrl.search
    || redirectUrl.hash
    || !redirectUrl.pathname.endsWith('/')
    || redirectUrl.pathname.length > 512) {
    throw new Error('Enter a valid email confirmation destination.');
  }
  return redirectUrl.toString();
}

async function createAccountWithCountry({ username, email, password, countryCode, redirectTo }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Online accounts are not configured on this server yet.');
  }
  const signupUrl = new URL(`${supabaseUrl}/auth/v1/signup`);
  signupUrl.searchParams.set('redirect_to', redirectTo);
  const response = await fetch(signupUrl, {
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

const publicProfileFields = 'id,username,country_code,bio,avatar_data,online_elo,online_games,online_wins,online_draws,online_losses';

function isMissingProfileColumnError(error) {
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || /column .* does not exist|could not find .*column.*schema cache/i.test(
      `${error?.message || ''} ${error?.details || ''}`,
    );
}

async function requestProfileRows(profileUrl, headers, failureMessage = 'Could not load this player profile.') {
  const response = await fetch(profileUrl, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (response.ok) return { rows: await response.json(), missingColumns: false };

  let error;
  try {
    error = await response.json();
  } catch {
    error = null;
  }
  if (response.status === 400 && isMissingProfileColumnError(error)) {
    return { rows: null, missingColumns: true };
  }
  throw new Error(failureMessage);
}

async function loadProfile(queryName, queryValue) {
  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  profileUrl.searchParams.set(queryName, `eq.${queryValue}`);
  profileUrl.searchParams.set('select', publicProfileFields);
  const headers = { apikey: supabaseAnonKey };
  let { rows, missingColumns } = await requestProfileRows(profileUrl, headers);
  if (missingColumns) {
    profileUrl.searchParams.set('select', 'username');
    ({ rows } = await requestProfileRows(profileUrl, headers));
  }
  const [profile] = rows;
  if (!profile) return null;
  return {
    ...(profile.id ? { id: profile.id } : {}),
    username: profile.username,
    countryCode: profile.country_code || null,
    ...(profile.bio ? { bio: profile.bio } : {}),
    ...(profile.avatar_data ? { avatarData: profile.avatar_data } : {}),
    onlineElo: profile.online_elo ?? 1200,
    onlineGames: profile.online_games ?? 0,
    onlineWins: profile.online_wins ?? 0,
    onlineDraws: profile.online_draws ?? 0,
    onlineLosses: profile.online_losses ?? 0,
  };
}

async function loadPublicMembers({ search, countryCode, ratedOnly, sort }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('The members directory is not configured on this server yet.');
  }
  const membersUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  membersUrl.searchParams.set('select', 'id,username,country_code,avatar_data,online_elo,online_games');
  membersUrl.searchParams.set('order', sort === 'rating' ? 'online_elo.desc,username.asc' : 'username.asc');
  membersUrl.searchParams.set('limit', '50');
  if (search) membersUrl.searchParams.set('username', `ilike.*${search}*`);
  if (countryCode) membersUrl.searchParams.set('country_code', `eq.${countryCode}`);
  if (ratedOnly) membersUrl.searchParams.set('online_games', 'gt.0');

  const readRows = async () => {
    const response = await fetch(membersUrl, {
      headers: { apikey: supabaseAnonKey },
      signal: AbortSignal.timeout(5000),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('The members directory returned an unreadable response.');
    }
    return { response, result };
  };

  let ratingsAvailable = true;
  let { response, result } = await readRows();
  if (!response.ok && response.status === 400 && isMissingProfileColumnError(result)) {
    ratingsAvailable = false;
    if (countryCode || ratedOnly || sort === 'rating') {
      return {
        members: [],
        ratingsAvailable,
        message: 'Country and rating filters are not available until the profile database is updated.',
      };
    }
    membersUrl.searchParams.set('select', 'id,username');
    membersUrl.searchParams.set('order', 'username.asc');
    ({ response, result } = await readRows());
  }
  if (!response.ok) throw new Error('Could not load the members directory.');
  return {
    members: result.map((profile) => ({
      id: profile.id,
      username: profile.username,
      countryCode: profile.country_code || null,
      ...(profile.avatar_data ? { avatarData: profile.avatar_data } : {}),
      onlineElo: profile.online_games > 0 ? profile.online_elo : null,
      onlineGames: profile.online_games || 0,
    })),
    ratingsAvailable,
  };
}

async function callSocialRpc(name, arguments_) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Social features are not configured on this server yet.');
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: makeAuthorizationHeader(supabaseServiceRoleKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arguments_),
    signal: AbortSignal.timeout(8000),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The social service returned an unreadable response.');
  }
  if (!response.ok) {
    const schemaMissing = response.status === 404
      || result.code === 'PGRST202'
      || result.code === '42883';
    const error = new Error(schemaMissing
      ? 'Social features need a database update. The site owner must run supabase/schema.sql in the Supabase SQL Editor.'
      : result.message || 'The social service could not complete that request.');
    error.statusCode = schemaMissing ? 503 : response.status < 500 ? response.status : 503;
    throw error;
  }
  return result;
}

function sendSocialResponse(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  }).end(JSON.stringify(body));
}

function makeAuthorizationHeader(accessToken) {
  const scheme = 'Bearer';
  return `${scheme} ${accessToken}`;
}

async function recordOnlineResult(room, whiteScore, termination) {
  if (room.ratingSettlementStarted) return;
  room.ratingSettlementStarted = true;
  const whiteId = room.players.w.accountId;
  const blackId = room.players.b.accountId;
  const historyTermination = ['checkmate', 'resignation'].includes(termination) ? termination : 'draw';
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Online rating storage is not configured. Apply the rating SQL schema and configure the service-role key.');
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/settle_openboard_rated_game`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: makeAuthorizationHeader(supabaseServiceRoleKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_white_id: whiteId,
        p_black_id: blackId,
        p_white_score: whiteScore,
        p_game_id: room.gameId,
        p_room_code: room.code,
        p_pgn: room.chess.pgn(),
        p_termination: historyTermination,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('The account service could not save the online rating result.');
    const ratings = await response.json();
    for (const [id, result] of [[whiteId, ratings?.white], [blackId, ratings?.black]]) {
      const currentSlot = ['w', 'b'].find((color) => room.players[color].accountId === id);
      if (!currentSlot) continue;
      if (Number.isInteger(result?.online_elo)) room.players[currentSlot].onlineElo = result.online_elo;
      if (Number.isInteger(result?.online_games)) room.players[currentSlot].onlineGames = result.online_games;
    }
    broadcast(room, { type: 'rating-updated', playerProfiles: roomPlayerProfiles(room) });
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
        variantLabel: publicRoomVariantLabel(room.variant),
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

function leaveRoom(player, reason = 'disconnect') {
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
  const leavingColor = player.color;
  if (slot?.socket === player.socket) slot.socket = null;
  player.room = null;
  player.color = null;
  player.role = null;
  room.expiresAt = Date.now() + roomLifetimeMs;
  const hasConnectedPlayer = [room.players.w, room.players.b]
    .some((slot) => slot.socket?.readyState === WebSocket.OPEN);
  if (hasConnectedPlayer) {
    const opponentColor = leavingColor === 'w' ? 'b' : 'w';
    const opponentSocket = room.players[opponentColor].socket;
    if (room.rematch) {
      const requesterColor = room.rematch.by;
      const requesterSocket = room.players[requesterColor].socket;
      if (requesterColor === leavingColor) {
        send(opponentSocket, {
          type: reason === 'disconnect' ? 'rematch-opponent-disconnected' : 'rematch-cancelled',
          message: reason === 'disconnect' ? 'Your opponent disconnected before the rematch started.' : 'Your opponent cancelled the rematch request.',
        });
      } else {
        send(requesterSocket, {
          type: reason === 'disconnect' ? 'rematch-opponent-disconnected' : 'rematch-opponent-left',
          message: reason === 'disconnect' ? 'Your opponent disconnected before responding to the rematch.' : 'Your opponent returned to the menu.',
        });
      }
      room.rematch = null;
    }
    if (room.gameEnded) {
      send(opponentSocket, {
        type: reason === 'disconnect' ? 'opponent-disconnected' : 'opponent-returned-to-menu',
      });
    } else {
      broadcast(room, { type: 'opponent-left' });
    }
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
  if (typeof rawMessage !== 'string' || rawMessage.length > 32_768) {
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
    leaveRoom(player, 'menu');
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
    const variant = normalizeOnlineVariant(message.variant);
    if (!variant) {
      send(socket, { type: 'error', message: 'Online custom rules must use an 8×8 board and valid piece movement settings.' });
      return;
    }
    if (player.room) leaveRoom(player, 'replaced');
    const code = generateRoomCode();
    const passwordSalt = roomPassword ? crypto.randomBytes(16) : null;
    const room = {
      code,
      lobbyName,
      isPublic: message.type === 'create-public-room',
      passwordSalt,
      passwordHash: passwordSalt ? hashRoomPassword(roomPassword, passwordSalt) : null,
      gameId: crypto.randomUUID(),
      variant,
      chess: null,
      customMovementBySquare: new Map(),
      customPieceBySquare: new Map(),
      players: {
        w: {
          socket,
          name: player.identity.username,
          countryCode: player.identity.countryCode,
          accountId: player.identity.id,
          onlineElo: player.identity.onlineElo,
          onlineGames: player.identity.onlineGames,
        },
        b: { socket: null, name: 'Black', accountId: null, onlineElo: null, onlineGames: null },
      },
      spectators: new Set(),
      playerChat: [],
      spectatorChat: [],
      gameEnded: false,
      termination: null,
      resultWhiteScore: null,
      drawOfferBy: null,
      rematch: null,
      ratingSettlementStarted: false,
      expiresAt: Date.now() + roomLifetimeMs,
    };
    configureRoomChess(room);
    rooms.set(code, room);
    player.room = room;
    player.color = 'w';
    player.role = 'player';
    send(socket, {
      type: 'room-created',
      code,
      gameId: room.gameId,
      color: 'w',
      name: room.players.b.name,
      countryCode: player.identity.countryCode || null,
      playerProfiles: roomPlayerProfiles(room),
      isPublic: room.isPublic,
      lobbyName: room.lobbyName,
      locked: Boolean(room.passwordHash),
      variant: room.variant,
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
    if (player.room) leaveRoom(player, 'replaced');
    if (!reconnectColor && room.players[color].accountId) {
      configureRoomChess(room);
      room.gameId = crypto.randomUUID();
      room.gameEnded = false;
      room.termination = null;
      room.resultWhiteScore = null;
      room.rematch = null;
      room.ratingSettlementStarted = false;
    }
    room.players[color].socket = socket;
    room.players[color].name = player.identity.username;
    room.players[color].countryCode = player.identity.countryCode;
    room.players[color].accountId = player.identity.id;
    room.players[color].onlineElo = player.identity.onlineElo;
    room.players[color].onlineGames = player.identity.onlineGames;
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
      playerProfiles: roomPlayerProfiles(room),
      playerCountries,
      ...roomPosition(room),
      spectators: room.spectators.size,
      playerChat: room.playerChat,
      spectatorChat: room.spectatorChat,
    };
    broadcastSpectators(room, {
      type: 'spectator-start',
      code: room.code,
      players,
      playerProfiles: roomPlayerProfiles(room),
      playerCountries,
      ...roomPosition(room),
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
      playerProfiles: roomPlayerProfiles(room),
      playerCountries: {
        w: room.players.w.countryCode || null,
        b: room.players.b.countryCode || null,
      },
      ...roomPosition(room),
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

  if (room.rematch && room.rematch.expiresAt <= Date.now()) {
    const requestColor = room.rematch.by;
    const responseColor = requestColor === 'w' ? 'b' : 'w';
    room.rematch = null;
    send(room.players[requestColor].socket, { type: 'rematch-expired' });
    send(room.players[responseColor].socket, { type: 'rematch-expired' });
  }

  if (message.type === 'offer-draw') {
    if (room.gameEnded) {
      send(socket, { type: 'error', message: 'This game has already ended.' });
      return;
    }
    if (room.variant.noDraws) {
      send(socket, { type: 'error', message: 'Draw offers are disabled by this room’s custom rules.' });
      return;
    }
    if (!room.chess.history().length) {
      send(socket, { type: 'error', message: 'Play at least one move before offering a draw.' });
      return;
    }
    if (room.drawOfferBy) {
      send(socket, { type: 'error', message: 'A draw offer is already awaiting a response.' });
      return;
    }
    const opponentColor = player.color === 'w' ? 'b' : 'w';
    const opponent = room.players[opponentColor];
    if (opponent.socket?.readyState !== WebSocket.OPEN) {
      send(socket, { type: 'error', message: 'Your opponent must be connected to receive a draw offer.' });
      return;
    }
    room.drawOfferBy = player.color;
    send(socket, { type: 'draw-offer-sent' });
    send(opponent.socket, {
      type: 'draw-offered',
      color: player.color,
      name: player.identity.username,
    });
    return;
  }

  if (message.type === 'draw-response') {
    if (room.gameEnded || typeof message.accept !== 'boolean') {
      send(socket, { type: 'error', message: 'That draw response is invalid.' });
      return;
    }
    const opponentColor = player.color === 'w' ? 'b' : 'w';
    if (room.drawOfferBy !== opponentColor) {
      send(socket, { type: 'error', message: 'There is no opponent draw offer to respond to.' });
      return;
    }
    const offerer = room.players[opponentColor];
    room.drawOfferBy = null;
    if (!message.accept) {
      send(offerer.socket, { type: 'draw-offer-declined' });
      return;
    }
    room.gameEnded = true;
    room.termination = 'draw';
    room.resultWhiteScore = 0.5;
    broadcast(room, { type: 'draw-agreed' });
    await recordOnlineResult(room, 0.5, 'draw');
    return;
  }

  if (message.type === 'rematch-request') {
    if (!room.gameEnded || message.gameId !== room.gameId) {
      send(socket, { type: 'error', message: 'A rematch can only be requested for the completed game.' });
      return;
    }
    if (room.rematch) {
      send(socket, { type: 'error', message: 'A rematch request is already pending.' });
      return;
    }
    const opponentColor = player.color === 'w' ? 'b' : 'w';
    const opponent = room.players[opponentColor];
    if (opponent.socket?.readyState !== WebSocket.OPEN) {
      send(socket, { type: 'error', message: 'Your opponent is not connected to accept a rematch.' });
      return;
    }
    const requestId = crypto.randomUUID();
    room.rematch = {
      requestId,
      gameId: room.gameId,
      by: player.color,
      expiresAt: Date.now() + rematchRequestLifetimeMs,
    };
    send(socket, { type: 'rematch-waiting', requestId, gameId: room.gameId });
    send(opponent.socket, {
      type: 'rematch-offered',
      requestId,
      gameId: room.gameId,
      name: player.identity.username,
    });
    return;
  }

  if (message.type === 'rematch-cancel') {
    if (!room.rematch || room.rematch.by !== player.color
      || message.requestId !== room.rematch.requestId
      || message.gameId !== room.rematch.gameId || room.gameId !== room.rematch.gameId) {
      send(socket, { type: 'error', message: 'That rematch request is no longer active.' });
      return;
    }
    const opponent = room.players[player.color === 'w' ? 'b' : 'w'];
    room.rematch = null;
    send(socket, { type: 'rematch-request-cancelled' });
    send(opponent.socket, { type: 'rematch-cancelled', message: 'Your opponent cancelled the rematch request.' });
    return;
  }

  if (message.type === 'rematch-response') {
    const pending = room.rematch;
    if (!room.gameEnded || !pending || pending.by === player.color
      || message.accept !== true && message.accept !== false
      || message.requestId !== pending.requestId || message.gameId !== pending.gameId
      || room.gameId !== pending.gameId) {
      send(socket, { type: 'error', message: 'That rematch response is no longer active.' });
      return;
    }
    const requester = room.players[pending.by];
    if (requester.socket?.readyState !== WebSocket.OPEN
      || room.players[player.color].socket?.readyState !== WebSocket.OPEN) {
      room.rematch = null;
      send(socket, { type: 'rematch-opponent-disconnected', message: 'Your opponent disconnected before the rematch started.' });
      return;
    }
    room.rematch = null;
    if (!message.accept) {
      send(requester.socket, { type: 'rematch-declined' });
      send(socket, { type: 'rematch-declined-confirmed' });
      return;
    }
    const previousWhite = room.players.w;
    room.players.w = room.players.b;
    room.players.b = previousWhite;
    for (const color of ['w', 'b']) {
      const currentSocket = room.players[color].socket;
      const connectedPlayer = playersBySocket.get(currentSocket);
      if (connectedPlayer) connectedPlayer.color = color;
    }
    configureRoomChess(room);
    room.gameId = crypto.randomUUID();
    room.gameEnded = false;
    room.termination = null;
    room.resultWhiteScore = null;
    room.drawOfferBy = null;
    room.ratingSettlementStarted = false;
    room.expiresAt = Date.now() + roomLifetimeMs;
    send(room.players.w.socket, { type: 'rematch-accepted' });
    send(room.players.b.socket, { type: 'rematch-accepted' });
    const players = { w: room.players.w.name, b: room.players.b.name };
    const playerCountries = {
      w: room.players.w.countryCode || null,
      b: room.players.b.countryCode || null,
    };
    broadcastSpectators(room, {
      type: 'spectator-start',
      code: room.code,
      players,
      playerProfiles: roomPlayerProfiles(room),
      playerCountries,
      ...roomPosition(room),
      waiting: false,
      spectatorChat: room.spectatorChat,
    });
    for (const color of ['w', 'b']) {
      send(room.players[color].socket, {
        type: 'game-start',
        code: room.code,
        players,
        playerProfiles: roomPlayerProfiles(room),
        playerCountries,
        ...roomPosition(room),
        spectators: room.spectators.size,
        playerChat: room.playerChat,
        spectatorChat: room.spectatorChat,
        color,
        rematch: true,
      });
    }
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
    const move = makeRoomMove(room, from, to, promotion);
    if (!move) {
      send(socket, { type: 'error', message: 'The server rejected that illegal move.' });
      return;
    }
    if (room.drawOfferBy && room.drawOfferBy !== player.color) {
      send(room.players[room.drawOfferBy].socket, {
        type: 'draw-offer-declined',
        reason: 'move',
      });
      room.drawOfferBy = null;
    }
    room.expiresAt = Date.now() + roomLifetimeMs;
    broadcast(room, {
      type: 'move',
      color: player.color,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      ...roomPosition(room),
      turn: room.chess.turn(),
      gameOver: isRoomGameOver(room),
    });
    if (isRoomGameOver(room)) {
      room.gameEnded = true;
      room.termination = roomTermination(room);
      const whiteScore = room.chess.in_checkmate() || (room.chess.in_stalemate() && room.variant.noDraws)
        ? room.chess.turn() === 'w' ? 0 : 1
        : 0.5;
      room.resultWhiteScore = whiteScore;
      broadcast(room, {
        type: 'game-ended',
        gameId: room.gameId,
        termination: room.termination,
        whiteScore,
      });
      await recordOnlineResult(room, whiteScore, room.termination);
    }
    return;
  }

  if (message.type === 'resign') {
    if (room.gameEnded) {
      send(socket, { type: 'error', message: 'This game has already ended.' });
      return;
    }
    room.gameEnded = true;
    room.termination = 'resignation';
    const whiteScore = player.color === 'w' ? 0 : 1;
    room.resultWhiteScore = whiteScore;
    broadcast(room, { type: 'resigned', color: player.color, gameId: room.gameId });
    broadcast(room, {
      type: 'game-ended',
      gameId: room.gameId,
      termination: room.termination,
      whiteScore,
    });
    if (room.chess.history().length) {
      await recordOnlineResult(room, whiteScore, room.termination);
    } else {
      broadcast(room, { type: 'rating-not-counted' });
    }
    return;
  }

  send(socket, { type: 'error', message: 'Unsupported game action.' });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');
  if (requestUrl.pathname === '/community/members') {
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
    if (!allowSocialRequest(request, response)) return;
    const search = requestUrl.searchParams.get('search')?.trim() || '';
    const countryCode = requestUrl.searchParams.get('country')?.toUpperCase() || '';
    const sort = requestUrl.searchParams.get('sort') || 'name';
    const ratedOnly = requestUrl.searchParams.get('rated') === 'true';
    if ((search && !/^[A-Za-z0-9_]{1,20}$/.test(search))
      || (countryCode && !/^[A-Z]{2}$/.test(countryCode))
      || !['name', 'rating'].includes(sort)
      || (requestUrl.searchParams.has('rated') && !['true', 'false'].includes(requestUrl.searchParams.get('rated')))) {
      sendSocialResponse(response, 400, { message: 'Choose a valid member search, country, rating filter, and sort order.' });
      return;
    }
    try {
      sendSocialResponse(response, 200, await loadPublicMembers({ search, countryCode, ratedOnly, sort }));
    } catch (error) {
      console.error('Members directory request failed:', error.message);
      sendSocialResponse(response, 503, { message: error.message || 'The members directory is temporarily unavailable.' });
    }
    return;
  }
  const isSocialRequest = requestUrl.pathname === '/social' || requestUrl.pathname.startsWith('/social/');
  if (isSocialRequest) {
    addAuthCorsHeaders(request, response);
    if (request.headers.origin && !isAllowedOrigin(request.headers.origin)) {
      response.writeHead(403).end();
      return;
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
      }).end();
      return;
    }
    if (!['GET', 'POST'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, POST, OPTIONS' }).end();
      return;
    }
    if (!allowSocialRequest(request, response)) return;

    try {
      const [, accessToken] = /^Bearer\s+(.+)$/i.exec(request.headers.authorization || '') || [];
      if (!accessToken) {
        sendSocialResponse(response, 401, { message: 'Sign in to use friends and messages.' });
        return;
      }
      const identity = await authenticateAccessToken(accessToken);
      let result;

      if (request.method === 'GET' && requestUrl.pathname === '/social/overview') {
        result = await callSocialRpc('openboard_social_overview', { p_user_id: identity.id });
      } else if (request.method === 'GET' && requestUrl.pathname === '/social/history/online') {
        result = await callSocialRpc('openboard_load_online_game_history', { p_user_id: identity.id });
      } else if (request.method === 'POST' && requestUrl.pathname === '/social/challenges') {
        const body = await readJsonBody(request);
        const username = typeof body?.username === 'string' ? body.username.trim() : '';
        const challengeType = body?.challengeType;
        const roomCode = typeof body?.roomCode === 'string' ? body.roomCode.trim().toUpperCase() : null;
        const scheduledAt = typeof body?.scheduledAt === 'string' ? new Date(body.scheduledAt) : null;
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)
          || !['now', 'scheduled'].includes(challengeType)
          || (challengeType === 'now'
            && (!roomCode || !/^[A-Z0-9]{6}$/.test(roomCode) || body?.scheduledAt != null))
          || (challengeType === 'scheduled'
            && (body?.roomCode != null || !scheduledAt || Number.isNaN(scheduledAt.getTime())
              || scheduledAt.getTime() < Date.now() + 60_000))) {
          sendSocialResponse(response, 400, { message: 'Choose a player and provide a valid play-now or future scheduled challenge.' });
          return;
        }
        result = await callSocialRpc('openboard_create_game_challenge', {
          p_sender_id: identity.id,
          p_username_key: username.toLowerCase(),
          p_challenge_type: challengeType,
          p_room_code: roomCode,
          p_scheduled_at: scheduledAt?.toISOString() || null,
        });
        sendSocialResponse(response, 200, result);
        return;
      } else if (request.method === 'POST' && requestUrl.pathname === '/social/challenges/respond') {
        const body = await readJsonBody(request);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.challengeId || '')
          || typeof body?.accept !== 'boolean') {
          sendSocialResponse(response, 400, { message: 'Choose a valid challenge and response.' });
          return;
        }
        result = await callSocialRpc('openboard_respond_game_challenge', {
          p_user_id: identity.id,
          p_challenge_id: body.challengeId,
          p_accept: body.accept,
        });
      } else if (request.method === 'POST' && requestUrl.pathname === '/social/friends/request') {
        const body = await readJsonBody(request);
        const username = typeof body?.username === 'string' ? body.username.trim() : '';
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
          sendSocialResponse(response, 400, { message: 'Enter a username with 3–20 letters, numbers, or underscores.' });
          return;
        }
        result = await callSocialRpc('openboard_send_friend_request', {
          p_sender_id: identity.id,
          p_username_key: username.toLowerCase(),
        });
        if (result.status === 'not_found') {
          sendSocialResponse(response, 404, { message: 'No player was found with that username.' });
          return;
        }
        sendSocialResponse(response, 200, result);
        return;
      } else if (request.method === 'POST' && requestUrl.pathname === '/social/friends/respond') {
        const body = await readJsonBody(request);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.requestId || '')
          || typeof body?.accept !== 'boolean') {
          sendSocialResponse(response, 400, { message: 'Choose a valid friend request and response.' });
          return;
        }
        result = await callSocialRpc('openboard_respond_friend_request', {
          p_user_id: identity.id,
          p_request_id: body.requestId,
          p_accept: body.accept,
        });
      } else if (request.method === 'POST' && requestUrl.pathname === '/social/blocks') {
        const body = await readJsonBody(request);
        const username = typeof body?.username === 'string' ? body.username.trim() : '';
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username) || typeof body?.block !== 'boolean') {
          sendSocialResponse(response, 400, { message: 'Choose a player and whether to block or unblock them.' });
          return;
        }
        result = await callSocialRpc('openboard_block_user', {
          p_user_id: identity.id,
          p_target_username_key: username.toLowerCase(),
          p_block: body.block,
        });
      } else if (request.method === 'POST' && requestUrl.pathname === '/social/messages') {
        const body = await readJsonBody(request);
        const username = typeof body?.username === 'string' ? body.username.trim() : '';
        const text = typeof body?.text === 'string'
          ? body.text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
          : '';
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username) || !text || text.length > 1000) {
          sendSocialResponse(response, 400, { message: 'Enter a valid friend username and a message up to 1,000 characters.' });
          return;
        }
        result = await callSocialRpc('openboard_send_direct_message', {
          p_sender_id: identity.id,
          p_recipient_username_key: username.toLowerCase(),
          p_body: text,
        });
      } else {
        const messagePath = /^\/social\/messages\/([0-9a-f-]+)$/i.exec(requestUrl.pathname);
        if (request.method !== 'GET' || !messagePath
          || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messagePath[1])) {
          sendSocialResponse(response, 404, { message: 'That social feature was not found.' });
          return;
        }
        result = await callSocialRpc('openboard_load_direct_messages', {
          p_user_id: identity.id,
          p_peer_id: messagePath[1],
        });
      }

      sendSocialResponse(response, 200, result);
    } catch (error) {
      const message = error.message || 'The social service is temporarily unavailable.';
      const statusCode = error.statusCode
        || (/sign in|sign-in expired|invalid.*token/i.test(message) ? 401 : 503);
      if (statusCode >= 500) console.error('Social request failed:', message);
      sendSocialResponse(response, statusCode, { message });
    }
    return;
  }

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
        'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
      }).end();
      return;
    }
    if (request.method !== 'GET' && !(isOwnProfileRequest && request.method === 'PATCH')) {
      response.writeHead(405, { Allow: isOwnProfileRequest ? 'GET, PATCH, OPTIONS' : 'GET, OPTIONS' }).end();
      return;
    }
    try {
      let profile;
      let viewerIdentity = null;
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
        if (request.method === 'PATCH') {
          const body = await readJsonBody(request, 200000);
          const countryCode = body?.countryCode == null
            ? null
            : typeof body.countryCode === 'string' ? body.countryCode.trim() : body.countryCode;
          const bio = body?.bio == null ? null : body.bio;
          const avatarData = body?.avatarData == null ? null : body.avatarData;
          if (countryCode !== null && (typeof countryCode !== 'string' || !/^[A-Za-z]{2}$/.test(countryCode))) {
            response.writeHead(400, {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json; charset=utf-8',
            }).end(JSON.stringify({ message: 'Choose a valid country or region.' }));
            return;
          }
          if (bio !== null && (typeof bio !== 'string' || bio.length > 160)) {
            response.writeHead(400, {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json; charset=utf-8',
            }).end(JSON.stringify({ message: 'Your bio must be 160 characters or fewer.' }));
            return;
          }
          if (avatarData !== null && (typeof avatarData !== 'string'
            || (avatarData !== '' && (!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(avatarData)
              || avatarData.length > 180000)))) {
            response.writeHead(400, {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json; charset=utf-8',
            }).end(JSON.stringify({ message: 'Choose a valid profile image.' }));
            return;
          }
          if (countryCode === null && bio === null && avatarData === null) {
            response.writeHead(400, {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json; charset=utf-8',
            }).end(JSON.stringify({ message: 'There are no profile changes to save.' }));
            return;
          }
          await callSocialRpc('openboard_update_profile', {
            p_user_id: identity.id,
            p_country_code: countryCode?.toUpperCase() || null,
            p_bio: bio,
            p_avatar_data: avatarData,
          });
          const result = await loadProfile('id', identity.id);
          if (!result) throw new Error('Your player profile could not be found.');
          result.isOwnProfile = true;
          response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
          }).end(JSON.stringify(result));
          return;
        }
        profile = await loadProfile('id', identity.id);
        if (profile) profile.isOwnProfile = true;
      } else {
        const [, accessToken] = /^Bearer\s+(.+)$/i.exec(request.headers.authorization || '') || [];
        if (accessToken) viewerIdentity = await authenticateAccessToken(accessToken);
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
        if (profile && viewerIdentity) {
          profile.isOwnProfile = profile.id === viewerIdentity.id
            || profile.username.toLowerCase() === viewerIdentity.username.toLowerCase();
        }
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
      let redirectTo;
      try {
        redirectTo = validateSignupRedirectUrl(credentials?.redirectTo, request.headers.origin);
      } catch (error) {
        response.writeHead(400, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        }).end(JSON.stringify({ message: error.message }));
        return;
      }
      try {
        const { status, result } = await createAccountWithCountry({
          username,
          email,
          password,
          countryCode: countryCodeForRequest(request),
          redirectTo,
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
  playersBySocket.set(socket, player);
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
    if (room.rematch?.expiresAt <= now) {
      const requestColor = room.rematch.by;
      const responseColor = requestColor === 'w' ? 'b' : 'w';
      room.rematch = null;
      send(room.players[requestColor].socket, { type: 'rematch-expired' });
      send(room.players[responseColor].socket, { type: 'rematch-expired' });
    }
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
}, 5_000);
cleanupTimer.unref();

async function startRoomServer() {
  const { patchChessSource } = await import('../src/custom-chess-patch.js');
  const chessPath = require.resolve('chess.js');
  const patchedChessModule = new Module(chessPath, module);
  patchedChessModule.filename = chessPath;
  patchedChessModule.paths = Module._nodeModulePaths(path.dirname(chessPath));
  patchedChessModule._compile(
    patchChessSource(fs.readFileSync(chessPath, 'utf8')),
    chessPath,
  );
  Chess = patchedChessModule.exports.Chess;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Openboard online rooms listening on port ${port} (WebSocket /ws).`);
  });
}

startRoomServer().catch((error) => {
  console.error('Could not initialize the online chess rules engine:', error);
  process.exitCode = 1;
});

function shutdown() {
  clearInterval(cleanupTimer);
  for (const socket of websocketServer.clients) socket.close(1001, 'Server is shutting down.');
  websocketServer.close();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
