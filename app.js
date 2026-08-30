/* ============================================================
 * 应用启动 + 横竖屏切换
 * 竖屏：iframe → https://totp99.github.io/Mp3-player/
 * 横屏：Phaser 老虎机
 * 状态：同源 localStorage（wanjin_slot_save + bgMusic*）
 * ============================================================ */

var MP3_PLAYER_URL = "https://totp99.github.io/Mp3-player/";

(function bootstrapGame() {
  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game",
    backgroundColor: "#090b0b",
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    scene: SlotGame,
  };

  window.__slotGame = new Phaser.Game(config);

  function unlockAudioOnce() {
    try {
      const sc =
        window.__slotGameScene ||
        (window.__slotGame &&
          window.__slotGame.scene &&
          window.__slotGame.scene.getScenes()[0]);
      if (sc && sc.sfx) {
        sc.sfx.enabled = true;
        sc.sfx.init();
        sc.sfx.warmup();
      } else {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          if (ctx.state === "suspended") {
            const r = ctx.resume();
            if (r && typeof r.catch === "function") r.catch(function () {});
          }
        }
      }
    } catch (e) {}
    try {
      bgMusic.tryPlay();
    } catch (e) {}
    document.removeEventListener("touchstart", unlockAudioOnce, true);
    document.removeEventListener("mousedown", unlockAudioOnce, true);
    document.removeEventListener("keydown", unlockAudioOnce, true);
  }
  document.addEventListener("touchstart", unlockAudioOnce, true);
  document.addEventListener("mousedown", unlockAudioOnce, true);
  document.addEventListener("keydown", unlockAudioOnce, true);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    try {
      if (
        window.matchMedia &&
        window.matchMedia("(orientation: landscape)").matches
      ) {
        bgMusic.tryPlay();
      }
    } catch (e) {}
  });

  window.addEventListener("beforeunload", function () {
    try {
      const sc = window.__slotGameScene;
      if (sc && sc.clockTimer) {
        clearInterval(sc.clockTimer);
        sc.clockTimer = null;
      }
      if (sc && typeof sc.saveGameState === "function") sc.saveGameState(true);
    } catch (e) {}
  });
})();

