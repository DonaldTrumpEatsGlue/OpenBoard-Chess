const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { after, before, test } = require('node:test');
const WebSocket = require('ws');

let serverProcess;
let endpoint;
let authServer;
let authUrl;
const authUsers = new Map();
const passwordRecoveryRequests = [];
const ratedGameRequests = [];
let userIdCounter = 1;

async function findOpenPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(port) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/health`, (response) => {
          response.resume();
          response.statusCode === 200 ? resolve() : reject(new Error(`Unexpected status ${response.statusCode}`));
        }).on('error', reject);
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('Online room server did not start in time.');
}

function createAccount(username, verified = false) {
  const token = `test-access-token-long-${userIdCounter}`;
  const id = `00000000-0000-4000-8000-${String(userIdCounter++).padStart(12, '0')}`;
  authUsers.set(token, {
    id,
    username,
    email: `${username.toLowerCase()}@example.test`,
    online_elo: 1000,
    online_games: 0,
    online_wins: 0,
    online_draws: 0,
    online_losses: 0,
    password: 'test-password-123',
    email_confirmed_at: verified ? new Date().toISOString() : null,
    confirmed_at: verified ? new Date().toISOString() : null,
  });
  return token;
}

async function connect(origin, username = 'Host') {
  const token = createAccount(username);
  return connectWithAccessToken(token, username, origin);
}

async function connectWithAccessToken(token, username, origin) {
  const socket = new WebSocket(endpoint, origin ? { origin } : {});
  await once(socket, 'open');
  const authenticated = request(socket, { type: 'authenticate', accessToken: token });
  assert.deepEqual(await authenticated, { type: 'authenticated', username });
  return socket;
}

function request(socket, message) {
  const response = once(socket, 'message').then(([data]) => JSON.parse(data.toString()));
  socket.send(JSON.stringify(message));
  return response;
}

function postJson(url, payload, origin = 'https://sample-user.github.io') {
  return new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
      },
    }, (response) => {
      let rawBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { rawBody += chunk; });
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: JSON.parse(rawBody),
      }));
    });
    request.on('error', reject);
    request.end(JSON.stringify(payload));
  });
}

function getJson(url, accessToken = '', origin = 'https://sample-user.github.io') {
  return new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: 'GET',
      headers: {
        Origin: origin,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    }, (response) => {
      let rawBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { rawBody += chunk; });
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: JSON.parse(rawBody),
      }));
    });
    request.on('error', reject);
    request.end();
  });
}

function waitForMessage(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timed out waiting for the expected room message.'));
    }, 3_000);
    const onMessage = (data) => {
      const message = JSON.parse(data.toString());
      if (!predicate(message)) return;
      clearTimeout(timeout);
      socket.off('message', onMessage);
      resolve(message);
    };
    socket.on('message', onMessage);
  });
}

function sendAndWait(socket, payload, predicate) {
  const response = waitForMessage(socket, predicate);
  socket.send(JSON.stringify(payload));
  return response;
}

async function assertReplacementStartsNewGame(departureType) {
  const host = await connect(undefined, `ResetHost${departureType}`);
  const departingGuest = await connect(undefined, `ResetGuest${departureType}`);
  const replacement = await connect(undefined, `Replacement${departureType}`);
  try {
    const room = await request(host, {
      type: 'create-public-room',
      lobbyName: `Reset after ${departureType}`,
    });
    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    await Promise.all([
      request(departingGuest, { type: 'join-public-room', code: room.code }),
      hostStart,
    ]);

    await sendAndWait(host, { type: 'move', from: 'e2', to: 'e4' }, (message) => message.type === 'move');
    const opponentLeft = waitForMessage(host, (message) => message.type === 'opponent-left');
    if (departureType === 'leave') {
      await sendAndWait(departingGuest, { type: 'leave-room' }, (message) => message.type === 'left-room');
    } else {
      departingGuest.close();
    }
    await opponentLeft;

    const replacementHostStart = waitForMessage(host, (message) => message.type === 'game-start');
    const replacementStart = request(replacement, {
      type: 'join-public-room',
      code: room.code,
    });
    const [hostGame, replacementGame] = await Promise.all([replacementHostStart, replacementStart]);
    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    assert.equal(hostGame.fen, initialFen);
    assert.equal(replacementGame.fen, initialFen);
    assert.equal(hostGame.pgn, '');
    assert.equal(replacementGame.pgn, '');
    assert.equal(replacementGame.color, 'b');
  } finally {
    host.close();
    departingGuest.close();
    replacement.close();
  }
}

before(async () => {
  authServer = http.createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    const token = request.headers.authorization?.replace(/^Bearer /, '');
    const user = authUsers.get(token);
    if (request.url === '/auth/v1/user') {
      response.writeHead(user ? 200 : 401).end(JSON.stringify(user || { message: 'Invalid token' }));
      return;
    }
    if (request.url?.startsWith('/auth/v1/recover')) {
      let rawBody = '';
      for await (const chunk of request) rawBody += chunk;
      passwordRecoveryRequests.push({
        ...JSON.parse(rawBody),
        redirectTo: new URL(request.url, 'http://localhost').searchParams.get('redirect_to'),
      });
      response.writeHead(200).end('{}');
      return;
    }
    if (request.url === '/auth/v1/verify') {
      let rawBody = '';
      for await (const chunk of request) rawBody += chunk;
      const { email, token: recoveryToken, type } = JSON.parse(rawBody);
      const account = [...authUsers.entries()].find(([, candidate]) => candidate.email === email);
      const verified = type === 'recovery' && recoveryToken === '123456' && account;
      response.writeHead(verified ? 200 : 400).end(JSON.stringify(verified
        ? {
          access_token: account[0],
          refresh_token: `test-refresh-${account[0]}`,
          user: { id: account[1].id, email: account[1].email, username: account[1].username },
        }
        : { message: 'Invalid token' }));
      return;
    }
    if (request.url === '/rest/v1/rpc/settle_openboard_rated_game') {
      let rawBody = '';
      for await (const chunk of request) rawBody += chunk;
      const { p_white_id: whiteId, p_black_id: blackId, p_white_score: whiteScore } = JSON.parse(rawBody);
      const whiteEntry = [...authUsers.entries()].find(([, candidate]) => candidate.id === whiteId);
      const blackEntry = [...authUsers.entries()].find(([, candidate]) => candidate.id === blackId);
      if (!whiteEntry || !blackEntry) {
        response.writeHead(400).end(JSON.stringify({ message: 'Player profile missing' }));
        return;
      }
      const white = whiteEntry[1];
      const black = blackEntry[1];
      const whiteExpected = 1 / (1 + (10 ** ((black.online_elo - white.online_elo) / 400)));
      const blackExpected = 1 - whiteExpected;
      white.online_elo = Math.max(100, Math.round(white.online_elo + (32 * (whiteScore - whiteExpected))));
      black.online_elo = Math.max(100, Math.round(black.online_elo + (32 * ((1 - whiteScore) - blackExpected))));
      white.online_games += 1;
      black.online_games += 1;
      const whiteResult = whiteScore === 1 ? 'win' : whiteScore === 0 ? 'loss' : 'draw';
      const blackResult = whiteScore === 0 ? 'win' : whiteScore === 1 ? 'loss' : 'draw';
      white[`online_${whiteResult === 'win' ? 'wins' : whiteResult === 'loss' ? 'losses' : 'draws'}`] += 1;
      black[`online_${blackResult === 'win' ? 'wins' : blackResult === 'loss' ? 'losses' : 'draws'}`] += 1;
      ratedGameRequests.push(JSON.parse(rawBody));
      response.writeHead(200).end(JSON.stringify({
        white: { username: white.username, online_elo: white.online_elo, online_games: white.online_games },
        black: { username: black.username, online_elo: black.online_elo, online_games: black.online_games },
      }));
      return;
    }
    if (request.url?.startsWith('/auth/v1/admin/users/')) {
      if (request.headers.apikey !== 'test-service-role-key') {
        response.writeHead(401).end('{}');
        return;
      }
      const requestedId = request.url.split('/').pop();
      const account = [...authUsers.values()].find((candidate) => candidate.id === requestedId);
      response.writeHead(account ? 200 : 404).end(JSON.stringify(account
        ? { id: account.id, email: account.email }
        : { message: 'User not found' }));
      return;
    }
    if (request.url?.startsWith('/auth/v1/token?grant_type=password')) {
      let rawBody = '';
      for await (const chunk of request) rawBody += chunk;
      const credentials = JSON.parse(rawBody);
      const account = [...authUsers.entries()].find(([, candidate]) => (
        candidate.email === credentials.email && candidate.password === credentials.password
      ));
      response.writeHead(account ? 200 : 400).end(JSON.stringify(account
        ? {
          access_token: account[0],
          refresh_token: `test-refresh-${account[0]}`,
          user: { id: account[1].id, email: account[1].email, username: account[1].username },
        }
        : { message: 'Invalid login credentials' }));
      return;
    }
    if (request.url?.startsWith('/rest/v1/profiles')) {
      const url = new URL(request.url, 'http://localhost');
      const usernameKey = url.searchParams.get('username_key')?.slice(3);
      const selectedFields = url.searchParams.get('select');
      if (usernameKey !== undefined) {
        if (selectedFields === 'id' && request.headers.apikey !== 'test-service-role-key') {
          response.writeHead(401).end('{}');
          return;
        }
        const account = [...authUsers.values()].find((candidate) => (
          candidate.username.toLowerCase() === usernameKey
        ));
        response.writeHead(200).end(JSON.stringify(account
          ? [selectedFields === 'id'
            ? { id: account.id }
            : {
              username: account.username,
              online_elo: account.online_elo,
              online_games: account.online_games,
              online_wins: account.online_wins,
              online_draws: account.online_draws,
              online_losses: account.online_losses,
            }]
          : []));
        return;
      }
      const requestedId = url.searchParams.get('id')?.slice(3);
      const requestedUser = user?.id === requestedId ? user : null;
      const profile = [...authUsers.values()].find((candidate) => candidate.id === requestedId);
      response.writeHead(200).end(JSON.stringify(profile
        ? selectedFields === 'username'
          ? requestedUser ? [{ username: requestedUser.username }] : []
          : [{
            username: profile.username,
            online_elo: profile.online_elo,
            online_games: profile.online_games,
            online_wins: profile.online_wins,
            online_draws: profile.online_draws,
            online_losses: profile.online_losses,
          }]
        : []));
      return;
    }
    response.writeHead(404).end('{}');
  });
  authServer.listen(0, '127.0.0.1');
  await once(authServer, 'listening');
  authUrl = `http://127.0.0.1:${authServer.address().port}`;

  const port = await findOpenPort();
  endpoint = `ws://127.0.0.1:${port}/ws`;
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      OPENBOARD_PORT: String(port),
      OPENBOARD_ALLOWED_ORIGINS: 'https://*.github.io',
      SUPABASE_URL: authUrl,
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
    stdio: 'ignore',
  });
  await waitForServer(port);
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill('SIGTERM');
    await once(serverProcess, 'exit');
  }
  if (authServer?.listening) {
    authServer.close();
    await once(authServer, 'close');
  }
});

