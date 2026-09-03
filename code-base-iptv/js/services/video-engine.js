/**
 * Thin wrapper around <video> + hls.js. Renamed from the old Player module.
 * `onStateChange` lets the player page keep its play/pause/mute icons in
 * sync without polling. `onError` lets it show a real message + let the
 * user retry/skip instead of the stream just silently freezing — some
 * channels in a big IPTV list are offline or briefly glitchy at any given
 * moment, which is a content problem, not something the app can prevent,
 * but it can at least surface it instead of hanging.
 */
var VideoEngine = (function () {
  var MAX_FATAL_RETRIES = 3;
  var RETRY_DELAY_MS = 1000;
  // Server explicitly rejected the request — retrying the exact same URL
  // will just get the exact same answer, so don't burn retries (or hammer
  // the panel) on these.
  var NON_RETRYABLE_HTTP_CODES = [400, 401, 403, 404, 410, 451];

  var hlsInstance = null;
  var videoElement = null;
  var stateListener = null;
  var errorListener = null;
  var fatalRetryCount = 0;
  var retryTimer = null;

  /* Identifies the current load. Every load() and every destroy() bumps it,
   * and each stream's callbacks capture the value they were started with.
   *
   * Tearing a stream down is asynchronous and noisy: aborting a connection
   * mid-handshake makes the browser fire MEDIA_ERR / a fatal hls.js network
   * error a moment later. While surfing channels those late events arrive
   * after the next channel is already on screen, and without this guard they
   * were reported as "no se pudo reproducir este canal" against a channel
   * that was playing perfectly well. A callback whose token no longer
   * matches belongs to a stream nobody is watching, so it is dropped. */
  var loadToken = 0;

  function isCurrentLoad(token) {
    return token === loadToken;
  }

  // webOS renders <video> as a hardware-composited "hole punch" layer
  // positioned from the element's box at the moment playback starts, and on
  // some TV models/firmwares it does not track later CSS-driven reflows —
  // leaving the picture stuck smaller than (or offset from) the fixed/inset
  // CSS box once panel resolution differs from what the layout last saw.
  // Pinning explicit pixel dimensions (instead of relying purely on
  // position:fixed/inset:0 percentages) and re-asserting them on resize
  // keeps the hole in sync with the actual viewport on every screen.
  function syncGeometry() {
    if (!videoElement) return;
    videoElement.style.width = window.innerWidth + 'px';
    videoElement.style.height = window.innerHeight + 'px';
  }

  function init(videoEl) {
    // A page re-render replaces the <video> in the DOM, and the player page
    // re-renders on every channel change. Release whatever element we were
    // holding before the reference to it is lost — see releaseElement.
    if (videoElement && videoElement !== videoEl) releaseElement();

    videoElement = videoEl;
    if (!videoElement) return;
    videoElement.addEventListener('play', emitState);
    videoElement.addEventListener('pause', emitState);
    videoElement.addEventListener('volumechange', emitState);
    syncGeometry();
    window.addEventListener('resize', syncGeometry);
  }

  /* Detaches the current <video> completely: handlers off, playback stopped,
   * src cleared, resize hook removed.
   *
   * Split out of destroy() because an element can also be orphaned *without*
   * going through destroy() — a re-render simply drops it out of the DOM. An
   * orphaned <video> is not harmless: it holds its network connection open
   * (an Xtream backend counts that against the account's connection limit,
   * so re-opening the same channel is refused) and its handlers still point
   * into this module. */
  function releaseElement() {
    if (!videoElement) return;
    // Order matters: detach the handler before clearing src, because
    // clearing it is itself what fires the spurious MEDIA_ERR.
    videoElement.onerror = null;
    videoElement.removeEventListener('play', emitState);
    videoElement.removeEventListener('pause', emitState);
    videoElement.removeEventListener('volumechange', emitState);
    videoElement.pause();
    videoElement.src = '';
    videoElement.removeAttribute('src');
    videoElement.load();
    window.removeEventListener('resize', syncGeometry);
    videoElement = null;
  }

  function emitState() {
    if (stateListener) stateListener(getState());
  }

  function onStateChange(fn) {
    stateListener = fn;
  }

  function onError(fn) {
    errorListener = fn;
  }

  function emitError(message) {
    if (errorListener) errorListener(message);
  }

  function giveUp() {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    emitError('No se pudo reproducir este canal.');
  }

  function handleFatalHlsError(data, token) {
    var httpCode = data.response && data.response.code;
    console.error('HLS fatal error:', data.type, data.details, httpCode || '');

    if (httpCode && NON_RETRYABLE_HTTP_CODES.indexOf(httpCode) !== -1) {
      giveUp();
      return;
    }

    if (fatalRetryCount >= MAX_FATAL_RETRIES) {
      giveUp();
      return;
    }
    fatalRetryCount++;

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      retryTimer = setTimeout(function () {
        // The user may have surfed on during the retry delay.
        if (!isCurrentLoad(token)) return;
        if (hlsInstance) hlsInstance.startLoad();
      }, RETRY_DELAY_MS);
    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      hlsInstance.recoverMediaError();
    } else {
      giveUp();
    }
  }

  // LG webOS TVs ship a hardware media pipeline that plays HLS + MPEG-TS
  // with H.264 / H.265(HEVC) / AAC / AC3 natively — a far wider codec set
  // than hls.js can decode through MSE in the same browser engine. hls.js
  // only demuxes what MSE accepts, so a channel whose video is HEVC (or a
  // H.264 profile MSE rejects) comes through as audio-only in a desktop
  // browser and as nothing at all on the TV (webOS's MSE is even more
  // restrictive than desktop Chrome's). Handing the raw stream straight to
  // the native <video> lets the panel's own decoder handle all of them.
  function isWebOS() {
    var ua = (navigator.userAgent || '').toLowerCase();
    return (
      ua.indexOf('web0s') !== -1 ||
      ua.indexOf('webos') !== -1 ||
      typeof window.PalmSystem !== 'undefined'
    );
  }

  function canPlayNativeHls() {
    return !!(
      videoElement &&
      videoElement.canPlayType &&
      videoElement.canPlayType('application/vnd.apple.mpegurl')
    );
  }

  // Prefer the native player whenever it can actually do HLS: always on
  // webOS, plus Safari/iOS which report native HLS support. Everything else
  // (desktop Chrome/Firefox, no native HLS) falls back to hls.js.
  function preferNativeHls() {
    if (isWebOS()) return true;

    var ua = (navigator.userAgent || '').toLowerCase();
    var isSafari =
      ua.indexOf('safari') !== -1 &&
      ua.indexOf('chrome') === -1 &&
      ua.indexOf('android') === -1;
    var isAppleMobile = /iphone|ipad|ipod/.test(ua);

    return isSafari || isAppleMobile;
  }

  function NumericManifestLoader(config) {
    this.loader = new Hls.DefaultConfig.loader(config);
  }

  NumericManifestLoader.prototype.load = function (context, config, callbacks) {
    var onSuccess = callbacks.onSuccess;
    callbacks.onSuccess = function (response, stats, loadContext) {
      if (typeof response.data === 'string' && M3UParser && M3UParser.decode) {
        response.data = M3UParser.decode(response.data);
      }
      onSuccess(response, stats, loadContext);
    };
    this.loader.load(context, config, callbacks);
  };

  NumericManifestLoader.prototype.abort = function () {
    this.loader.abort();
  };

  NumericManifestLoader.prototype.destroy = function () {
    this.loader.destroy();
  };

  function createHls() {
    return new Hls({
      loader: NumericManifestLoader,
      enableWorker: false,
      lowLatencyMode: false,
      backBufferLength: 30,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      manifestLoadingMaxRetry: 2,
      levelLoadingMaxRetry: 2,
      fragLoadingMaxRetry: 2,
      manifestLoadingRetryDelay: 1000,
      levelLoadingRetryDelay: 1000,
      fragLoadingRetryDelay: 1000,
      manifestLoadingTimeOut: 15000,
      levelLoadingTimeOut: 15000,
      fragLoadingTimeOut: 20000
    });
  }

  function handleNativeError(token) {
    // Late error from a stream that has already been replaced or torn down:
    // it says nothing about whatever is on screen now.
    if (!isCurrentLoad(token)) return;
    var err = videoElement && videoElement.error;
    console.error('Native playback error:', err ? err.code : '(none)');
    emitError('No se pudo reproducir este canal.');
  }

  function playNative(url, token) {
    // The native error event is the only failure signal on this path (there
    // is no hls.js to report fatal errors), so wire it up before loading.
    videoElement.onerror = function () {
      handleNativeError(token);
    };
    videoElement.src = url;
    videoElement.load();
    videoElement.play().catch(function (e) {
      console.log('Autoplay blocked:', e);
    });
  }

  function load(url) {
    // Bumps loadToken, so anything still in flight from the previous stream
    // is now stale and its callbacks will bail out.
    destroy(true);
    fatalRetryCount = 0;

    if (!videoElement) {
      console.error('VideoEngine not initialized');
      return;
    }

    var token = loadToken;

    // Defer to the next paint so the video box has its final laid-out size
    // before playback (and the hole-punch geometry derived from it) starts.
    requestAnimationFrame(syncGeometry);

    videoElement.src = '';
    videoElement.removeAttribute('src');

    var isHls = url.indexOf('.m3u8') !== -1;

    if (isHls && preferNativeHls()) {
      // LG TV / Safari: native hardware decode — the whole point of the fix.
      playNative(url, token);
    } else if (isHls && window.Hls && Hls.isSupported()) {
      // Desktop-browser fallback only: hls.js over MSE.
      hlsInstance = createHls();
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoElement);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
        if (!isCurrentLoad(token)) return;
        videoElement.play().catch(function (e) {
          console.log('Autoplay blocked:', e);
        });
      });
      hlsInstance.on(Hls.Events.ERROR, function (event, data) {
        if (!isCurrentLoad(token)) return;
        if (data.fatal) handleFatalHlsError(data, token);
      });
    } else if (isHls) {
      console.error('HLS not supported on this device');
      emitError('Este dispositivo no soporta reproducción HLS.');
    } else {
      // Plain progressive stream (.ts / .mp4): native element handles it.
      playNative(url, token);
    }
  }

  function destroy(keepElement) {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    // Everything belonging to the stream being torn down is stale from here
    // on, however late it arrives.
    loadToken++;

    if (keepElement) {
      if (videoElement) {
        // Detach the native error handler first: clearing src below fires a
        // spurious MEDIA_ERR that would otherwise pop the error overlay
        // during a normal teardown / channel switch.
        videoElement.onerror = null;
        videoElement.pause();
        videoElement.src = '';
        videoElement.removeAttribute('src');
        videoElement.load();
      }
      return;
    }

    releaseElement();
    stateListener = null;
    errorListener = null;
  }

  function togglePlay() {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play().catch(function (e) {
        console.log('Play error:', e);
      });
    } else {
      videoElement.pause();
    }
  }

  function toggleMute() {
    if (!videoElement) return;
    videoElement.muted = !videoElement.muted;
  }

  function setVolume(vol) {
    if (videoElement) {
      videoElement.volume = Math.max(0, Math.min(1, vol));
    }
  }

  function seek(time) {
    if (videoElement) {
      videoElement.currentTime = time;
    }
  }

  function getCurrentTime() {
    return videoElement ? videoElement.currentTime : 0;
  }

  function getDuration() {
    return videoElement ? videoElement.duration || 0 : 0;
  }

  function isPlaying() {
    return videoElement ? !videoElement.paused : false;
  }

  function isMuted() {
    return videoElement ? videoElement.muted : false;
  }

  function getVolume() {
    return videoElement ? videoElement.volume : 0.5;
  }

  function getState() {
    return {
      playing: isPlaying(),
      muted: isMuted(),
      volume: getVolume(),
      currentTime: getCurrentTime(),
      duration: getDuration()
    };
  }

  return {
    init: init,
    load: load,
    destroy: destroy,
    togglePlay: togglePlay,
    toggleMute: toggleMute,
    setVolume: setVolume,
    getVolume: getVolume,
    seek: seek,
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    isPlaying: isPlaying,
    isMuted: isMuted,
    getState: getState,
    onStateChange: onStateChange,
    onError: onError,
    isWebOS: isWebOS,
    createHls: createHls
  };
})();
