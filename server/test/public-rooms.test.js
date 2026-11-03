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
const signupRequests = [];
const socialFriendRequests = [];
const socialFriendships = [];
const socialDirectMessages = [];
const socialBlocks = [];
const socialChallenges = [];
const onlineGameHistory = [];
let userIdCounter = 1;
let socialIdCounter = 1;
let profileSchemaMissingOptionalColumns = false;
let socialSchemaMissing = false;

function nextSocialId() {
  return `10000000-0000-4000-8000-${String(socialIdCounter++).padStart(12, '0')}`;
}

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

function createAccount(username, verified = false, countryCode = null) {
  const token = `test-access-token-long-${userIdCounter}`;
  const id = `00000000-0000-4000-8000-${String(userIdCounter++).padStart(12, '0')}`;
  authUsers.set(token, {
    id,
    username,
    country_code: countryCode,
    bio: '',
    avatar_data: null,
    email: `${username.toLowerCase()}@example.test`,
    online_elo: 1200,
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

function makeAuthorizationHeader(accessToken) {
  const scheme = 'Bearer';
  return `${scheme} ${accessToken}`;
}

async function connect(origin, username = 'Host') {
  const token = createAccount(username);
  return connectWithAccessToken(token, username, origin);
}

async function connectWithAccessToken(token, username, origin) {
  const socket = new WebSocket(endpoint, origin ? { origin } : {});
  await once(socket, 'open');
  const authenticated = request(socket, { type: 'authenticate', accessToken: token });
  assert.deepEqual(await authenticated, {
    type: 'authenticated',
    username,
    ...(authUsers.get(token)?.country_code ? { countryCode: authUsers.get(token).country_code } : {}),
  });
  return socket;
}

function request(socket, message) {
  const response = once(socket, 'message').then(([data]) => JSON.parse(data.toString()));
  socket.send(JSON.stringify(message));
  return response;
}

function postJson(url, payload, origin = 'https://sample-user.github.io', additionalHeaders = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        ...additionalHeaders,
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
        ...(accessToken ? { Authorization: makeAuthorizationHeader(accessToken) } : {}),
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

function patchJson(url, payload, accessToken, origin = 'https://sample-user.github.io') {
  return new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: 'PATCH',
      headers: {
        Origin: origin,
        Authorization: makeAuthorizationHeader(accessToken),
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

function socialUrl(pathname) {
  const url = new URL(endpoint);
  url.protocol = 'http:';
  url.pathname = pathname;
  return url;
}

function waitForMessage(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timed out waiting for the expected room message.'));
    }, 10_000);
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
    const token = request.headers.authorization?.split(/\s+/, 2)[1] || '';
    const user = authUsers.get(token);
    if (request.url === '/auth/v1/signup') {
      let rawBody = '';
      for await (const chunk of request) rawBody += chunk;
      const { email, password, data } = JSON.parse(rawBody);
      const accessToken = createAccount(data.username, false, data.country_code || null);
      const account = authUsers.get(accessToken);
      account.email = email;
      account.password = password;
      signupRequests.push({ username: data.username, countryCode: data.country_code || null });
      response.writeHead(200).end(JSON.stringify({
        access_token: accessToken,
        refresh_token: `test-refresh-${accessToken}`,
        user: { id: account.id, email },
      }));
      return;
    }
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
    if (request.url?.startsWith('/rest/v1/rpc/openboard_social_')
      || [
        '/rest/v1/rpc/openboard_send_friend_request',
        '/rest/v1/rpc/openboard_respond_friend_request',
        '/rest/v1/rpc/openboard_send_direct_message',
        '/rest/v1/rpc/openboard_load_direct_messages',
        '/rest/v1/rpc/openboard_set_profile_country',
        '/rest/v1/rpc/openboard_update_profile',
        '/rest/v1/rpc/openboard_block_user',
        '/rest/v1/rpc/openboard_create_game_challenge',
        '/rest/v1/rpc/openboard_respond_game_challenge',
        '/rest/v1/rpc/openboard_load_online_game_history',
      ].includes(request.url)) {
      if (socialSchemaMissing) {
        response.writeHead(404).end(JSON.stringify({
          code: 'PGRST202',
          message: 'Could not find the function in the schema cache.',
        }));
        return;
      }
      let rawBody = '';
      for await (const chunk of request) rawBody += chunk;
      const body = JSON.parse(rawBody);
      let result;
      if (request.url === '/rest/v1/rpc/openboard_load_online_game_history') {
        result = onlineGameHistory
          .filter((entry) => entry.whiteId === body.p_user_id || entry.blackId === body.p_user_id)
          .map((entry) => {
            const opponentId = entry.whiteId === body.p_user_id ? entry.blackId : entry.whiteId;
            const opponent = [...authUsers.values()].find((candidate) => candidate.id === opponentId);
            return {
              id: entry.id,
              createdAt: entry.createdAt,
              opponentUsername: opponent.username,
              playerColor: entry.whiteId === body.p_user_id ? 'w' : 'b',
              result: entry.result,
              termination: entry.termination,
              pgn: entry.pgn,
              roomCode: entry.roomCode,
            };
          });
      } else if (request.url === '/rest/v1/rpc/openboard_social_overview') {
        const friendIds = socialFriendships
          .filter(([low, high]) => low === body.p_user_id || high === body.p_user_id)
          .map(([low, high]) => low === body.p_user_id ? high : low);
        const friends = friendIds.map((friendId) => {
          const peer = [...authUsers.values()].find((candidate) => candidate.id === friendId);
          const messages = socialDirectMessages
            .filter((message) => (
              (message.senderId === body.p_user_id && message.recipientId === friendId)
              || (message.senderId === friendId && message.recipientId === body.p_user_id)
            ))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
          const latest = messages[0];
          return {
            id: friendId,
            username: peer.username,
            countryCode: peer.country_code,
            bio: peer.bio,
            avatarData: peer.avatar_data,
            lastMessage: latest?.body || null,
            lastMessageAt: latest?.createdAt || null,
            lastMessageFromMe: latest?.senderId === body.p_user_id,
            unreadCount: messages.filter((message) => (
              message.senderId === friendId
              && message.recipientId === body.p_user_id
              && !message.readAt
            )).length,
          };
        });
        result = {
          friends,
          incomingRequests: socialFriendRequests
            .filter((entry) => entry.recipientId === body.p_user_id && entry.status === 'pending')
            .map((entry) => {
              const sender = [...authUsers.values()].find((candidate) => candidate.id === entry.senderId);
              return { id: entry.id, username: sender.username, countryCode: sender.country_code, avatarData: sender.avatar_data, createdAt: entry.createdAt };
            }),
          outgoingRequests: socialFriendRequests
            .filter((entry) => entry.senderId === body.p_user_id && entry.status === 'pending')
            .map((entry) => {
              const recipient = [...authUsers.values()].find((candidate) => candidate.id === entry.recipientId);
              return { id: entry.id, username: recipient.username, countryCode: recipient.country_code, avatarData: recipient.avatar_data, createdAt: entry.createdAt };
            }),
          blockedUsers: socialBlocks
            .filter((entry) => entry.blockerId === body.p_user_id)
            .map((entry) => {
              const blocked = [...authUsers.values()].find((candidate) => candidate.id === entry.blockedId);
              return { id: blocked.id, username: blocked.username };
            }),
          blockedBy: socialBlocks
            .filter((entry) => entry.blockedId === body.p_user_id)
            .map((entry) => entry.blockerId),
          challengeNotifications: socialChallenges
            .filter((entry) => entry.senderId === body.p_user_id || entry.recipientId === body.p_user_id)
            .map((entry) => {
              const sender = [...authUsers.values()].find((candidate) => candidate.id === entry.senderId);
              const recipient = [...authUsers.values()].find((candidate) => candidate.id === entry.recipientId);
              return {
                id: entry.id,
                senderId: sender.id,
                senderUsername: sender.username,
                senderCountryCode: sender.country_code,
                senderAvatarData: sender.avatar_data,
                recipientId: recipient.id,
                recipientUsername: recipient.username,
                recipientCountryCode: recipient.country_code,
                recipientAvatarData: recipient.avatar_data,
                challengeType: entry.challengeType,
                roomCode: entry.roomCode,
                scheduledAt: entry.scheduledAt,
                status: entry.status,
                createdAt: entry.createdAt,
                isIncoming: entry.recipientId === body.p_user_id,
              };
            }),
        };
      } else if (request.url === '/rest/v1/rpc/openboard_create_game_challenge') {
        const recipient = [...authUsers.values()].find((candidate) => (
          candidate.username.toLowerCase() === body.p_username_key
        ));
        if (!recipient || recipient.id === body.p_sender_id) {
          response.writeHead(400).end(JSON.stringify({ message: 'No player was found with that username.' }));
          return;
        }
        if (socialBlocks.some((entry) => (
          (entry.blockerId === body.p_sender_id && entry.blockedId === recipient.id)
          || (entry.blockerId === recipient.id && entry.blockedId === body.p_sender_id)
        ))) {
          response.writeHead(400).end(JSON.stringify({ message: 'This player cannot receive a challenge.' }));
          return;
        }
        const existing = socialChallenges.find((entry) => (
          entry.senderId === body.p_sender_id
          && entry.recipientId === recipient.id
          && entry.status === 'pending'
        ));
        if (existing) {
          result = { status: 'already_pending', id: existing.id };
        } else {
          const entry = {
            id: nextSocialId(),
            senderId: body.p_sender_id,
            recipientId: recipient.id,
            challengeType: body.p_challenge_type,
            roomCode: body.p_room_code,
            scheduledAt: body.p_scheduled_at,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          socialChallenges.push(entry);
          result = { status: 'sent', id: entry.id };
        }
      } else if (request.url === '/rest/v1/rpc/openboard_respond_game_challenge') {
        const challenge = socialChallenges.find((entry) => (
          entry.id === body.p_challenge_id
          && entry.recipientId === body.p_user_id
          && entry.status === 'pending'
        ));
        if (!challenge) {
          response.writeHead(400).end(JSON.stringify({ message: 'That challenge is no longer available.' }));
          return;
        }
        challenge.status = body.p_accept ? 'accepted' : 'declined';
        result = { status: challenge.status };
      } else if (request.url === '/rest/v1/rpc/openboard_send_friend_request') {
        const recipient = [...authUsers.values()].find((candidate) => (
          candidate.username.toLowerCase() === body.p_username_key
        ));
        if (!recipient) {
          result = { status: 'not_found' };
        } else if (socialBlocks.some((entry) => (
          (entry.blockerId === body.p_sender_id && entry.blockedId === recipient.id)
          || (entry.blockerId === recipient.id && entry.blockedId === body.p_sender_id)
        ))) {
          response.writeHead(400).end(JSON.stringify({ message: 'This player cannot receive a friend request.' }));
          return;
        } else if (socialFriendships.some(([low, high]) => (
          low === body.p_sender_id && high === recipient.id
          || low === recipient.id && high === body.p_sender_id
        ))) {
          result = { status: 'already_friends' };
        } else {
          const existing = socialFriendRequests.find((entry) => (
            entry.status === 'pending'
            && ((entry.senderId === body.p_sender_id && entry.recipientId === recipient.id)
              || (entry.senderId === recipient.id && entry.recipientId === body.p_sender_id))
          ));
          if (existing) {
            result = {
              status: existing.senderId === body.p_sender_id ? 'pending' : 'incoming',
              id: existing.id,
            };
          } else {
            const entry = {
              id: nextSocialId(),
              senderId: body.p_sender_id,
              recipientId: recipient.id,
              status: 'pending',
              createdAt: new Date().toISOString(),
            };
            socialFriendRequests.push(entry);
            result = { status: 'pending', id: entry.id };
          }
        }
      } else if (request.url === '/rest/v1/rpc/openboard_respond_friend_request') {
        const entry = socialFriendRequests.find((candidate) => (
          candidate.id === body.p_request_id
          && candidate.recipientId === body.p_user_id
          && candidate.status === 'pending'
        ));
        if (!entry) {
          response.writeHead(400).end(JSON.stringify({ message: 'That friend request is no longer available.' }));
          return;
        }
        entry.status = body.p_accept ? 'accepted' : 'declined';
        if (body.p_accept) {
          const [low, high] = [entry.senderId, entry.recipientId].sort();
          socialFriendships.push([low, high]);
        }
        result = { accepted: body.p_accept };
      } else if (request.url === '/rest/v1/rpc/openboard_send_direct_message') {
        const recipient = [...authUsers.values()].find((candidate) => (
          candidate.username.toLowerCase() === body.p_recipient_username_key
        ));
        if (!recipient || recipient.id === body.p_sender_id) {
          response.writeHead(400).end(JSON.stringify({ message: 'No player was found with that username.' }));
          return;
        }
        if (socialBlocks.some((entry) => (
          (entry.blockerId === body.p_sender_id && entry.blockedId === recipient.id)
          || (entry.blockerId === recipient.id && entry.blockedId === body.p_sender_id)
        ))) {
          response.writeHead(400).end(JSON.stringify({ message: 'You cannot message this player.' }));
          return;
        }
        const [low, high] = [body.p_sender_id, recipient.id].sort();
        if (!socialFriendships.some(([friendLow, friendHigh]) => friendLow === low && friendHigh === high)) {
          response.writeHead(400).end(JSON.stringify({ message: 'You can message players after you are friends.' }));
          return;
        }
        const message = {
          id: nextSocialId(),
          senderId: body.p_sender_id,
          recipientId: recipient.id,
          body: body.p_body,
          createdAt: new Date().toISOString(),
          readAt: null,
        };
        socialDirectMessages.push(message);
        result = message;
      } else if (request.url === '/rest/v1/rpc/openboard_load_direct_messages') {
        const [low, high] = [body.p_user_id, body.p_peer_id].sort();
        if (socialBlocks.some((entry) => (
          (entry.blockerId === body.p_user_id && entry.blockedId === body.p_peer_id)
          || (entry.blockerId === body.p_peer_id && entry.blockedId === body.p_user_id)
        ))) {
          response.writeHead(400).end(JSON.stringify({ message: 'You cannot message this player.' }));
          return;
        }
        if (!socialFriendships.some(([friendLow, friendHigh]) => friendLow === low && friendHigh === high)) {
          response.writeHead(400).end(JSON.stringify({ message: 'You can message players after you are friends.' }));
          return;
        }
        for (const message of socialDirectMessages) {
          if (message.senderId === body.p_peer_id && message.recipientId === body.p_user_id && !message.readAt) {
            message.readAt = new Date().toISOString();
          }
        }
        result = socialDirectMessages.filter((message) => (
          (message.senderId === body.p_user_id && message.recipientId === body.p_peer_id)
          || (message.senderId === body.p_peer_id && message.recipientId === body.p_user_id)
        ));
      } else if (request.url === '/rest/v1/rpc/openboard_set_profile_country') {
        const account = [...authUsers.values()].find((candidate) => candidate.id === body.p_user_id);
        if (!account) {
          response.writeHead(400).end(JSON.stringify({ message: 'Your player profile could not be found.' }));
          return;
        }
        account.country_code = body.p_country_code;
        result = { countryCode: account.country_code };
      } else if (request.url === '/rest/v1/rpc/openboard_update_profile') {
        const account = [...authUsers.values()].find((candidate) => candidate.id === body.p_user_id);
        if (!account) {
          response.writeHead(400).end(JSON.stringify({ message: 'Your player profile could not be found.' }));
          return;
        }
        account.country_code = body.p_country_code || account.country_code;
        if (body.p_bio !== null) account.bio = body.p_bio;
        if (body.p_avatar_data !== null) account.avatar_data = body.p_avatar_data || null;
        result = { id: account.id, username: account.username };
      } else if (request.url === '/rest/v1/rpc/openboard_block_user') {
        const target = [...authUsers.values()].find((candidate) => (
          candidate.username.toLowerCase() === body.p_target_username_key
        ));
        if (!target || target.id === body.p_user_id) {
          response.writeHead(400).end(JSON.stringify({ message: 'No other player was found with that username.' }));
          return;
        }
        const existing = socialBlocks.find((entry) => (
          entry.blockerId === body.p_user_id && entry.blockedId === target.id
        ));
        if (body.p_block && !existing) {
          socialBlocks.push({ blockerId: body.p_user_id, blockedId: target.id });
          const [low, high] = [body.p_user_id, target.id].sort();
          const friendshipIndex = socialFriendships.findIndex(([friendLow, friendHigh]) => (
            friendLow === low && friendHigh === high
          ));
          if (friendshipIndex >= 0) socialFriendships.splice(friendshipIndex, 1);
          for (let index = socialFriendRequests.length - 1; index >= 0; index -= 1) {
            const request = socialFriendRequests[index];
            if ((request.senderId === body.p_user_id && request.recipientId === target.id)
              || (request.senderId === target.id && request.recipientId === body.p_user_id)) {
              socialFriendRequests.splice(index, 1);
            }
          }
          for (const challenge of socialChallenges) {
            if (challenge.status === 'pending'
              && ((challenge.senderId === body.p_user_id && challenge.recipientId === target.id)
                || (challenge.senderId === target.id && challenge.recipientId === body.p_user_id))) {
              challenge.status = 'expired';
            }
          }
        } else if (!body.p_block && existing) {
          socialBlocks.splice(socialBlocks.indexOf(existing), 1);
        }
        result = { blocked: body.p_block };
      }
      response.writeHead(200).end(JSON.stringify(result));
      return;
    }
    if (request.url === '/rest/v1/rpc/settle_openboard_rated_game') {
      let rawBody = '';
      for await (const chunk of request) rawBody += chunk;
      const requestBody = JSON.parse(rawBody);
      const {
        p_white_id: whiteId,
        p_black_id: blackId,
        p_white_score: whiteScore,
      } = requestBody;
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
      ratedGameRequests.push(requestBody);
      onlineGameHistory.push({
        id: requestBody.p_game_id,
        roomCode: requestBody.p_room_code,
        whiteId,
        blackId,
        result: whiteScore === 1 ? '1-0' : whiteScore === 0 ? '0-1' : '1/2-1/2',
        termination: requestBody.p_termination,
        pgn: requestBody.p_pgn,
        createdAt: new Date().toISOString(),
      });
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
      if (profileSchemaMissingOptionalColumns
        && selectedFields !== 'username'
        && selectedFields !== 'id'
        && selectedFields !== 'username_key') {
        response.writeHead(400).end(JSON.stringify({
          code: '42703',
          message: 'column country_code does not exist',
        }));
        return;
      }
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
            : selectedFields === 'username'
              ? { username: account.username }
            : {
              id: account.id,
              username: account.username,
              country_code: account.country_code,
              bio: account.bio,
              avatar_data: account.avatar_data,
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
      const profile = [...authUsers.values()].find((candidate) => candidate.id === requestedId);
      response.writeHead(200).end(JSON.stringify(profile
        ? selectedFields === 'username'
          ? [{ username: profile.username }]
          : selectedFields === 'username,country_code'
            ? [{ username: profile.username, country_code: profile.country_code }]
          : [{
            id: profile.id,
            username: profile.username,
            country_code: profile.country_code,
            bio: profile.bio,
            avatar_data: profile.avatar_data,
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

test('database schema reserves usernames and keeps social data behind server-only RPCs', () => {
  const schema = readFileSync(path.resolve(__dirname, '../../supabase/schema.sql'), 'utf8');
  assert.match(schema, /username_key text not null unique/i);
  assert.match(schema, /country_code text check \(country_code is null or country_code ~ '\^\[A-Z\]\{2\}\$'\)/i);
  assert.match(schema, /after insert on auth\.users/i);
  assert.match(schema, /new\.raw_user_meta_data\s*->>\s*'username'/i);
  assert.match(schema, /new\.raw_user_meta_data\s*->>\s*'country_code'/i);
  assert.match(schema, /lower\(requested_username\)/i);
  assert.match(schema, /v_user_low uuid/i);
  assert.match(schema, /friendship\.user_low = v_user_low/i);
  assert.match(schema, /update public\.profiles as profile[\s\S]*profile\.country_code is null[\s\S]*raw_user_meta_data[\s\S]*country_code/i);
  assert.match(schema, /raise exception 'username_taken'/i);
  assert.doesNotMatch(schema, /new\.email_confirmed_at is null/i);
  assert.match(schema, /from auth\.users as users[\s\S]*on conflict do nothing/i);
  assert.match(schema, /create table if not exists public\.friend_requests/i);
  assert.match(schema, /create table if not exists public\.friendships/i);
  assert.match(schema, /create table if not exists public\.direct_messages/i);
  assert.match(schema, /create table if not exists public\.online_game_history/i);
  assert.match(schema, /alter table public\.direct_messages enable row level security/i);
  assert.match(schema, /revoke all on public\.friend_requests, public\.friendships, public\.direct_messages, public\.user_blocks, public\.game_challenges, public\.online_game_history from public, anon, authenticated/i);
  assert.match(schema, /grant execute on function public\.openboard_social_overview\(uuid\) to service_role/i);
  assert.match(schema, /openboard_create_game_challenge\(\s*p_sender_id uuid,\s*p_username_key text,\s*p_challenge_type text/i);
  assert.match(schema, /openboard_respond_game_challenge\(\s*p_user_id uuid,\s*p_challenge_id uuid,\s*p_accept boolean\s*\)/i);
  assert.match(schema, /openboard_load_online_game_history\(p_user_id uuid\)/i);
  assert.match(schema, /grant execute on function public\.openboard_send_direct_message\(uuid, text, text\) to service_role/i);
  assert.match(schema, /online_elo integer not null default 1200/i);
  assert.match(schema, /openboard_set_profile_country\(p_user_id uuid, p_country_code text\)/i);
  assert.match(schema, /openboard_update_profile\(/i);
  assert.match(schema, /openboard_block_user\(/i);
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

test('signup derives and stores an approximate country code from the request IP', async () => {
  const signupUrl = new URL(endpoint);
  signupUrl.protocol = 'http:';
  signupUrl.pathname = '/auth/signup';
  signupUrl.search = '';
  signupUrl.hash = '';

  const result = await postJson(signupUrl, {
    username: 'GeoProfile',
    email: 'geo@example.test',
    password: 'secure-password-123',
    countryCode: 'ZZ',
  }, 'https://sample-user.github.io', { 'x-forwarded-for': '8.8.8.8, 1.1.1.1' });
  assert.equal(result.status, 200);
  assert.equal(signupRequests.at(-1).username, 'GeoProfile');
  assert.equal(signupRequests.at(-1).countryCode, 'US');

  const profileUrl = new URL(endpoint);
  profileUrl.protocol = 'http:';
  profileUrl.pathname = '/profiles/geoprofile';
  profileUrl.search = '';
  profileUrl.hash = '';
  const profile = await getJson(profileUrl);
  assert.equal(profile.body.countryCode, 'US');
});

test('country codes appear beside account names in lobbies, games, and chat', async () => {
  const hostToken = createAccount('CountryHost', false, 'US');
  const guestToken = createAccount('CountryGuest', false, 'GB');
  const host = await connectWithAccessToken(hostToken, 'CountryHost');
  const guest = await connectWithAccessToken(guestToken, 'CountryGuest');

  try {
    const created = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Country test',
    });
    assert.equal(created.countryCode, 'US');

    const listing = await request(guest, { type: 'list-public-rooms' });
    assert.equal(listing.rooms[0].hostCountryCode, 'US');

    const hostGamePromise = waitForMessage(host, (message) => message.type === 'game-start');
    const guestGame = await request(guest, { type: 'join-public-room', code: created.code });
    const hostGame = await hostGamePromise;
    assert.deepEqual(hostGame.playerCountries, { w: 'US', b: 'GB' });
    assert.deepEqual(guestGame.playerCountries, { w: 'US', b: 'GB' });

    const chatPromise = waitForMessage(guest, (message) => (
      message.type === 'chat-message' && message.text === 'Hello'
    ));
    host.send(JSON.stringify({ type: 'chat-send', text: 'Hello' }));
    assert.equal((await chatPromise).countryCode, 'US');

    const joinedListing = await request(guest, { type: 'list-public-rooms' });
    assert.equal(joinedListing.rooms[0].opponentCountryCode, 'GB');
  } finally {
    host.close();
    guest.close();
  }
});

test('public player profiles show online ratings but never expose account emails', async () => {
  const token = createAccount('PublicProfileOwner', false, 'CA');
  const profileUrl = new URL(endpoint);
  profileUrl.protocol = 'http:';
  profileUrl.pathname = '/profiles/publicprofileowner';
  profileUrl.search = '';
  profileUrl.hash = '';

  const publicProfile = await getJson(profileUrl);
  assert.equal(publicProfile.status, 200);
  assert.deepEqual(publicProfile.body, {
    id: authUsers.get(token).id,
    username: 'PublicProfileOwner',
    countryCode: 'CA',
    onlineElo: 1200,
    onlineGames: 0,
    onlineWins: 0,
    onlineDraws: 0,
    onlineLosses: 0,
  });
  assert.equal(JSON.stringify(publicProfile.body).includes('@example.test'), false);
  const viewedOwnProfile = await getJson(profileUrl, token);
  assert.equal(viewedOwnProfile.status, 200);
  assert.equal(viewedOwnProfile.body.isOwnProfile, true);
  const otherToken = createAccount('OtherProfileViewer');
  const viewedOtherProfile = await getJson(profileUrl, otherToken);
  assert.equal(viewedOtherProfile.status, 200);
  assert.equal(viewedOtherProfile.body.isOwnProfile, false);

  const privateProfileUrl = new URL(endpoint);
  privateProfileUrl.protocol = 'http:';
  privateProfileUrl.pathname = '/profile/me';
  privateProfileUrl.search = '';
  privateProfileUrl.hash = '';
  assert.equal((await getJson(privateProfileUrl)).status, 401);
  const ownProfile = await getJson(privateProfileUrl, token);
  assert.equal(ownProfile.status, 200);
  assert.equal(ownProfile.body.isOwnProfile, true);
  assert.equal(ownProfile.body.username, 'PublicProfileOwner');
  assert.equal(ownProfile.body.countryCode, 'CA');
  assert.equal(ownProfile.body.bio || '', '');
  assert.equal(JSON.stringify(ownProfile.body).includes('@example.test'), false);

  const updatedCountry = await patchJson(privateProfileUrl, {
    countryCode: 'GB',
    bio: 'A new player learning chess.',
    avatarData: 'data:image/webp;base64,SGVsbG8=',
  }, token);
  assert.equal(updatedCountry.status, 200);
  assert.equal(updatedCountry.body.countryCode, 'GB');
  assert.equal(updatedCountry.body.bio, 'A new player learning chess.');
  assert.equal(updatedCountry.body.avatarData, 'data:image/webp;base64,SGVsbG8=');
  const updatedPublicProfile = await getJson(profileUrl);
  assert.equal(updatedPublicProfile.body.countryCode, 'GB');
  assert.equal(updatedPublicProfile.body.bio, 'A new player learning chess.');
  assert.equal(updatedPublicProfile.body.avatarData, 'data:image/webp;base64,SGVsbG8=');

  const invalidAvatar = await patchJson(privateProfileUrl, { avatarData: 'javascript:alert(1)' }, token);
  assert.equal(invalidAvatar.status, 400);
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
    assert.equal(whiteProfile.body.onlineElo, 1216);
    assert.equal(whiteProfile.body.onlineGames, 1);
    assert.equal(whiteProfile.body.onlineWins, 1);
    assert.equal(blackProfile.body.onlineElo, 1184);
    assert.equal(blackProfile.body.onlineGames, 1);
    assert.equal(blackProfile.body.onlineLosses, 1);
    assert.equal(ratedGameRequests.length, 1);
    assert.equal(ratedGameRequests[0].p_room_code, room.code);
    assert.match(ratedGameRequests[0].p_game_id, /^[0-9a-f-]{36}$/i);
    assert.match(ratedGameRequests[0].p_pgn, /e4/);
    assert.equal(ratedGameRequests[0].p_termination, 'resignation');
    const whiteHistory = await getJson(socialUrl('/social/history/online'), whiteToken);
    assert.equal(whiteHistory.status, 200);
    assert.equal(whiteHistory.body[0].opponentUsername, 'RatingBlack');
    assert.equal(whiteHistory.body[0].result, '1-0');
    assert.equal(whiteHistory.body[0].playerColor, 'w');
    assert.match(whiteHistory.body[0].pgn, /e4/);
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

test('private and public lobbies share and enforce their custom chess rules', async () => {
  const variant = {
    boardSize: 8,
    noDraws: true,
    pieceMovements: {
      p: { w: ['n'], b: ['p'] },
      n: { w: ['n'], b: ['n'] },
      b: { w: ['b'], b: ['b'] },
      r: { w: ['r'], b: ['r'] },
      q: { w: ['q'], b: ['q'] },
    },
    customPieces: [],
  };
  const host = await connect(undefined, 'VariantPublicHost');
  const guest = await connect(undefined, 'VariantGuest');
  const privateHost = await connect(undefined, 'VariantPrivateHost');
  const invalidVariantHost = await connect(undefined, 'InvalidVariantHost');
  try {
    const publicLobby = await request(host, {
      type: 'create-public-room',
      lobbyName: 'Custom public room',
      variant,
    });
    assert.equal(publicLobby.type, 'room-created');
    assert.deepEqual(publicLobby.variant, variant);

    const privateLobby = await request(privateHost, {
      type: 'create-room',
      lobbyName: 'Custom private room',
      variant,
    });
    assert.equal(privateLobby.type, 'room-created');
    assert.deepEqual(privateLobby.variant, variant);
    const disabledDrawOffer = await request(privateHost, { type: 'offer-draw' });
    assert.equal(disabledDrawOffer.type, 'error');
    assert.match(disabledDrawOffer.message, /draw offers are disabled/i);

    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    const guestStart = waitForMessage(guest, (message) => message.type === 'game-start');
    guest.send(JSON.stringify({ type: 'join-public-room', code: publicLobby.code }));
    const [hostGame, guestGame] = await Promise.all([hostStart, guestStart]);
    assert.deepEqual(guestGame.variant, variant);
    assert.equal(guestGame.moves.length, 0);
    assert.match(guestGame.fen, /NNNNNNNN/);

    const invalidMove = await request(host, { type: 'move', from: 'e2', to: 'e4' });
    assert.equal(invalidMove.type, 'error');
    assert.match(invalidMove.message, /illegal move/i);

    const opponentMove = waitForMessage(guest, (message) => message.type === 'move');
    const appliedMove = await request(host, { type: 'move', from: 'e2', to: 'f4' });
    const guestMove = await opponentMove;
    assert.equal(appliedMove.from, 'e2');
    assert.equal(appliedMove.to, 'f4');
    assert.equal(guestMove.fen, appliedMove.fen);
    assert.equal(guestMove.moves.length, 1);
    assert.equal(guestMove.variant.noDraws, true);

    const invalidBoard = await request(invalidVariantHost, {
      type: 'create-public-room',
      lobbyName: 'Unsupported board',
      variant: { ...variant, boardSize: 10 },
    });
    assert.equal(invalidBoard.type, 'error');
    assert.match(invalidBoard.message, /8×8/);
    assert.ok(hostGame.fen);
  } finally {
    host.close();
    guest.close();
    privateHost.close();
    invalidVariantHost.close();
  }
});

test('players can offer and agree to a draw when room rules allow it', async () => {
  const host = await connect(undefined, 'DrawOfferHost');
  const guest = await connect(undefined, 'DrawOfferGuest');
  try {
    const created = await request(host, { type: 'create-room', lobbyName: 'Draw offer room' });
    const hostStart = waitForMessage(host, (message) => message.type === 'game-start');
    const guestStart = await request(guest, { type: 'join-room', code: created.code });
    assert.equal(guestStart.type, 'game-start');
    await hostStart;

    const hostFirstMove = waitForMessage(host, (message) => message.type === 'move');
    const guestFirstMove = waitForMessage(guest, (message) => message.type === 'move');
    host.send(JSON.stringify({ type: 'move', from: 'e2', to: 'e4' }));
    await Promise.all([hostFirstMove, guestFirstMove]);
    const hostSecondMove = waitForMessage(host, (message) => message.type === 'move');
    const guestSecondMove = waitForMessage(guest, (message) => message.type === 'move');
    guest.send(JSON.stringify({ type: 'move', from: 'e7', to: 'e5' }));
    await Promise.all([hostSecondMove, guestSecondMove]);

    const offerReceived = waitForMessage(guest, (message) => message.type === 'draw-offered');
    const offerSent = await sendAndWait(host, { type: 'offer-draw' }, (message) => message.type === 'draw-offer-sent');
    assert.equal(offerSent.type, 'draw-offer-sent');
    assert.equal((await offerReceived).name, 'DrawOfferHost');

    const declined = waitForMessage(host, (message) => message.type === 'draw-offer-declined');
    guest.send(JSON.stringify({ type: 'draw-response', accept: false }));
    await declined;

    const secondOfferReceived = waitForMessage(guest, (message) => message.type === 'draw-offered');
    const secondOfferSent = await sendAndWait(host, { type: 'offer-draw' }, (message) => message.type === 'draw-offer-sent');
    assert.equal(secondOfferSent.type, 'draw-offer-sent');
    await secondOfferReceived;

    const hostAgreed = waitForMessage(host, (message) => message.type === 'draw-agreed');
    const guestAgreed = waitForMessage(guest, (message) => message.type === 'draw-agreed');
    guest.send(JSON.stringify({ type: 'draw-response', accept: true }));
    await Promise.all([hostAgreed, guestAgreed]);
  } finally {
    host.close();
    guest.close();
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

test('social API protects friend requests and direct messages behind account authentication', async () => {
  const senderToken = createAccount('SocialSender', true, 'US');
  const recipientToken = createAccount('SocialRecipient', true, 'CA');
  const unrelatedToken = createAccount('SocialStranger', true, 'GB');
  const declinerToken = createAccount('SocialDecliner', true, 'AU');
  const senderHeaders = { Authorization: makeAuthorizationHeader(senderToken) };
  const recipientHeaders = { Authorization: makeAuthorizationHeader(recipientToken) };
  const declinerHeaders = { Authorization: makeAuthorizationHeader(declinerToken) };

  const signedOut = await getJson(socialUrl('/social/overview'));
  assert.equal(signedOut.status, 401);

  const emptyOverview = await getJson(socialUrl('/social/overview'), senderToken);
  assert.equal(emptyOverview.status, 200);
  assert.deepEqual(emptyOverview.body, {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    challengeNotifications: [],
    blockedUsers: [],
    blockedBy: [],
  });

  const invalidRequest = await postJson(
    socialUrl('/social/friends/request'),
    { username: 'x' },
    undefined,
    senderHeaders,
  );
  assert.equal(invalidRequest.status, 400);

  const sentRequest = await postJson(
    socialUrl('/social/friends/request'),
    { username: 'SocialRecipient' },
    undefined,
    senderHeaders,
  );
  assert.equal(sentRequest.status, 200, JSON.stringify(sentRequest.body));
  assert.equal(sentRequest.body.status, 'pending');
  assert.match(sentRequest.body.id, /^[0-9a-f-]{36}$/i);
  const senderPending = await getJson(socialUrl('/social/overview'), senderToken);
  assert.equal(senderPending.body.outgoingRequests[0].username, 'SocialRecipient');

  const recipientOverview = await getJson(socialUrl('/social/overview'), recipientToken);
  assert.equal(recipientOverview.body.incomingRequests.length, 1);
  assert.equal(recipientOverview.body.incomingRequests[0].username, 'SocialSender');
  assert.equal(recipientOverview.body.incomingRequests[0].countryCode, 'US');
  assert.equal(recipientOverview.body.friends.length, 0);

  const invalidResponse = await postJson(
    socialUrl('/social/friends/respond'),
    { requestId: 'not-a-uuid', accept: true },
    undefined,
    recipientHeaders,
  );
  assert.equal(invalidResponse.status, 400);

  const acceptedRequest = await postJson(
    socialUrl('/social/friends/respond'),
    { requestId: sentRequest.body.id, accept: true },
    undefined,
    recipientHeaders,
  );
  assert.equal(acceptedRequest.status, 200);
  assert.deepEqual(acceptedRequest.body, { accepted: true });

  const senderFriends = await getJson(socialUrl('/social/overview'), senderToken);
  assert.equal(senderFriends.body.friends.length, 1);
  assert.equal(senderFriends.body.friends[0].username, 'SocialRecipient');
  assert.equal(senderFriends.body.friends[0].countryCode, 'CA');

  const duplicateFriendRequest = await postJson(
    socialUrl('/social/friends/request'),
    { username: 'SocialRecipient' },
    undefined,
    senderHeaders,
  );
  assert.equal(duplicateFriendRequest.status, 200);
  assert.equal(duplicateFriendRequest.body.status, 'already_friends');
  assert.equal((await getJson(socialUrl('/social/overview'), recipientToken)).body.incomingRequests.length, 0);

  const invalidPlayNowChallenge = await postJson(
    socialUrl('/social/challenges'),
    { username: 'SocialRecipient', challengeType: 'now', roomCode: 'bad' },
    undefined,
    senderHeaders,
  );
  assert.equal(invalidPlayNowChallenge.status, 400);

  const playNowChallenge = await postJson(
    socialUrl('/social/challenges'),
    { username: 'SocialRecipient', challengeType: 'now', roomCode: 'A1B2C3' },
    undefined,
    senderHeaders,
  );
  assert.equal(playNowChallenge.status, 200, JSON.stringify(playNowChallenge.body));
  assert.equal(playNowChallenge.body.status, 'sent');
  const duplicateChallenge = await postJson(
    socialUrl('/social/challenges'),
    { username: 'SocialRecipient', challengeType: 'now', roomCode: 'D4E5F6' },
    undefined,
    senderHeaders,
  );
  assert.equal(duplicateChallenge.body.status, 'already_pending');
  const recipientChallengeInbox = await getJson(socialUrl('/social/overview'), recipientToken);
  assert.equal(recipientChallengeInbox.body.challengeNotifications.length, 1);
  assert.equal(recipientChallengeInbox.body.challengeNotifications[0].senderUsername, 'SocialSender');
  assert.equal(recipientChallengeInbox.body.challengeNotifications[0].challengeType, 'now');
  assert.equal(recipientChallengeInbox.body.challengeNotifications[0].roomCode, 'A1B2C3');
  const acceptedPlayNowChallenge = await postJson(
    socialUrl('/social/challenges/respond'),
    { challengeId: playNowChallenge.body.id, accept: true },
    undefined,
    recipientHeaders,
  );
  assert.deepEqual(acceptedPlayNowChallenge.body, { status: 'accepted' });
  const senderChallengeInboxAfterAccept = await getJson(socialUrl('/social/overview'), senderToken);
  assert.equal(senderChallengeInboxAfterAccept.body.challengeNotifications.find((entry) => (
    entry.id === playNowChallenge.body.id
  )).status, 'accepted');

  const pastScheduledChallenge = await postJson(
    socialUrl('/social/challenges'),
    { username: 'SocialDecliner', challengeType: 'scheduled', scheduledAt: new Date(Date.now() - 60_000).toISOString() },
    undefined,
    senderHeaders,
  );
  assert.equal(pastScheduledChallenge.status, 400);

  const scheduleTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const scheduledChallenge = await postJson(
    socialUrl('/social/challenges'),
    { username: 'SocialDecliner', challengeType: 'scheduled', scheduledAt: scheduleTime },
    undefined,
    senderHeaders,
  );
  assert.equal(scheduledChallenge.status, 200, JSON.stringify(scheduledChallenge.body));
  assert.equal(scheduledChallenge.body.status, 'sent');
  const declinedChallenge = await postJson(
    socialUrl('/social/challenges/respond'),
    { challengeId: scheduledChallenge.body.id, accept: false },
    undefined,
    declinerHeaders,
  );
  assert.deepEqual(declinedChallenge.body, { status: 'declined' });
  const senderChallengeInbox = await getJson(socialUrl('/social/overview'), senderToken);
  assert.equal(senderChallengeInbox.body.challengeNotifications.find((entry) => (
    entry.id === scheduledChallenge.body.id
  )).status, 'declined');

  const deniedMessage = await postJson(
    socialUrl('/social/messages'),
    { username: 'SocialStranger', text: 'Not a friend yet' },
    undefined,
    senderHeaders,
  );
  assert.equal(deniedMessage.status, 400);
  assert.match(deniedMessage.body.message, /after you are friends/i);

  const sentMessage = await postJson(
    socialUrl('/social/messages'),
    { username: 'SocialRecipient', text: 'Hello from Openboard' },
    undefined,
    senderHeaders,
  );
  assert.equal(sentMessage.status, 200);
  assert.equal(sentMessage.body.body, 'Hello from Openboard');
  assert.equal(sentMessage.body.senderId, authUsers.get(senderToken).id);

  const unreadOverview = await getJson(socialUrl('/social/overview'), recipientToken);
  assert.equal(unreadOverview.body.friends[0].unreadCount, 1);

  const readConversation = await getJson(
    socialUrl(`/social/messages/${authUsers.get(senderToken).id}`),
    recipientToken,
  );
  assert.equal(readConversation.status, 200);
  assert.equal(readConversation.body.length, 1);
  assert.equal(readConversation.body[0].body, 'Hello from Openboard');
  assert.ok(readConversation.body[0].readAt);

  const readOverview = await getJson(socialUrl('/social/overview'), recipientToken);
  assert.equal(readOverview.body.friends[0].unreadCount, 0);

  const blocked = await postJson(
    socialUrl('/social/blocks'),
    { username: 'SocialRecipient', block: true },
    undefined,
    senderHeaders,
  );
  assert.equal(blocked.status, 200);
  assert.deepEqual(blocked.body, { blocked: true });
  const afterBlock = await getJson(socialUrl('/social/overview'), senderToken);
  assert.equal(afterBlock.body.friends.length, 0);
  assert.equal(afterBlock.body.blockedUsers[0].username, 'SocialRecipient');
  const blockedMessage = await postJson(
    socialUrl('/social/messages'),
    { username: 'SocialRecipient', text: 'This should not send' },
    undefined,
    senderHeaders,
  );
  assert.equal(blockedMessage.status, 400);
  const unblocked = await postJson(
    socialUrl('/social/blocks'),
    { username: 'SocialRecipient', block: false },
    undefined,
    senderHeaders,
  );
  assert.equal(unblocked.status, 200);

  const declineRequest = await postJson(
    socialUrl('/social/friends/request'),
    { username: 'SocialDecliner' },
    undefined,
    senderHeaders,
  );
  assert.equal(declineRequest.status, 200);
  const declinedResponse = await postJson(
    socialUrl('/social/friends/respond'),
    { requestId: declineRequest.body.id, accept: false },
    undefined,
    declinerHeaders,
  );
  assert.equal(declinedResponse.status, 200);
  assert.deepEqual(declinedResponse.body, { accepted: false });
  const declinedOverview = await getJson(socialUrl('/social/overview'), declinerToken);
  assert.equal(declinedOverview.body.incomingRequests.length, 0);
  assert.equal(declinedOverview.body.friends.length, 0);

  const unauthorizedMessage = await getJson(
    socialUrl(`/social/messages/${authUsers.get(recipientToken).id}`),
    unrelatedToken,
  );
  assert.equal(unauthorizedMessage.status, 400);
  assert.match(unauthorizedMessage.body.message, /after you are friends/i);
});

test('player search and account identity remain usable before optional profile migrations', async () => {
  const token = createAccount('LegacyProfileUser', true, 'US');
  const account = authUsers.get(token);
  let socket;
  profileSchemaMissingOptionalColumns = true;
  try {
    const publicProfile = await getJson(socialUrl('/profiles/LegacyProfileUser'));
    assert.equal(publicProfile.status, 200);
    assert.deepEqual(publicProfile.body, {
      username: 'LegacyProfileUser',
      countryCode: null,
      onlineElo: 1200,
      onlineGames: 0,
      onlineWins: 0,
      onlineDraws: 0,
      onlineLosses: 0,
    });
    const viewedOwnProfile = await getJson(socialUrl('/profiles/LegacyProfileUser'), token);
    assert.equal(viewedOwnProfile.status, 200);
    assert.equal(viewedOwnProfile.body.isOwnProfile, true);

    const ownProfile = await getJson(socialUrl('/profile/me'), token);
    assert.equal(ownProfile.status, 200);
    assert.equal(ownProfile.body.isOwnProfile, true);
    assert.equal(ownProfile.body.username, 'LegacyProfileUser');
    assert.equal(ownProfile.body.onlineElo, 1200);

    socket = new WebSocket(endpoint);
    await once(socket, 'open');
    assert.deepEqual(await request(socket, { type: 'authenticate', accessToken: token }), {
      type: 'authenticated',
      username: 'LegacyProfileUser',
    });

    socialSchemaMissing = true;
    const socialOverview = await getJson(socialUrl('/social/overview'), token);
    assert.equal(socialOverview.status, 503);
    assert.match(socialOverview.body.message, /run supabase\/schema\.sql/i);
  } finally {
    profileSchemaMissingOptionalColumns = false;
    socialSchemaMissing = false;
    socket?.close();
  }
});