test('origin allowlist supports GitHub Pages subdomains and rejects unrelated websites', async () => {
  const pagesSocket = await connect('https://sample-user.github.io', 'PagesPlayer');
  pagesSocket.close();

  const rejectedSocket = new WebSocket(endpoint, { origin: 'https://example.com' });
  const [error] = await once(rejectedSocket, 'error');
  assert.match(error.message, /Unexpected server response: 403/);
});

test('database schema reserves case-insensitive usernames when accounts are created', () => {
  const schema = readFileSync(path.resolve(__dirname, '../../supabase/schema.sql'), 'utf8');
  assert.match(schema, /username_key text not null unique/i);
  assert.match(schema, /after insert on auth\.users/i);
  assert.match(schema, /new\.raw_user_meta_data\s*->>\s*'username'/i);
  assert.match(schema, /lower\(requested_username\)/i);
  assert.match(schema, /raise exception 'username_taken'/i);
  assert.doesNotMatch(schema, /new\.email_confirmed_at is null/i);
  assert.match(schema, /from auth\.users as users[\s\S]*on conflict do nothing/i);
});

test('online actions require an account and use its reserved username without email verification', async () => {
  const anonymous = await new WebSocket(endpoint);
  await once(anonymous, 'open');
  const denied = await request(anonymous, { type: 'list-public-rooms' });
  assert.equal(denied.type, 'error');
  assert.match(denied.message, /sign in to your openboard account/i);
  anonymous.close();

  const token = createAccount('Unverified', false);
  const unverified = await new WebSocket(endpoint);
  await once(unverified, 'open');
  const authAccepted = await request(unverified, { type: 'authenticate', accessToken: token });
  assert.deepEqual(authAccepted, { type: 'authenticated', username: 'Unverified' });
  unverified.close();

  const host = await connect(undefined, 'ReservedOwner');
  try {
    const created = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Sunday Chess',
      name: 'StolenName',
    });
    assert.equal(created.type, 'room-created');
    assert.equal(created.lobbyName, 'Sunday Chess');
    const browser = await connect(undefined, 'VerifiedJoiner');
    try {
      const listing = await request(browser, { type: 'list-public-rooms' });
      assert.deepEqual(listing.rooms, [{
        code: created.code,
        name: 'Sunday Chess',
        host: 'ReservedOwner',
        hostOnline: true,
        locked: false,
        inProgress: false,
        joinable: true,
        isYourGame: false,
        canJoin: true,
        canWatch: true,
        spectators: 0,
      }]);
    } finally {
      browser.close();
    }
  } finally {
    host.close();
  }
});

