const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { after, before, test } = require('node:test');
const WebSocket = require('ws');

let serverProcess;
let endpoint;

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

async function connect(origin) {
  const socket = new WebSocket(endpoint, origin ? { origin } : {});
  await once(socket, 'open');
  return socket;
}

function request(socket, message) {
  const response = once(socket, 'message').then(([data]) => JSON.parse(data.toString()));
  socket.send(JSON.stringify(message));
  return response;
}

before(async () => {
  const port = await findOpenPort();
  endpoint = `ws://127.0.0.1:${port}/ws`;
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      OPENBOARD_PORT: String(port),
      OPENBOARD_ALLOWED_ORIGINS: 'https://*.github.io',
    },
    stdio: 'ignore',
  });
  await waitForServer(port);
});

after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  serverProcess.kill('SIGTERM');
  await once(serverProcess, 'exit');
});

test('origin allowlist supports GitHub Pages subdomains and rejects unrelated websites', async () => {
  const pagesSocket = await connect('https://sample-user.github.io');
  pagesSocket.close();

  const rejectedSocket = new WebSocket(endpoint, { origin: 'https://example.com' });
  const [error] = await once(rejectedSocket, 'error');
  assert.match(error.message, /Unexpected server response: 403/);
});

test('public room browser lists joinable games but not private invites or full games', async () => {
  const host = await connect();
  const privateHost = await connect();
  const browser = await connect();
  const joiner = await connect();

  try {
    const publicRoom = await request(host, { type: 'create-public-room', name: 'Public Host' });
    const privateRoom = await request(privateHost, { type: 'create-room', name: 'Private Host' });
    assert.equal(publicRoom.type, 'room-created');
    assert.equal(publicRoom.isPublic, true);
    assert.equal(privateRoom.isPublic, false);

    const listing = await request(browser, { type: 'list-public-rooms' });
    assert.equal(listing.type, 'public-rooms');
    assert.deepEqual(listing.rooms, [{ code: publicRoom.code, name: 'Public Host' }]);

    const privateJoin = await request(joiner, {
      type: 'join-public-room',
      code: privateRoom.code,
      name: 'Joiner',
    });
    assert.equal(privateJoin.type, 'error');
    assert.match(privateJoin.message, /not listed as a public game/i);

    const hostStart = once(host, 'message').then(([data]) => JSON.parse(data.toString()));
    const joinerStart = request(joiner, {
      type: 'join-public-room',
      code: publicRoom.code,
      name: 'Joiner',
    });
    const [hostGame, joinerGame] = await Promise.all([hostStart, joinerStart]);
    assert.equal(hostGame.type, 'game-start');
    assert.equal(joinerGame.type, 'game-start');
    assert.equal(hostGame.color, 'w');
    assert.equal(joinerGame.color, 'b');

    const afterJoin = await request(browser, { type: 'list-public-rooms' });
    assert.deepEqual(afterJoin.rooms, []);
  } finally {
    for (const socket of [host, privateHost, browser, joiner]) socket.close();
  }
});