(function setupOrientationTransition() {
  const tip = document.getElementById("rotate-tip");
  const gameEl = document.getElementById("game");
  const frame = document.getElementById("mp3-frame");
  if (!tip || !gameEl) return;

  let lastPortrait = null;
  let switching = false;
  let debounceTimer = 0;
  let stabilizeTimer = 0;
  let pendingPortrait = null;
  let frameLoaded = false;

  const isIOS =
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    (!!navigator.vendor &&
      navigator.vendor.indexOf("Apple") >= 0 &&
      "ontouchend" in document);

  function getScene() {
    return window.__slotGameScene || null;
  }
  function getGame() {
    return window.__slotGame || null;
  }

  /** 同步写出：切竖屏前必须立刻落盘，不能 debounce */
  function flushStateOut() {
    try {
      const sc = getScene();
      if (sc && typeof sc.saveGameState === "function") {
        sc.saveGameState(true);
      }
    } catch (e) {}
  }

  /**
   * 从 localStorage 精确读回竖屏改过的数据。
   * updateDisplay(true) 只刷新 UI，不再二次写入。
   */
  function pullStateIn() {
    try {
      const sc = getScene();
      if (sc && typeof sc.loadGameState === "function") {
        sc.loadGameState();
        if (typeof sc.updateDisplay === "function") sc.updateDisplay(true);
        if (typeof sc.refreshTrackLabel === "function") sc.refreshTrackLabel();
        if (typeof sc.refreshPlayPauseIcon === "function")
          sc.refreshPlayPauseIcon();
      }
    } catch (e) {}

    // 曲号 / 模式：竖屏播放器可能已改写 bgMusic* 键
    try {
      if (typeof bgMusic === "undefined") return;
      const n = parseInt(localStorage.getItem("bgMusicCurrentNum") || "", 10);
      if (
        Number.isFinite(n) &&
        n >= 1 &&
        n !== bgMusic.currentNum &&
        typeof bgMusic._loadTrack === "function"
      ) {
        const playing = bgMusic.isPlaying();
        bgMusic._loadTrack(n);
        if (playing && bgMusic.enabled) bgMusic.tryPlay();
      }
      const mode = localStorage.getItem("bgMusicPlayMode");
      if (
        mode &&
        mode !== bgMusic.playMode &&
        typeof bgMusic.setPlayMode === "function"
      ) {
        bgMusic.setPlayMode(mode);
      }
      const en = localStorage.getItem("bgMusicEnabled");
      if (en === "true" || en === "false") {
        const want = en === "true";
        if (want !== bgMusic.enabled && typeof bgMusic.setEnabled === "function") {
          bgMusic.setEnabled(want);
        }
      }
    } catch (e) {}
  }

  function pauseSceneTimers() {
    try {
      const sc = getScene();
      if (sc && sc.clockTimer) {
        clearInterval(sc.clockTimer);
        sc.clockTimer = null;
      }
    } catch (e) {}
  }

  function resumeSceneTimers() {
    try {
      const sc = getScene();
      if (!sc || sc.clockTimer) return;
      if (typeof sc.updateLiveClock !== "function") return;
      sc.updateLiveClock();
      sc.clockTimer = setInterval(function () {
        try {
          sc.updateLiveClock();
        } catch (e) {}
      }, 250);
    } catch (e) {}
  }

  function sleepGame() {
    const g = getGame();
    if (!g) return;
    pauseSceneTimers();
    try {
      if (g.canvas) {
        g.canvas.style.visibility = "hidden";
        g.canvas.style.pointerEvents = "none";
      }
    } catch (e) {}
    try {
      if (typeof bgMusic !== "undefined") bgMusic.pause();
    } catch (e) {}

    // Safari：禁止 loop.sleep / game.pause，否则旋转会死锁
    if (isIOS) {
      try {
        const sc = getScene();
        if (sc && sc.sys && typeof sc.sys.pause === "function" && !sc.sys.isPaused()) {
          sc.sys.pause();
        }
      } catch (e) {}
      try {
        if (g.scene && typeof g.scene.pause === "function") g.scene.pause("SlotGame");
      } catch (e) {}
      return;
    }

    try {
      if (g.scene && typeof g.scene.sleep === "function") {
        try {
          g.scene.sleep("SlotGame");
        } catch (e2) {}
      }
    } catch (e) {}
    try {
      if (g.loop && !g.loop.sleeping) g.loop.sleep();
    } catch (e) {}
    try {
      if (typeof g.pause === "function" && !g.isPaused) g.pause();
    } catch (e) {}
  }

  function wakeGame() {
    const g = getGame();
    if (!g) return;

    if (isIOS) {
      try {
        if (g.scene && typeof g.scene.resume === "function") g.scene.resume("SlotGame");
      } catch (e) {}
      try {
        const sc = getScene();
        if (sc && sc.sys && typeof sc.sys.resume === "function" && sc.sys.isPaused()) {
          sc.sys.resume();
        }
      } catch (e) {}
      resumeSceneTimers();
      setTimeout(function () {
        try {
          const gg = getGame();
          if (gg && gg.canvas) {
            gg.canvas.style.visibility = "";
            gg.canvas.style.pointerEvents = "";
          }
          if (gg && gg.scale && typeof gg.scale.refresh === "function") gg.scale.refresh();
        } catch (e) {}
      }, 400);
      return;
    }

    try {
      if (typeof g.resume === "function" && g.isPaused) g.resume();
    } catch (e) {}
    try {
      if (g.scene && typeof g.scene.wake === "function") {
        try {
          g.scene.wake("SlotGame");
        } catch (e2) {}
      }
    } catch (e) {}
    try {
      if (g.loop && g.loop.sleeping) g.loop.wake();
    } catch (e) {}
    resumeSceneTimers();
    try {
      if (g.canvas) {
        g.canvas.style.visibility = "";
        g.canvas.style.pointerEvents = "";
      }
    } catch (e) {}
    setTimeout(function () {
      try {
        const gg = getGame();
        if (gg && gg.scale && typeof gg.scale.refresh === "function") gg.scale.refresh();
      } catch (e) {}
    }, 280);
  }

  function ensureFrame() {
    if (!frame) return;
    // 每次进竖屏重新加载，保证读到最新 localStorage
    frame.src = MP3_PLAYER_URL;
    frameLoaded = true;
  }

  function unloadFrame() {
    if (!frame) return;
    try {
      frame.src = "about:blank";
    } catch (e) {}
    frameLoaded = false;
  }

  function apply(portrait, animate) {
    if (portrait === lastPortrait) {
      pendingPortrait = null;
      return;
    }
    if (switching) {
      pendingPortrait = portrait;
      return;
    }
    switching = true;
    pendingPortrait = null;
    lastPortrait = portrait;

    try {
      if (portrait) {
        flushStateOut();
        gameEl.classList.add("dimmed");
        sleepGame();
        ensureFrame();
        if (animate && window.requestAnimationFrame) {
          requestAnimationFrame(function () {
            tip.classList.add("show");
          });
        } else {
          tip.classList.add("show");
        }
      } else {
        tip.classList.remove("show");
        unloadFrame();
        pullStateIn();
        wakeGame();
        if (animate) {
          setTimeout(function () {
            gameEl.classList.remove("dimmed");
          }, isIOS ? 450 : 360);
        } else {
          gameEl.classList.remove("dimmed");
        }
        try {
          if (typeof bgMusic !== "undefined" && bgMusic.enabled) bgMusic.tryPlay();
        } catch (e) {}
      }
    } finally {
      setTimeout(function () {
        switching = false;
        if (pendingPortrait !== null && pendingPortrait !== lastPortrait) {
          const p = pendingPortrait;
          pendingPortrait = null;
          apply(p, false);
        } else {
          pendingPortrait = null;
        }
      }, isIOS ? 600 : 480);
    }
  }

  function isPortrait() {
    try {
      if (window.matchMedia) {
        return window.matchMedia("(orientation: portrait)").matches;
      }
    } catch (e) {}
    if (typeof window.orientation === "number") {
      return Math.abs(window.orientation) !== 90;
    }
    return window.innerHeight > window.innerWidth;
  }

  function scheduleCheck(animate) {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (stabilizeTimer) clearTimeout(stabilizeTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = 0;
      var w1 = window.innerWidth || 0;
      var h1 = window.innerHeight || 0;
      stabilizeTimer = setTimeout(function () {
        stabilizeTimer = 0;
        var w2 = window.innerWidth || 0;
        var h2 = window.innerHeight || 0;
        if (w1 !== w2 || h1 !== h2) {
          scheduleCheck(animate);
          return;
        }
        apply(isPortrait(), !!animate);
      }, isIOS ? 120 : 80);
    }, isIOS ? 220 : 180);
  }

  apply(isPortrait(), false);

  function onChange() {
    if (switching) {
      pendingPortrait = isPortrait();
      return;
    }
    scheduleCheck(true);
  }

  window.addEventListener("orientationchange", onChange);
  window.addEventListener("resize", onChange);
  try {
    if (window.matchMedia) {
      const mql = window.matchMedia("(orientation: portrait)");
      if (mql.addEventListener) mql.addEventListener("change", onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }
  } catch (e) {}
})();