test('username sign-in returns an auth session without disclosing the account email', async () => {
  const token = createAccount('UsernameLogin');
  const endpointUrl = new URL(endpoint);
  endpointUrl.protocol = 'http:';
  endpointUrl.pathname = '/auth/username';
  endpointUrl.search = '';
  endpointUrl.hash = '';

  const result = await postJson(endpointUrl, {
    username: 'uSeRnAmElOgIn',
    password: 'test-password-123',
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers['access-control-allow-origin'], 'https://sample-user.github.io');
  assert.equal(result.body.access_token, token);
  assert.ok(result.body.refresh_token);
  assert.equal(JSON.stringify(result.body).includes('@example.test'), false);

  const authenticatedSocket = await connectWithAccessToken(token, 'UsernameLogin');
  authenticatedSocket.close();

  const invalidPassword = await postJson(endpointUrl, {
    username: 'UsernameLogin',
    password: 'incorrect-password',
  });
  assert.equal(invalidPassword.status, 401);
  assert.deepEqual(invalidPassword.body, { message: 'Invalid username or password.' });

  const unknownAccount = await postJson(endpointUrl, {
    username: 'UnknownUser',
    password: 'test-password-123',
  });
  assert.equal(unknownAccount.status, 401);
  assert.deepEqual(unknownAccount.body, { message: 'Invalid username or password.' });
});

test('public player profiles show online ratings but never expose account emails', async () => {
  const token = createAccount('PublicProfileOwner');
  const profileUrl = new URL(endpoint);
  profileUrl.protocol = 'http:';
  profileUrl.pathname = '/profiles/publicprofileowner';
  profileUrl.search = '';
  profileUrl.hash = '';

  const publicProfile = await getJson(profileUrl);
  assert.equal(publicProfile.status, 200);
  assert.deepEqual(publicProfile.body, {
    username: 'PublicProfileOwner',
    onlineElo: 1000,
    onlineGames: 0,
    onlineWins: 0,
    onlineDraws: 0,
    onlineLosses: 0,
  });
  assert.equal(JSON.stringify(publicProfile.body).includes('@example.test'), false);

  const privateProfileUrl = new URL(endpoint);
  privateProfileUrl.protocol = 'http:';
  privateProfileUrl.pathname = '/profile/me';
  privateProfileUrl.search = '';
  privateProfileUrl.hash = '';
  assert.equal((await getJson(privateProfileUrl)).status, 401);
  const ownProfile = await getJson(privateProfileUrl, token);
  assert.equal(ownProfile.status, 200);
  assert.equal(ownProfile.body.username, 'PublicProfileOwner');
  assert.equal(JSON.stringify(ownProfile.body).includes('@example.test'), false);
});

test('completed online games update both player ratings and records exactly once', async () => {
  const whiteToken = createAccount('RatingWhite');
  const blackToken = createAccount('RatingBlack');
  const white = await connectWithAccessToken(whiteToken, 'RatingWhite');
  const black = await connectWithAccessToken(blackToken, 'RatingBlack');
  try {
    const room = await request(white, { type: 'create-room', lobbyName: 'Rated game' });
    const whiteStart = waitForMessage(white, (message) => message.type === 'game-start');
    const blackStart = request(black, { type: 'join-room', code: room.code });
    await Promise.all([whiteStart, blackStart]);

    const whiteMove = waitForMessage(white, (message) => message.type === 'move');
    const blackMove = waitForMessage(black, (message) => message.type === 'move');
    white.send(JSON.stringify({ type: 'move', from: 'e2', to: 'e4' }));
    await Promise.all([whiteMove, blackMove]);

    const whiteResigned = waitForMessage(white, (message) => message.type === 'resigned');
    const whiteUpdated = waitForMessage(white, (message) => message.type === 'rating-updated');
    const blackUpdated = waitForMessage(black, (message) => message.type === 'rating-updated');
    black.send(JSON.stringify({ type: 'resign' }));
    await Promise.all([whiteResigned, whiteUpdated, blackUpdated]);

    const whiteProfileUrl = new URL(endpoint);
    whiteProfileUrl.protocol = 'http:';
    whiteProfileUrl.pathname = '/profiles/ratingwhite';
    const blackProfileUrl = new URL(whiteProfileUrl);
    blackProfileUrl.pathname = '/profiles/ratingblack';
    const [whiteProfile, blackProfile] = await Promise.all([
      getJson(whiteProfileUrl),
      getJson(blackProfileUrl),
    ]);
    assert.equal(whiteProfile.body.onlineElo, 1016);
    assert.equal(whiteProfile.body.onlineGames, 1);
    assert.equal(whiteProfile.body.onlineWins, 1);
    assert.equal(blackProfile.body.onlineElo, 984);
    assert.equal(blackProfile.body.onlineGames, 1);
    assert.equal(blackProfile.body.onlineLosses, 1);
    assert.equal(ratedGameRequests.length, 1);
  } finally {
    white.close();
    black.close();
  }
});

test('unplayed online games do not change player ratings', async () => {
  const whiteToken = createAccount('UnplayedWhite');
  const blackToken = createAccount('UnplayedBlack');
  const white = await connectWithAccessToken(whiteToken, 'UnplayedWhite');
  const black = await connectWithAccessToken(blackToken, 'UnplayedBlack');
  const ratingRequestCount = ratedGameRequests.length;
  try {
    const room = await request(white, { type: 'create-room', lobbyName: 'Unplayed game' });
    const whiteStart = waitForMessage(white, (message) => message.type === 'game-start');
    const blackStart = request(black, { type: 'join-room', code: room.code });
    await Promise.all([whiteStart, blackStart]);

    const notRated = waitForMessage(white, (message) => message.type === 'rating-not-counted');
    const blackResigned = waitForMessage(black, (message) => message.type === 'resigned');
    black.send(JSON.stringify({ type: 'resign' }));
    await Promise.all([notRated, blackResigned]);
    assert.equal(ratedGameRequests.length, ratingRequestCount);
  } finally {
    white.close();
    black.close();
  }
});

test('password recovery accepts email or username without revealing the linked email', async () => {
  const token = createAccount('RecoveryOwner');
  const endpointUrl = new URL(endpoint);
  endpointUrl.protocol = 'http:';
  endpointUrl.pathname = '/auth/recover';
  endpointUrl.search = '';
  endpointUrl.hash = '';
  const redirectTo = 'https://donaldtrumpeatsglue.github.io/OpenBoardChess/';
  const genericMessage = 'If an account exists for that email or username, password reset instructions have been sent.';

  const usernameResult = await postJson(endpointUrl, {
    identity: 'rEcOvErYoWnEr',
    redirectTo,
  });
  assert.equal(usernameResult.status, 200);
  assert.deepEqual(usernameResult.body, { message: genericMessage });
  assert.equal(passwordRecoveryRequests.at(-1).email, 'recoveryowner@example.test');
  assert.equal(passwordRecoveryRequests.at(-1).redirectTo, redirectTo);
  assert.equal(JSON.stringify(usernameResult.body).includes('@example.test'), false);

  const emailResult = await postJson(endpointUrl, {
    identity: 'recoveryowner@example.test',
    redirectTo,
  });
  assert.equal(emailResult.status, 200);
  assert.deepEqual(emailResult.body, { message: genericMessage });
  assert.equal(passwordRecoveryRequests.at(-1).email, 'recoveryowner@example.test');

  const unknownResult = await postJson(endpointUrl, {
    identity: 'UnknownRecovery',
    redirectTo,
  });
  assert.equal(unknownResult.status, 200);
  assert.deepEqual(unknownResult.body, { message: genericMessage });
});

test('password recovery codes verify by username without exposing the account email', async () => {
  const token = createAccount('RecoveryCodeOwner');
  const endpointUrl = new URL(endpoint);
  endpointUrl.protocol = 'http:';
  endpointUrl.pathname = '/auth/verify-recovery';
  endpointUrl.search = '';
  endpointUrl.hash = '';

  const result = await postJson(endpointUrl, {
    identity: 'recoverycodeowner',
    token: '123456',
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.access_token, token);
  assert.ok(result.body.refresh_token);
  assert.equal(result.body.user.email, undefined);
  assert.equal(JSON.stringify(result.body).includes('@example.test'), false);

  const invalidCode = await postJson(endpointUrl, {
    identity: 'recoverycodeowner',
    token: '000000',
  });
  assert.equal(invalidCode.status, 400);
  assert.deepEqual(invalidCode.body, { message: 'The recovery code is invalid or expired.' });
});

test('one account cannot create multiple active rooms from repeated or parallel requests', async () => {
  const token = createAccount('SingleRoomOwner');
  const host = await connectWithAccessToken(token, 'SingleRoomOwner');
  const secondConnection = await connectWithAccessToken(token, 'SingleRoomOwner');
  try {
    const created = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Only Room',
    });
    assert.equal(created.type, 'room-created');

    const repeatedCreate = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Duplicate Room',
    });
    assert.equal(repeatedCreate.type, 'error');
    assert.match(repeatedCreate.message, new RegExp(created.code));

    const parallelCreate = await request(secondConnection, {
      type: 'create-room',
      lobbyName: 'Second Connection Room',
    });
    assert.equal(parallelCreate.type, 'error');
    assert.match(parallelCreate.message, new RegExp(created.code));

    const listing = await request(secondConnection, { type: 'list-public-rooms' });
    assert.equal(listing.rooms.filter((room) => room.code === created.code).length, 1);
  } finally {
    host.close();
    secondConnection.close();
  }
});

