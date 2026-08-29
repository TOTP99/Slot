      // ---------- 启动 ----------
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
      // 之前这里还有一个 fitGameCanvas()，在 resize/orientationchange 时把
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
