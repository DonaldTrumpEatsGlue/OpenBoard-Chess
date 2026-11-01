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

function createAccount(username, verified = true) {
  const token = `test-access-token-long-${userIdCounter}`;
  const id = `00000000-0000-4000-8000-${String(userIdCounter++).padStart(12, '0')}`;
  authUsers.set(token, {
    id,
    username,
    email_confirmed_at: verified ? new Date().toISOString() : null,
    confirmed_at: verified ? new Date().toISOString() : null,
  });
  return token;
}

async function connect(origin, username = 'Host') {
  const socket = new WebSocket(endpoint, origin ? { origin } : {});
  await once(socket, 'open');
  const token = createAccount(username);
  const authenticated = request(socket, { type: 'authenticate', accessToken: token });
  assert.deepEqual(await authenticated, { type: 'authenticated', username });
  return socket;
}

function request(socket, message) {
  const response = once(socket, 'message').then(([data]) => JSON.parse(data.toString()));
  socket.send(JSON.stringify(message));
  return response;
}

before(async () => {
  authServer = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    const token = request.headers.authorization?.replace(/^Bearer /, '');
    const user = authUsers.get(token);
    if (request.url === '/auth/v1/user') {
      response.writeHead(user ? 200 : 401).end(JSON.stringify(user || { message: 'Invalid token' }));
      return;
    }
    if (request.url?.startsWith('/rest/v1/profiles')) {
      const requestedId = new URL(request.url, 'http://localhost').searchParams.get('id')?.slice(3);
      response.writeHead(user?.id === requestedId ? 200 : 200)
        .end(JSON.stringify(user?.id === requestedId ? [{ username: user.username }] : []));
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

test('database schema reserves case-insensitive usernames before email confirmation', () => {
  const schema = readFileSync(path.resolve(__dirname, '../../supabase/schema.sql'), 'utf8');
  assert.match(schema, /username_key text not null unique/i);
  assert.match(schema, /after insert on auth\.users/i);
  assert.match(schema, /after update of email_confirmed_at on auth\.users/i);
  assert.match(schema, /new\.raw_user_meta_data\s*->>\s*'username'/i);
  assert.match(schema, /lower\(requested_username\)/i);
  assert.match(schema, /raise exception 'username_taken'/i);
  assert.match(schema, /new\.email_confirmed_at is null/i);
});

test('online actions require a verified account and use its reserved username', async () => {
  const anonymous = await new WebSocket(endpoint);
  await once(anonymous, 'open');
  const denied = await request(anonymous, { type: 'list-public-rooms' });
  assert.equal(denied.type, 'error');
  assert.match(denied.message, /verified account/i);
  anonymous.close();

  const token = createAccount('Unverified', false);
  const unverified = await new WebSocket(endpoint);
  await once(unverified, 'open');
  const authRejected = await request(unverified, { type: 'authenticate', accessToken: token });
  assert.equal(authRejected.type, 'error');
  assert.match(authRejected.message, /verify your email/i);
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
        locked: false,
      }]);
    } finally {
      browser.close();
    }
  } finally {
    host.close();
  }
});

test('optional lobby passwords block incorrect joins and allow the correct one', async () => {
  const host = await connect(undefined, 'LobbyOwner');
  const wrongGuest = await connect(undefined, 'WrongGuest');
  const guest = await connect(undefined, 'RightGuest');
  try {
    const created = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Locked Game',
      password: 'secret-room',
    });
    assert.equal(created.locked, true);

    const listing = await request(wrongGuest, { type: 'list-public-rooms' });
    assert.equal(listing.rooms[0].locked, true);

    const denied = await request(wrongGuest, {
      type: 'join-public-room',
      code: created.code,
      password: 'incorrect',
    });
    assert.match(denied.message, /password is incorrect/i);

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
    for (const socket of [host, wrongGuest, guest]) socket.close();
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
    assert.deepEqual(listing.rooms, [{
      code: publicRoom.code,
      name: 'Public Lobby',
      host: 'PublicHost',
      locked: false,
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
    assert.deepEqual(afterJoin.rooms, []);
  } finally {
    for (const socket of [host, privateHost, browser, joiner]) socket.close();
  }
});