test('a player can explicitly leave a room and create another lobby', async () => {
  const host = await connect(undefined, 'LeavingHost');
  const guest = await connect(undefined, 'StayingGuest');
  try {
    const created = await request(host, {
      type: 'create-room',
      lobbyName: 'First lobby',
    });
    assert.equal(created.type, 'room-created');
    const gameStart = waitForMessage(host, (message) => message.type === 'game-start');
    const guestStart = waitForMessage(guest, (message) => message.type === 'game-start');
    guest.send(JSON.stringify({ type: 'join-room', code: created.code }));
    await Promise.all([gameStart, guestStart]);

    const opponentLeft = waitForMessage(guest, (message) => message.type === 'opponent-left');
    const left = await sendAndWait(host, { type: 'leave-room' }, (message) => message.type === 'left-room');
    assert.deepEqual(left, { type: 'left-room' });
    await opponentLeft;

    const nextLobby = await request(host, {
      type: 'create-room',
      lobbyName: 'Second lobby',
    });
    assert.equal(nextLobby.type, 'room-created');
    assert.notEqual(nextLobby.code, created.code);
  } finally {
    host.close();
    guest.close();
  }
});

test('a public lobby is removed and cannot be rejoined after both players leave', async () => {
  const hostToken = createAccount('EmptyLobbyHost');
  const host = await connectWithAccessToken(hostToken, 'EmptyLobbyHost');
  const guest = await connect(undefined, 'EmptyLobbyGuest');
  const browser = await connect(undefined, 'EmptyLobbyBrowser');
  const reconnectingHost = await connectWithAccessToken(hostToken, 'EmptyLobbyHost');
  try {
    const room = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Empty when both leave',
    });
    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    const guestStart = request(guest, { type: 'join-public-room', code: room.code });
    await Promise.all([hostStart, guestStart]);

    const guestDeparture = waitForMessage(guest, (message) => message.type === 'opponent-left');
    await sendAndWait(host, { type: 'leave-room' }, (message) => message.type === 'left-room');
    await guestDeparture;
    await sendAndWait(guest, { type: 'leave-room' }, (message) => message.type === 'left-room');

    const listing = await request(browser, { type: 'list-public-rooms' });
    assert.equal(listing.rooms.some((listedRoom) => listedRoom.code === room.code), false);
    const rejoin = await request(reconnectingHost, {
      type: 'join-public-room',
      code: room.code,
    });
    assert.equal(rejoin.type, 'error');
    assert.match(rejoin.message, /not active/i);
  } finally {
    host.close();
    guest.close();
    browser.close();
    reconnectingHost.close();
  }
});

