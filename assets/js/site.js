(function () {
  'use strict';

  var root = document.documentElement;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var canHover = mq('(hover: hover) and (pointer: fine)');
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData;
  var autoMotion = !reduceMotion && !saveData;

  function safePlay(video) {
    var p = video.play();
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }

  function ensureSrc(video, src) {
    if (!video.getAttribute('src')) video.setAttribute('src', src || video.dataset.src);
  }

  /* ---------- Intro: open the shutter once the title font is ready ---------- */
  if (root.classList.contains('intro')) {
    var started = false;
    var go = function () {
      if (started) return;
      started = true;
      // Commit the closed state before opening so the transition runs
      void getComputedStyle(document.querySelector('.screen-frame')).clipPath;
      root.classList.add('go');
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load('800 100px "Archivo"').then(go, go);
    }
    setTimeout(go, 1200);
  }

  /* ---------- Hero film: silent loop, sized to the screen ---------- */
  var hero = document.getElementById('hero-video');
  if (hero) {
    var wide = window.innerWidth >= 1000 && !saveData;
    hero.setAttribute('src', wide ? hero.dataset.srcLarge : hero.dataset.srcSmall);
    hero.muted = true;

    if (autoMotion) {
      hero.setAttribute('preload', 'auto');
      safePlay(hero);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) safePlay(hero); else hero.pause();
          });
        }, { threshold: 0.15 }).observe(hero);
      }
    }
  }

  /* ---------- Player (lightbox with sound) ---------- */
  var player = document.getElementById('player');
  var playerVideo = player ? player.querySelector('.player-video') : null;
  var playerTitle = player ? player.querySelector('.player-title') : null;
  var playerPlace = player ? player.querySelector('[data-player-place]') : null;
  var lastTrigger = null;
  var pausedHero = false;

  function openFilm(data, trigger) {
    if (!player || !playerVideo) return;
    lastTrigger = trigger || null;

    playerTitle.textContent = data.title || '';
    if (data.runtime) {
      var rt = document.createElement('span');
      rt.className = 'runtime';
      rt.textContent = data.runtime;
      playerTitle.appendChild(rt);
    }
    playerPlace.textContent = data.place || '';
    playerVideo.setAttribute('aria-label', (data.title || 'Film') + ', with sound');
    playerVideo.poster = data.poster || '';
    playerVideo.src = data.src;
    playerVideo.muted = false;

    if (hero && !hero.paused) { hero.pause(); pausedHero = true; }
    document.querySelectorAll('.film-preview').forEach(function (v) { v.pause(); });

    if (typeof player.showModal === 'function') player.showModal();
    else player.setAttribute('open', '');

    safePlay(playerVideo);
  }

  function closeFilm() {
    if (!player) return;
    if (player.open && typeof player.close === 'function') player.close();
    else player.removeAttribute('open');
  }

  if (player) {
    player.addEventListener('close', function () {
      playerVideo.pause();
      playerVideo.removeAttribute('src');
      playerVideo.load();
      if (pausedHero && hero && autoMotion) safePlay(hero);
      pausedHero = false;
      if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    });
    player.addEventListener('click', function (e) {
      // Click on the dark area around the film closes it
      if (e.target === player) closeFilm();
    });
    player.querySelector('[data-close]').addEventListener('click', closeFilm);
  }

  document.querySelectorAll('[data-open-film]').forEach(function (btn) {
    btn.addEventListener('click', function () { openFilm(btn.dataset, btn); });
  });

  /* ---------- Sample film cards ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.film'));

  cards.forEach(function (card) {
    var preview = card.querySelector('.film-preview');
    var button = card.querySelector('.film-play');

    card.addEventListener('click', function () { openFilm(card.dataset, button); });

    if (canHover && preview && !reduceMotion) {
      card.addEventListener('pointerenter', function () {
        ensureSrc(preview);
        safePlay(preview);
      });
      card.addEventListener('pointerleave', function () { preview.pause(); });
    }
  });

  // Touch screens: play the silent preview of the film that is in view
  if (!canHover && autoMotion && 'IntersectionObserver' in window) {
    var previewObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target.querySelector('.film-preview');
        if (!v) return;
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          ensureSrc(v);
          safePlay(v);
        } else {
          v.pause();
        }
      });
    }, { threshold: [0, 0.6, 1] });
    cards.forEach(function (c) { previewObserver.observe(c.querySelector('.film-frame')); });
  }

  /* ---------- Floating WhatsApp button ---------- */
  var dock = document.querySelector('[data-dock]');
  var watched = document.querySelectorAll('[data-cta]');
  if (dock && 'IntersectionObserver' in window) {
    // Show it only when none of the page's own WhatsApp buttons are on screen
    var visibleCtas = new Set();
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visibleCtas.add(e.target); else visibleCtas.delete(e.target);
      });
      dock.classList.toggle('is-visible', visibleCtas.size === 0);
    });
    watched.forEach(function (el) { ctaObserver.observe(el); });
  }
})();
