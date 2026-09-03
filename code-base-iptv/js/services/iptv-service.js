/**
 * Fetches and parses M3U channel lists for any provider.
 */
var IptvService = (function () {
  var REQUEST_TIMEOUT_MS = 15000;

  async function fetchM3U(url) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeout = controller
      ? setTimeout(function () {
          controller.abort();
        }, REQUEST_TIMEOUT_MS)
      : null;

    try {
      var response = await fetch(url, {
        method: 'GET',
        // Do not send custom headers from the TV/browser. A custom
        // User-Agent triggers a CORS preflight and IPTV panels generally do
        // not answer that OPTIONS request.
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) {
        throw new Error(
          'Error al conectar con el servidor IPTV: ' + response.statusText
        );
      }
      var text = await response.text();
      var result = M3UParser.parse(text);
      return result.channels || [];
    } catch (err) {
      console.error('IptvService fetch error:', err);
      if (err && err.name === 'AbortError') {
        throw new Error('El servidor IPTV tardo demasiado en responder.');
      }
      if (err && err.name === 'TypeError') {
        throw new Error(
          'El navegador bloqueo la conexion IPTV por CORS. Se necesita un proxy HTTPS del proveedor.'
        );
      }
      throw err;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  function buildXtreamUrl(host, username, password, m3uType, output) {
    return (
      host +
      '/get.php?username=' +
      encodeURIComponent(username) +
      '&password=' +
      encodeURIComponent(password) +
      '&type=' + (m3uType || 'm3u_plus') +
      '&output=' + (output || 'm3u8')
    );
  }

  function fetchXtream(host, username, password, m3uType, output) {
    return fetchM3U(buildXtreamUrl(host, username, password, m3uType, output));
  }

  function fetchXtreamProxy(baseUrl, username, password) {
    var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
    var url =
      baseUrl +
      separator +
      'username=' +
      encodeURIComponent(username) +
      '&password=' +
      encodeURIComponent(password);
    return fetchM3U(url);
  }

  function fetchForProvider(provider, credentials) {
    if (provider.source.type === 'xtream-proxy') {
      return fetchXtreamProxy(
        provider.source.proxyBaseUrl + '/api/playlist',
        credentials.username,
        credentials.password
      );
    }
    if (provider.source.type === 'xtream') {
      return fetchXtream(
        provider.source.host,
        credentials.username,
        credentials.password,
        provider.source.m3uType,
        provider.source.output
      );
    }
    return fetchM3U(provider.source.url);
  }

  return {
    fetchM3U: fetchM3U,
    fetchXtream: fetchXtream,
    fetchForProvider: fetchForProvider
  };
})();