test('a disconnected guest sees a popup event and can reclaim their reserved seat', async () => {
  const hostToken = createAccount('RejoinHost');
  const guestToken = createAccount('RejoiningGuest');
  const host = await connectWithAccessToken(hostToken, 'RejoinHost');
  const guest = await connectWithAccessToken(guestToken, 'RejoiningGuest');
  const browser = await connect(undefined, 'RejoinBrowser');
  try {
    const room = await request(host, { type: 'create-public-room', lobbyName: 'Reconnect guest' });
    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    const guestStart = request(guest, { type: 'join-public-room', code: room.code });
    await Promise.all([hostStart, guestStart]);

    const guestMove = waitForMessage(guest, (message) => message.type === 'move');
    await sendAndWait(host, { type: 'move', from: 'e2', to: 'e4' }, (message) => message.type === 'move');
    await guestMove;
    const departure = waitForMessage(host, (message) => message.type === 'opponent-left');
    guest.close();
    await departure;

    const listing = await request(browser, { type: 'list-public-rooms' });
    assert.deepEqual(listing.rooms.filter((listedRoom) => listedRoom.code === room.code), [{
      code: room.code,
      name: 'Reconnect guest',
      host: 'RejoinHost',
      hostOnline: true,
      locked: false,
      inProgress: true,
      opponent: 'RejoiningGuest',
      opponentOnline: false,
      joinable: true,
      isYourGame: false,
      canJoin: true,
      canWatch: true,
      spectators: 0,
    }]);

    const rejoinedGuest = await connectWithAccessToken(guestToken, 'RejoiningGuest');
    try {
      const resumedHost = waitForMessage(host, (message) => message.type === 'game-start');
      const resumedGuest = await request(rejoinedGuest, { type: 'join-public-room', code: room.code });
      assert.equal((await resumedHost).color, 'w');
      assert.equal(resumedGuest.color, 'b');
      assert.equal(resumedGuest.players.b, 'RejoiningGuest');
      assert.equal(resumedGuest.fen, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    } finally {
      rejoinedGuest.close();
    }
  } finally {
    host.close();
    browser.close();
  }
});

test('a disconnected public host can rejoin with their original color', async () => {
  const hostToken = createAccount('ReturningHost');
  const host = await connectWithAccessToken(hostToken, 'ReturningHost');
  const guest = await connect(undefined, 'WaitingGuest');
  const browser = await connect(undefined, 'ReturningBrowser');
  try {
    const room = await request(host, { type: 'create-public-room', lobbyName: 'Reconnect host' });
    const guestStart = request(guest, { type: 'join-public-room', code: room.code });
    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    await Promise.all([guestStart, hostStart]);
    const departure = waitForMessage(guest, (message) => message.type === 'opponent-left');
    host.close();
    await departure;

    const listing = await request(browser, { type: 'list-public-rooms' });
    const listedRoom = listing.rooms.find((listed) => listed.code === room.code);
    assert.ok(listedRoom);
    assert.equal(listedRoom.hostOnline, false);
    assert.equal(listedRoom.joinable, true);

    const rejoinedHost = await connectWithAccessToken(hostToken, 'ReturningHost');
    try {
      const resumedGuest = waitForMessage(guest, (message) => message.type === 'game-start');
      const resumedHostGame = await request(rejoinedHost, { type: 'join-public-room', code: room.code });
      assert.equal(resumedHostGame.color, 'w');
      assert.equal((await resumedGuest).color, 'b');
    } finally {
      rejoinedHost.close();
    }
  } finally {
    guest.close();
    browser.close();
  }
});

test('a different player replacing a disconnected guest starts from the initial position', async () => {
  await assertReplacementStartsNewGame('disconnect');
});

test('a different player replacing a guest who left starts from the initial position', async () => {
  await assertReplacementStartsNewGame('leave');
});

test('a player cannot join or spectate their own public lobby, which remains visible to them', async () => {
  const hostToken = createAccount('OwnRoomHost');
  const host = await connectWithAccessToken(hostToken, 'OwnRoomHost');
  const secondHostConnection = await connectWithAccessToken(hostToken, 'OwnRoomHost');
  const guest = await connect(undefined, 'OwnRoomGuest');
  try {
    const room = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Visible own room',
    });
    const ownListing = await request(host, { type: 'list-public-rooms' });
    assert.deepEqual(ownListing.rooms.find((listedRoom) => listedRoom.code === room.code), {
      code: room.code,
      name: 'Visible own room',
      host: 'OwnRoomHost',
      hostOnline: true,
      locked: false,
      inProgress: false,
      joinable: true,
      isYourGame: true,
      canJoin: false,
      canWatch: false,
      spectators: 0,
    });

    const selfWatch = await request(host, { type: 'spectate-room', code: room.code });
    assert.equal(selfWatch.type, 'error');
    assert.match(selfWatch.message, /cannot spectate their own game/i);
    const selfJoin = await request(host, {
      type: 'join-public-room',
      code: room.code,
    });
    assert.equal(selfJoin.type, 'error');
    assert.match(selfJoin.message, /already connected/i);
    const secondConnectionWatch = await request(secondHostConnection, {
      type: 'spectate-room',
      code: room.code,
    });
    assert.equal(secondConnectionWatch.type, 'error');
    assert.match(secondConnectionWatch.message, /cannot spectate their own game/i);
    const secondConnectionJoin = await request(secondHostConnection, {
      type: 'join-public-room',
      code: room.code,
    });
    assert.equal(secondConnectionJoin.type, 'error');
    assert.match(secondConnectionJoin.message, /already connected/i);

    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    const guestStart = await request(guest, { type: 'join-public-room', code: room.code });
    assert.equal(guestStart.type, 'game-start');
    assert.equal((await hostStart).color, 'w');
  } finally {
    host.close();
    secondHostConnection.close();
    guest.close();
  }
});

