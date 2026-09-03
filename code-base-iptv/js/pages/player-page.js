/**
 * Fullscreen live player.
 *
 * Two states, matching the design:
 *
 *   - closed: just the picture, the back/title bar along the top and a single
 *     play/pause control in the bottom-left corner. Both bars fade out after
 *     a few seconds of inactivity and come back on any remote key or mouse
 *     move. Left/Right surf to the previous/next channel (wrapping at the
 *     ends), so the user can flick through the list without leaving the
 *     picture.
 *
 *   - rail open: pressing Down replaces the transport control with the
 *     provider's channel rail, opened on the channel currently playing. Up or
 *     Back closes it again; picking a tile switches channel. The bars never
 *     auto-hide while the rail is open.
 *
 * Router.resolve() calls teardown() whenever navigation leaves the #player
 * route, so playback always stops cleanly regardless of which control (back
 * button, home, remote GoBack) triggered the exit.
 */
var PlayerPage = (function () {
  var HIDE_DELAY_MS = 4000;

  var hideTimer = null;
  var currentProviderId = null;
  var currentUrl = null;
  var railOpen = false;

  function render(providerId, url) {
    var state = Store.get();
    var channel = null;
    if (state.channels && state.providerId === providerId) {
      channel =
        state.channels.filter(function (ch) {
          return ch.url === url;
        })[0] || null;
    }

    currentProviderId = providerId;
    currentUrl = url;
    railOpen = false;

    // Remembered here rather than on exit: the user can leave the player by
    // any route (back, home, the remote's GoBack, closing the app), and the
    // channel they are on is already the answer at this point.
    Store.setLastChannel(providerId, url);

    Store.setBackRoute('#home/' + providerId);
    Store.setNavHandler(handleKeyNav);
    // Back closes the rail first and only leaves the player on a second
    // press, which is what "the rail is a layer on top" should feel like.
    Store.setOnBack(handleBack);

    // Stop and release the outgoing stream *before* the markup below throws
    // its <video> away. Surfing channels re-renders this page on every
    // press, and Router.resolve() does not call teardown() when moving from
    // one #player route to another — so without this the old element is
    // orphaned mid-connect, keeps its backend connection open and fires a
    // spurious error that landed on the channel now on screen.
    VideoEngine.destroy();

    document.getElementById('app').innerHTML =
      '<div class="player-page" id="player-page">' +
      '<video id="video-player" class="player-video" autoplay></video>' +
      '<div class="player-top">' +
      '<button class="icon-btn" onclick="App.exitPlayer()" title="Volver">' +
      Icons.back(20) +
      '</button>' +
      '<div class="player-title">' +
      '<h1>' +
      Utils.escapeHtml(channel ? channel.name || 'Sin nombre' : 'Reproduciendo') +
      '</h1>' +
      (channel && channel.groupTitle
        ? '<span>' + Utils.escapeHtml(channel.groupTitle) + '</span>'
        : '') +
      '</div>' +
      '</div>' +
      '<div class="player-bottom">' +
      '<div class="player-controls">' +
      '<button class="icon-btn icon-btn-lg" id="player-toggle-play" title="Pausa">' +
      Icons.pause(22) +
      '</button>' +
      '</div>' +
      '<div class="player-rail"><div class="channels-row" id="player-rail"></div></div>' +
      '</div>' +
      '</div>';

    VideoEngine.init(document.getElementById('video-player'));
    VideoEngine.onStateChange(updateControls);
    VideoEngine.onError(handlePlaybackError);
    VideoEngine.load(url);

    document.getElementById('player-toggle-play').addEventListener('click', function () {
      VideoEngine.togglePlay();
    });

    document.addEventListener('mousemove', resetHideTimer);
    resetHideTimer();

    // Rest the cursor on the transport control rather than on the back arrow
    // (which is where SpatialNav's "topmost element" rule would put it): from
    // there Up reaches back, Down opens the rail.
    SpatialNav.focusSelector('#player-toggle-play', document.getElementById('player-page'));
  }

  /* ===== channel rail ===== */

  function railEl() {
    return document.getElementById('player-rail');
  }

  function currentIndex() {
    return ChannelRail.indexOfUrl(Store.get().channels, currentUrl);
  }

  function openRail() {
    var page = document.getElementById('player-page');
    var el = railEl();
    var channels = Store.get().channels;
    if (!page || !el || !channels || !channels.length) return;

    railOpen = true;
    page.classList.add('rail-open');
    // The rail has to exist and be laid out before SpatialNav can measure it,
    // so it is built here rather than up front with the rest of the page.
    ChannelRail.mount(el, channels, currentIndex());
    resetHideTimer();
    SpatialNav.focusSelector('.channel-card[data-index="' + currentIndex() + '"]', el);
  }

  function closeRail() {
    var page = document.getElementById('player-page');
    if (!page) return;
    railOpen = false;
    page.classList.remove('rail-open');
    resetHideTimer();
    SpatialNav.focusSelector('#player-toggle-play', page);
  }

  /* ===== channel switching ===== */

  function changeChannel(direction) {
    var list = Store.get().channels || [];
    if (list.length < 2) return;

    var idx = currentIndex();
    if (idx === -1) idx = 0;

    var next = list[(idx + direction + list.length) % list.length];
    if (!next || !next.url) return;

    Router.navigate('#player/' + currentProviderId + '/' + encodeURIComponent(next.url));
  }

  /* ===== errors ===== */

  function handlePlaybackError(message) {
    var page = document.getElementById('player-page');
    if (!page) return;

    var existing = document.getElementById('player-error-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.id = 'player-error-overlay';
    overlay.className = 'player-error-overlay';
    overlay.innerHTML =
      '<div class="state-message is-error">' +
      Utils.escapeHtml(message) +
      '</div>' +
      '<div class="state-actions">' +
      '<button class="btn btn-ghost" onclick="PlayerPage.retry()">Reintentar</button>' +
      '<button class="btn btn-ghost" onclick="PlayerPage.skip(1)">Siguiente canal</button>' +
      '<button class="btn btn-primary" onclick="App.exitPlayer()">Volver</button>' +
      '</div>';
    page.appendChild(overlay);
    SpatialNav.focusFirst(overlay);
  }

  function dismissError() {
    var overlay = document.getElementById('player-error-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function retry() {
    dismissError();
    VideoEngine.load(currentUrl);
    SpatialNav.focusFirst(document.getElementById('player-page'));
  }

  function skip(direction) {
    dismissError();
    changeChannel(direction);
  }

  /* ===== controls ===== */

  function updateControls(s) {
    var playBtn = document.getElementById('player-toggle-play');
    if (!playBtn) return;
    playBtn.innerHTML = s.playing ? Icons.pause(22) : Icons.play(22);
    playBtn.setAttribute('title', s.playing ? 'Pausa' : 'Reproducir');
  }

  function resetHideTimer() {
    var page = document.getElementById('player-page');
    if (!page) return;
    page.classList.remove('controls-hidden');
    if (hideTimer) clearTimeout(hideTimer);
    // The rail is a deliberate, navigable layer — fading it out from under
    // the cursor would strand the user on an invisible tile.
    if (railOpen) return;
    hideTimer = setTimeout(function () {
      page.classList.add('controls-hidden');
    }, HIDE_DELAY_MS);
  }

  /* ===== input ===== */

  function handleBack() {
    if (railOpen) {
      closeRail();
      return;
    }
    Router.navigate(Store.get().backRoute || '#providers');
  }

  function handleKeyNav(e) {
    resetHideTimer();

    // Dedicated hardware play/pause key always toggles playback, regardless
    // of which on-screen control currently has focus.
    if (e.keyCode === 41589 || e.key === 'MediaPlayPause') {
      e.preventDefault();
      VideoEngine.togglePlay();
      return;
    }

    // While the error overlay is up it owns navigation entirely: its buttons
    // are the only useful stops and channel surfing would hide it.
    var overlay = document.getElementById('player-error-overlay');
    if (overlay) {
      SpatialNav.handleKey(e, overlay);
      return;
    }

    var page = document.getElementById('player-page');
    var isDown = e.keyCode === 40 || e.key === 'ArrowDown';
    var isUp = e.keyCode === 38 || e.key === 'ArrowUp';

    if (!railOpen && isDown) {
      e.preventDefault();
      openRail();
      return;
    }

    if (railOpen) {
      // Up out of the rail closes it; everything else (Left/Right along the
      // tiles, Enter to pick one) is ordinary navigation inside the rail.
      if (isUp) {
        e.preventDefault();
        closeRail();
        return;
      }
      SpatialNav.handleKey(e, page);
      ChannelRail.extend(railEl(), Store.get().channels);
      return;
    }

    // Rail closed: Left/Right surf channels, everything else drives focus
    // across the back and play/pause buttons.
    if (e.keyCode === 39 || e.key === 'ArrowRight') {
      e.preventDefault();
      changeChannel(1);
    } else if (e.keyCode === 37 || e.key === 'ArrowLeft') {
      e.preventDefault();
      changeChannel(-1);
    } else {
      SpatialNav.handleKey(e, page);
    }
  }

  function teardown() {
    document.removeEventListener('mousemove', resetHideTimer);
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    railOpen = false;
    Store.setOnBack(null);
    VideoEngine.destroy();
  }

  return { render: render, teardown: teardown, retry: retry, skip: skip };
})();
