/**
 * Per-provider session storage. Each provider keeps its own session/cache
 * so logging into "fiberplus" never affects "onedxd" or any future
 * provider that also requires auth.
 */
var AuthService = (function () {
  function sessionKey(providerId) {
    return 'dxdtv_session_' + providerId;
  }

  function channelsKey(providerId) {
    return 'dxdtv_channels_' + providerId;
  }

  function isLoggedIn(providerId) {
    return !!localStorage.getItem(sessionKey(providerId));
  }

  function saveSession(providerId, credentials) {
    var payload = {
      username: credentials.username,
      password: credentials.password,
      provider: providerId
    };
    localStorage.setItem(sessionKey(providerId), JSON.stringify(payload));
  }

  function getSession(providerId) {
    var raw = localStorage.getItem(sessionKey(providerId));
    return raw ? JSON.parse(raw) : null;
  }

  function clearSession(providerId) {
    localStorage.removeItem(sessionKey(providerId));
    localStorage.removeItem(channelsKey(providerId));
  }

  function clearAllSessions() {
    Providers.getAll().forEach(function (provider) {
      clearSession(provider.id);
    });
  }

  function saveChannels(providerId, channels) {
    localStorage.setItem(channelsKey(providerId), JSON.stringify(channels));
  }

  function getStoredChannels(providerId) {
    var raw = localStorage.getItem(channelsKey(providerId));
    return raw ? JSON.parse(raw) : null;
  }

  return {
    isLoggedIn: isLoggedIn,
    saveSession: saveSession,
    getSession: getSession,
    clearSession: clearSession,
    clearAllSessions: clearAllSessions,
    saveChannels: saveChannels,
    getStoredChannels: getStoredChannels
  };
})();