test('optional lobby passwords block incorrect joins and allow the correct one', async () => {
  const host = await connect(undefined, 'LobbyOwner');
  const wrongGuest = await connect(undefined, 'WrongGuest');
  const guest = await connect(undefined, 'RightGuest');
  const watcher = await connect(undefined, 'LobbyWatcher');
  try {
    const created = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Locked Game',
      password: 'secret-room',
    });
    assert.equal(created.locked, true);

    const listing = await request(wrongGuest, { type: 'list-public-rooms' });
    assert.equal(listing.rooms.find((room) => room.code === created.code).locked, true);

    const denied = await request(wrongGuest, {
      type: 'join-public-room',
      code: created.code,
      password: 'incorrect',
    });
    assert.match(denied.message, /password is incorrect/i);
    const deniedWatch = await request(watcher, {
      type: 'spectate-room',
      code: created.code,
      password: 'incorrect',
    });
    assert.match(deniedWatch.message, /password is incorrect/i);
    const hostCount = once(host, 'message').then(([data]) => JSON.parse(data.toString()));
    const allowedWatch = await request(watcher, {
      type: 'spectate-room',
      code: created.code,
      password: 'secret-room',
    });
    const watcherCount = once(watcher, 'message').then(([data]) => JSON.parse(data.toString()));
    assert.equal(allowedWatch.type, 'spectator-start');
    assert.equal(allowedWatch.waiting, true);
    assert.deepEqual(await hostCount, { type: 'spectator-count', count: 1 });
    assert.deepEqual(await watcherCount, { type: 'spectator-count', count: 1 });

    const hostStart = once(host, 'message').then(([data]) => JSON.parse(data.toString()));
    const guestStart = request(guest, {
      type: 'join-public-room',
      code: created.code,
      password: 'secret-room',
    });
    const [hostGame, guestGame] = await Promise.all([hostStart, guestStart]);
    assert.equal(hostGame.type, 'game-start');
    assert.equal(guestGame.type, 'game-start');
    assert.equal(guestGame.players.w, 'LobbyOwner');
    assert.equal(guestGame.players.b, 'RightGuest');
  } finally {
    for (const socket of [host, wrongGuest, guest, watcher]) socket.close();
  }
});

