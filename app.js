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
        window.__slotGameScene.clockTimer = null;
      }
    } catch (e) {}
  });
})();

// ---------- 横竖屏切换：竖屏留声机 / 横屏老虎机 ----------
(function setupOrientationTransition() {
  const tip = document.getElementById("rotate-tip");
  const gameEl = document.getElementById("game");
  if (!tip || !gameEl) return;

  let lastPortrait = null;
  let switching = false; // 防止 sleep/wake 过程中被二次切入
  let debounceTimer = 0;

  // 竖屏时老虎机画布被留声机盖住看不见，但如果不主动暂停，Phaser 的渲染/
  // 更新循环（含多个 repeat:-1 的呼吸动画）会继续在后台全速跑，
  // 和留声机自己的 requestAnimationFrame 循环叠在一起。手机上长时间
  // 来回切横竖屏，双重循环很容易把主线程/GPU 顶到卡死。
  // 策略：竖屏彻底挂起 Phaser 主循环 + 停掉场景外 setInterval；
  //       横屏先停留声机 rAF，再唤醒 Phaser。同一时刻只跑一套循环。

  function getScene() {
    return window.__slotGameScene || null;
  }

  function getGame() {
    return window.__slotGame || null;
  }

  /** 停掉场景里不随 game.loop.sleep 自动停的定时器（时钟 250ms） */
  function pauseSceneTimers() {
    try {
      const sc = getScene();
      if (sc && sc.clockTimer) {
        clearInterval(sc.clockTimer);
        sc.clockTimer = null;
      }
    } catch (e) {}
  }

  /** 横屏恢复后重新挂上时钟定时器 */
  function resumeSceneTimers() {
    try {
      const sc = getScene();
      if (!sc) return;
      if (sc.clockTimer) return;
      if (typeof sc.updateLiveClock === "function") {
        sc.updateLiveClock();
        sc.clockTimer = setInterval(function () {
          try {
            sc.updateLiveClock();
          } catch (e) {}
        }, 250);
      }
    } catch (e) {}
  }

  function sleepGame() {
    const g = getGame();
    if (!g) return;
    try {
      // 先挂起主循环（停止 rAF / step）
      if (g.loop && !g.loop.sleeping) {
        g.loop.sleep();
      }
    } catch (e) {}
    try {
      // Phaser 3.60+：整局 pause，进一步切断输入与部分内部调度
      if (typeof g.pause === "function" && !g.isPaused) {
        g.pause();
      }
    } catch (e) {}
    try {
      // 场景 sleep：不 update / 不 render，但保留对象，方便回来 wake
      if (g.scene && typeof g.scene.sleep === "function") {
        const scenes = g.scene.getScenes(true);
        for (let i = 0; i < scenes.length; i++) {
          const key = scenes[i].sys && scenes[i].sys.settings && scenes[i].sys.settings.key;
          if (key) g.scene.sleep(key);
        }
      }
    } catch (e) {}
    pauseSceneTimers();
  }

  function wakeGame() {
    const g = getGame();
    if (!g) return;
    try {
      if (typeof g.resume === "function" && g.isPaused) {
        g.resume();
      }
    } catch (e) {}
    try {
      if (g.scene && typeof g.scene.wake === "function") {
        const scenes = g.scene.getScenes(false);
        for (let i = 0; i < scenes.length; i++) {
          const sys = scenes[i].sys;
          if (!sys) continue;
          const sleeping =
            (typeof sys.isSleeping === "function" && sys.isSleeping()) ||
            (sys.settings && sys.settings.active === false && sys.settings.visible === false);
          if (sleeping && sys.settings && sys.settings.key) {
            g.scene.wake(sys.settings.key);
          }
        }
        // 兜底：本项目只有 SlotGame 一个场景
        try {
          g.scene.wake("SlotGame");
        } catch (e2) {}
      }
    } catch (e) {}
    try {
      if (g.loop && g.loop.sleeping) {
        g.loop.wake();
      }
    } catch (e) {}
    resumeSceneTimers();
    // 方向稳定后再让 Scale 对齐一次，避免旋转过程中半截尺寸卡住
    try {
      if (g.scale && typeof g.scale.refresh === "function") {
        g.scale.refresh();
      }
    } catch (e) {}
  }

  function apply(portrait, animate) {
    if (portrait === lastPortrait) return;
    if (switching) return;
    switching = true;
    lastPortrait = portrait;

    try {
      if (portrait) {
        // 竖屏：先挂起 Phaser（含定时器），再开留声机 —— 保证不会双循环
        gameEl.classList.add("dimmed");
        sleepGame();
        if (animate && window.requestAnimationFrame) {
          requestAnimationFrame(function () {
            tip.classList.add("show");
          });
        } else {
          tip.classList.add("show");
        }
        if (window.__phonograph) window.__phonograph.start();
      } else {
        // 横屏：先停留声机 rAF，再唤醒 Phaser
        tip.classList.remove("show");
        if (window.__phonograph) window.__phonograph.stop();
        wakeGame();
        if (animate) {
          setTimeout(function () {
            gameEl.classList.remove("dimmed");
          }, 420);
        } else {
          gameEl.classList.remove("dimmed");
        }
        if (window.__phonograph) window.__phonograph.sync();
      }
    } finally {
      // 短延迟后再允许下一次切换，吞掉 orientation + resize + matchMedia 连发
      setTimeout(function () {
        switching = false;
      }, 200);
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

  /** 合并 orientationchange / resize / matchMedia 的连发，只在方向真正稳定后处理一次 */
  function scheduleCheck(animate) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = 0;
      check(!!animate);
    }, 120);
  }

  check(false);

  const onChange = function () {
    scheduleCheck(true);
  };

  // 只挂必要监听：matchMedia 是方向权威来源；resize 作兜底但走 debounce
  // orientationchange 在部分机型上比 matchMedia 更早/更晚，同样 debounce 合并
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
