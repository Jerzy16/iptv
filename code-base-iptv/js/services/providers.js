/**
 * Provider registry. Add new IPTV providers here — everything else
 * (login gating, channel fetching, home grid) reads from this list,
 * so a new provider needs no changes outside this file plus, if it
 * needs auth, a matching entry in AuthService/IptvService source types.
 */
var Providers = (function () {
  var registry = [
    {
      id: 'fiberplus',
      name: 'Fiberplus',
      logo: 'assets/fiberplus.png',
      requiresAuth: true,
      free: false,
      // Xtream Codes backend: there is no session-token endpoint, so the
      // username/password are sent as query params on every channel
      // request (see IptvService.buildXtreamUrl).
      source: {
        type: 'xtream-proxy',
        // Local development proxy. Replace with the public HTTPS URL when
        // the proxy is deployed, for example https://iptv-proxy.example.com.
        proxyBaseUrl: 'http://localhost:3000',
        host: 'http://iptvpluss.ddns.net:25461',
        // m3u_plus/m3u8 is the combo that actually returns playable HLS
        // links with the user's credentials embedded in each channel URL
        // (e.g. .../live/<user>/<pass>/1.m3u8) — m3u+mpegts returns raw
        // .ts links that hls.js/<video> can't play.
        m3uType: 'm3u_plus',
        output: 'm3u8'
      }
    }
  ];

  function getAll() {
    return registry;
  }

  function getById(id) {
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].id === id) return registry[i];
    }
    return null;
  }

  return {
    getAll: getAll,
    getById: getById
  };
})();