test('public room browser lists joinable games but not private invites or full games', async () => {
  const host = await connect(undefined, 'PublicHost');
  const privateHost = await connect(undefined, 'PrivateHost');
  const browser = await connect(undefined, 'RoomBrowser');
  const joiner = await connect(undefined, 'RoomJoiner');

  try {
    const publicRoom = await request(host, { type: 'create-public-room', lobbyName: 'Public Lobby' });
    const privateRoom = await request(privateHost, { type: 'create-room', lobbyName: 'Private Lobby' });
    assert.equal(publicRoom.type, 'room-created');
    assert.equal(publicRoom.isPublic, true);
    assert.equal(privateRoom.isPublic, false);

    const listing = await request(browser, { type: 'list-public-rooms' });
    assert.equal(listing.type, 'public-rooms');
    assert.deepEqual(listing.rooms.filter((listedRoom) => listedRoom.code === publicRoom.code), [{
      code: publicRoom.code,
      name: 'Public Lobby',
      host: 'PublicHost',
      hostOnline: true,
      locked: false,
      inProgress: false,
      joinable: true,
      isYourGame: false,
      canJoin: true,
      canWatch: true,
      spectators: 0,
    }]);

    const privateJoin = await request(joiner, {
      type: 'join-public-room',
      code: privateRoom.code,
    });
    assert.equal(privateJoin.type, 'error');
    assert.match(privateJoin.message, /not listed as a public game/i);

    const hostStart = once(host, 'message').then(([data]) => JSON.parse(data.toString()));
    const joinerStart = request(joiner, {
      type: 'join-public-room',
      code: publicRoom.code,
    });
    const [hostGame, joinerGame] = await Promise.all([hostStart, joinerStart]);
    assert.equal(hostGame.type, 'game-start');
    assert.equal(joinerGame.type, 'game-start');
    assert.equal(hostGame.color, 'w');
    assert.equal(joinerGame.color, 'b');
    assert.equal(joinerGame.players.w, 'PublicHost');
    assert.equal(joinerGame.players.b, 'RoomJoiner');

    const afterJoin = await request(browser, { type: 'list-public-rooms' });
    assert.deepEqual(afterJoin.rooms.filter((listedRoom) => listedRoom.code === publicRoom.code), [{
      code: publicRoom.code,
      name: 'Public Lobby',
      host: 'PublicHost',
      hostOnline: true,
      locked: false,
      inProgress: true,
      opponent: 'RoomJoiner',
      opponentOnline: true,
      joinable: false,
      isYourGame: false,
      canJoin: false,
      canWatch: true,
      spectators: 0,
    }]);
  } finally {
    for (const socket of [host, privateHost, browser, joiner]) socket.close();
  }
});

