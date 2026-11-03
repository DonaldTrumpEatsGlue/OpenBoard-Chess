import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const profileWindow = {};
const source = readFileSync(new URL('../src/profile-utils.js', import.meta.url), 'utf8');
runInNewContext(source, { window: profileWindow });
const { isOwnProfile } = profileWindow.openboardProfileUtils;

test('identifies own profiles from authenticated server identity', () => {
  assert.equal(isOwnProfile({ id: 'user-1', username: 'different' }, { userId: 'user-1' }), true);
  assert.equal(isOwnProfile({ id: 'user-2', username: 'different', isOwnProfile: true }, {}), true);
});

test('identifies own profiles from usernames when account IDs are unavailable', () => {
  assert.equal(isOwnProfile({ username: 'PlayerOne' }, { usernames: ['playerone'] }), true);
  assert.equal(isOwnProfile({ username: 'OtherPlayer' }, { usernames: ['playerone'] }), false);
});

test('does not classify a missing or anonymous identity as the owner', () => {
  assert.equal(isOwnProfile({ username: 'PlayerOne' }), false);
  assert.equal(isOwnProfile(null, { userId: 'user-1' }), false);
});
