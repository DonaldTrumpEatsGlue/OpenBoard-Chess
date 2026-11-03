window.openboardProfileUtils = Object.freeze({
  isOwnProfile(profile, identity = {}) {
    if (profile?.isOwnProfile === true) return true;
    if (identity.userId && profile?.id === identity.userId) return true;
    const usernames = (identity.usernames || [])
      .filter((username) => typeof username === 'string' && username.length > 0)
      .map((username) => username.toLowerCase());
    return Boolean(
      usernames.length
      && typeof profile?.username === 'string'
      && usernames.includes(profile.username.toLowerCase()),
    );
  },
});