test('spectators can watch live public games without taking player slots', async () => {
  const host = await connect(undefined, 'SpectateHost');
  const spectator = await connect(undefined, 'GameWatcher');
  const joiner = await connect(undefined, 'SecondPlayer');
  const extraPlayer = await connect(undefined, 'ExtraPlayer');
  const browser = await connect(undefined, 'GameBrowser');

  try {
    const created = await request(host, { type: 'create-public-room', lobbyName: 'Live Match' });
    const hostCountUpdate = once(host, 'message').then(([data]) => JSON.parse(data.toString()));
    const initialWatch = await request(spectator, { type: 'spectate-room', code: created.code });
    const spectatorCountUpdate = once(spectator, 'message').then(([data]) => JSON.parse(data.toString()));
    assert.equal(initialWatch.type, 'spectator-start');
    assert.equal(initialWatch.waiting, true);
    assert.equal(initialWatch.spectators, 1);
    assert.deepEqual(initialWatch.players, { w: 'SpectateHost', b: 'Black' });
    assert.equal(initialWatch.fen, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    assert.deepEqual(await hostCountUpdate, { type: 'spectator-count', count: 1 });
    assert.deepEqual(await spectatorCountUpdate, { type: 'spectator-count', count: 1 });
    const waitingListing = await request(browser, { type: 'list-public-rooms' });
    assert.equal(waitingListing.rooms.find((room) => room.code === created.code).spectators, 1);
    assert.equal((await request(spectator, { type: 'move', from: 'e2', to: 'e4' })).type, 'error');

    const spectatorStart = once(spectator, 'message').then(([data]) => JSON.parse(data.toString()));
    const hostStart = once(host, 'message').then(([data]) => JSON.parse(data.toString()));
    const joinerStart = request(joiner, { type: 'join-public-room', code: created.code });
    const [watchUpdate, hostGame, joinerGame] = await Promise.all([spectatorStart, hostStart, joinerStart]);
    assert.equal(watchUpdate.type, 'spectator-start');
    assert.equal(watchUpdate.waiting, false);
    assert.deepEqual(watchUpdate.players, { w: 'SpectateHost', b: 'SecondPlayer' });
    assert.equal(hostGame.color, 'w');
    assert.equal(joinerGame.color, 'b');

    const liveUpdate = once(spectator, 'message').then(([data]) => JSON.parse(data.toString()));
    const playerUpdate = once(joiner, 'message').then(([data]) => JSON.parse(data.toString()));
    host.send(JSON.stringify({ type: 'move', from: 'e2', to: 'e4' }));
    const [spectatorMove, joinerMove] = await Promise.all([liveUpdate, playerUpdate]);
    assert.equal(spectatorMove.type, 'move');
    assert.equal(spectatorMove.san, 'e4');
    assert.equal(joinerMove.fen, spectatorMove.fen);

    const listing = await request(browser, { type: 'list-public-rooms' });
    assert.deepEqual(listing.rooms.filter((listedRoom) => listedRoom.code === created.code), [{
      code: created.code,
      name: 'Live Match',
      host: 'SpectateHost',
      hostOnline: true,
      locked: false,
      inProgress: true,
      opponent: 'SecondPlayer',
      opponentOnline: true,
      joinable: false,
      isYourGame: false,
      canJoin: false,
      canWatch: true,
      spectators: 1,
    }]);
    const fullRoom = await request(extraPlayer, { type: 'join-public-room', code: created.code });
    assert.equal(fullRoom.type, 'error');
    assert.match(fullRoom.message, /already has two players/i);

    const leavingCount = once(host, 'message').then(([data]) => JSON.parse(data.toString()));
    spectator.close();
    assert.deepEqual(await leavingCount, { type: 'spectator-count', count: 0 });
    const updatedListing = await request(browser, { type: 'list-public-rooms' });
    assert.equal(updatedListing.rooms.find((room) => room.code === created.code).spectators, 0);
  } finally {
    for (const socket of [host, spectator, joiner, extraPlayer, browser]) socket.close();
  }
});

test('players and spectators see both chat channels and preserve separate histories', async () => {
  const host = await connect(undefined, 'ChatHost');
  const guest = await connect(undefined, 'ChatGuest');
  const spectator = await connect(undefined, 'ChatSpectator');
  const otherSpectator = await connect(undefined, 'OtherSpectator');
  const lateSpectator = await connect(undefined, 'LateSpectator');
  const hostMessages = [];
  const guestMessages = [];
  const capture = (messages) => (data) => messages.push(JSON.parse(data.toString()));

  try {
    const created = await request(host, { type: 'create-room', lobbyName: 'Chat Room' });
    const earlyPlayerChat = await sendAndWait(host, {
      type: 'chat-send',
      text: 'Before the second player joins',
    }, (message) => message.type === 'chat-message');
    assert.equal(earlyPlayerChat.channel, 'players');
    assert.equal(earlyPlayerChat.name, 'ChatHost');

    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    const guestStart = await request(guest, { type: 'join-room', code: created.code });
    const playerStart = await hostStart;
    assert.equal(guestStart.playerChat.length, 1);
    assert.equal(guestStart.playerChat[0].text, 'Before the second player joins');
    assert.deepEqual(guestStart.spectatorChat, []);
    assert.equal(playerStart.playerChat.length, 1);
    assert.deepEqual(playerStart.spectatorChat, []);

    const spectatorStart = await request(spectator, { type: 'spectate-room', code: created.code });
    assert.equal(spectatorStart.playerChat.length, 1);
    assert.equal(spectatorStart.spectatorChat.length, 0);
    await waitForMessage(spectator, (message) => message.type === 'spectator-count');

    const otherStart = await request(otherSpectator, { type: 'spectate-room', code: created.code });
    assert.equal(otherStart.spectatorChat.length, 0);
    assert.equal(otherStart.playerChat.length, 1);
    await waitForMessage(otherSpectator, (message) => message.type === 'spectator-count');

    host.on('message', capture(hostMessages));
    guest.on('message', capture(guestMessages));
    const hostSpectatorMessage = waitForMessage(host, (message) => (
      message.type === 'chat-message' && message.text === 'Only spectators should see this'
    ));
    const guestSpectatorMessage = waitForMessage(guest, (message) => (
      message.type === 'chat-message' && message.text === 'Only spectators should see this'
    ));
    const spectatorReply = waitForMessage(otherSpectator, (message) => message.type === 'chat-message');
    const spectatorMessage = await sendAndWait(spectator, {
      type: 'chat-send',
      text: 'Only spectators should see this',
    }, (message) => message.type === 'chat-message');
    const spectatorPeerMessage = await spectatorReply;
    assert.equal(spectatorMessage.channel, 'spectators');
    assert.equal(spectatorPeerMessage.text, 'Only spectators should see this');
    assert.equal((await hostSpectatorMessage).channel, 'spectators');
    assert.equal((await guestSpectatorMessage).channel, 'spectators');

    const guestPlayerReply = waitForMessage(guest, (message) => (
      message.type === 'chat-message' && message.text === 'Only players should see this'
    ));
    const spectatorPlayerMessage = waitForMessage(spectator, (message) => (
      message.type === 'chat-message' && message.text === 'Only players should see this'
    ));
    const otherSpectatorPlayerMessage = waitForMessage(otherSpectator, (message) => (
      message.type === 'chat-message' && message.text === 'Only players should see this'
    ));
    const hostPlayerMessage = await sendAndWait(host, {
      type: 'chat-send',
      text: 'Only players should see this',
    }, (message) => message.type === 'chat-message' && message.text === 'Only players should see this');
    const guestPlayerMessage = await guestPlayerReply;
    assert.equal(hostPlayerMessage.channel, 'players');
    assert.equal(guestPlayerMessage.channel, 'players');
    assert.equal((await spectatorPlayerMessage).channel, 'players');
    assert.equal((await otherSpectatorPlayerMessage).channel, 'players');
    assert.equal(hostMessages.some((message) => message.channel === 'spectators'), true);
    assert.equal(guestMessages.some((message) => message.channel === 'spectators'), true);

    const lateStart = await request(lateSpectator, { type: 'spectate-room', code: created.code });
    assert.equal(lateStart.spectatorChat.length, 1);
    assert.equal(lateStart.spectatorChat[0].text, 'Only spectators should see this');
    assert.equal(lateStart.playerChat.length, 2);
  } finally {
    for (const socket of [host, guest, spectator, otherSpectator, lateSpectator]) socket.close();
  }
});

test('room chat rejects empty and oversized messages and limits message bursts', async () => {
  const host = await connect(undefined, 'RateLimitedPlayer');
  try {
    await request(host, { type: 'create-room', lobbyName: 'Chat Limits' });
    const empty = await request(host, { type: 'chat-send', text: '   ' });
    assert.equal(empty.type, 'error');
    assert.match(empty.message, /1–300 characters/i);

    const oversized = await request(host, { type: 'chat-send', text: 'x'.repeat(301) });
    assert.equal(oversized.type, 'error');
    assert.match(oversized.message, /1–300 characters/i);

    for (let messageNumber = 1; messageNumber <= 5; messageNumber += 1) {
      const message = await request(host, { type: 'chat-send', text: `Message ${messageNumber}` });
      assert.equal(message.type, 'chat-message');
    }
    const rateLimited = await request(host, { type: 'chat-send', text: 'One too many' });
    assert.equal(rateLimited.type, 'error');
    assert.match(rateLimited.message, /too quickly/i);
  } finally {
    host.close();
  }
});
