/* ============================================================
 * 应用启动 + 横竖屏切换控制
 * 依赖：Phaser、SlotGame（slot-game.js）、bgMusic（bg-music.js）、
 * window.__phonograph（phonograph.js 暴露的 start/stop/sync）。
 * 必须在以上文件之后加载，是整个页面的最后一块拼图。
 * ============================================================ */

// ---------- 启动 Phaser 游戏 ----------
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

  const slotGame = new Phaser.Game(config);
  window.__slotGame = slotGame;

  // 首点解锁音频（iOS / 部分 Android 需用户手势）
  function unlockAudioOnce() {
    try {
      // 优先唤醒游戏实际使用的 SoundFX，而不是另开一个马上关闭的 AudioContext
      const gameScene =
        window.__slotGameScene ||
        (window.__slotGame && window.__slotGame.scene && window.__slotGame.scene.getScenes()[0]);
      if (gameScene && gameScene.sfx) {
        gameScene.sfx.enabled = true;
        gameScene.sfx.init();
        gameScene.sfx.warmup();
      } else {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          if (ctx.state === "suspended") {
            const r = ctx.resume();
            if (r && typeof r.catch === "function") r.catch(() => {});
          }
        }
      }
    } catch (e) {}
    try {
      bgMusic.tryPlay(); // 首次用户手势时启动背景音乐（若已开启）
    } catch (e) {}
    document.removeEventListener("touchstart", unlockAudioOnce, true);
    document.removeEventListener("mousedown", unlockAudioOnce, true);
    document.removeEventListener("keydown", unlockAudioOnce, true);
  }
  document.addEventListener("touchstart", unlockAudioOnce, true);
  document.addEventListener("mousedown", unlockAudioOnce, true);
  document.addEventListener("keydown", unlockAudioOnce, true);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      try { bgMusic.tryPlay(); } catch (e) {}
    }
  });

  // 注：canvas 的尺寸/居中完全交给上面 scale.mode = Phaser.Scale.FIT 处理。
  // 早期版本这里还有一个 fitGameCanvas()，在 resize/orientationchange 时把
  // canvas 的 style.width/height 强行改成 "100%"，这会在 Phaser 自己算完
  // letterbox 尺寸之后又把它覆盖掉；如果 #game/#game-wrapper 的尺寸又依赖
  // canvas 撑开，就会出现「Phaser 算尺寸 → 被强行改成 100% → 容器尺寸变化
  // → 又触发一次 resize → Phaser 再算 → 又被覆盖……」的抖动/死循环，这正是
  // 横竖屏来回切换时页面卡死、必须刷新才能恢复的根因。已删除该函数与它绑定
  // 的 resize / orientationchange 监听，不再和 Scale.FIT 抢控制权。

  window.addEventListener("beforeunload", function () {
    try {
      if (window.__slotGameScene && window.__slotGameScene.clockTimer) {
        clearInterval(window.__slotGameScene.clockTimer);
      }
    } catch (e) {}
  });
})();

// ---------- 横竖屏切换：竖屏留声机 / 横屏老虎机 ----------
(function setupOrientationTransition() {
  const tip = document.getElementById("rotate-tip");
  const game = document.getElementById("game");
  if (!tip || !game) return;

  let lastPortrait = null;

  // 竖屏时老虎机画布被留声机盖住看不见，但如果不主动暂停，Phaser 的渲染/
  // 更新循环（含多个 repeat:-1 的呼吸动画、EQ 频谱采样）会继续在后台全速跑，
  // 和留声机自己的 requestAnimationFrame 循环叠在一起，同时还各自去采样/
  // 操作同一个 WebAudio AnalyserNode。手机上长时间来回切横竖屏，这种双重
  // 循环叠加很容易把主线程/GPU 顶到卡死，必须刷新页面才能恢复。
  // 用 game.loop.sleep()/wake() 彻底挂起 Phaser 的动画帧循环，
  // 而不只是用 CSS 把画布调暗——同一时间只有一套循环在跑。
  function sleepGame() {
    try {
      if (window.__slotGame && window.__slotGame.loop && !window.__slotGame.loop.sleeping) {
        window.__slotGame.loop.sleep();
      }
    } catch (e) {}
  }
  function wakeGame() {
    try {
      if (window.__slotGame && window.__slotGame.loop && window.__slotGame.loop.sleeping) {
        window.__slotGame.loop.wake();
      }
    } catch (e) {}
  }

  function apply(portrait, animate) {
    if (portrait === lastPortrait) return;
    lastPortrait = portrait;

    if (portrait) {
      game.classList.add("dimmed");
      if (animate && window.requestAnimationFrame) {
        requestAnimationFrame(function () {
          tip.classList.add("show");
        });
      } else {
        tip.classList.add("show");
      }
      sleepGame();
      if (window.__phonograph) window.__phonograph.start();
    } else {
      tip.classList.remove("show");
      if (window.__phonograph) window.__phonograph.stop();
      wakeGame();
      if (animate) {
        setTimeout(function () {
          game.classList.remove("dimmed");
        }, 420);
      } else {
        game.classList.remove("dimmed");
      }
      if (window.__phonograph) window.__phonograph.sync();
    }
  }

  function isPortrait() {
    try {
      if (window.matchMedia) {
        return window.matchMedia("(orientation: portrait)").matches;
      }
    } catch (e) {}
    return window.innerHeight > window.innerWidth;
  }

  function check(animate) {
    apply(isPortrait(), animate);
  }

  check(false);

  const onChange = function () {
    check(true);
  };
  window.addEventListener("orientationchange", onChange);
  window.addEventListener("resize", onChange);

  try {
    if (window.matchMedia) {
      const mql = window.matchMedia("(orientation: portrait)");
      if (mql.addEventListener) {
        mql.addEventListener("change", onChange);
      } else if (mql.addListener) {
        mql.addListener(onChange);
      }
    }
  } catch (e) {}
})();
