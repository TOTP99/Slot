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

      function fitGameCanvas() {
        var canvas = document.querySelector("#game canvas");
        if (!canvas) return;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }

      window.addEventListener("beforeunload", function () {
        try {
          if (window.__slotGameScene && window.__slotGameScene.clockTimer) {
            clearInterval(window.__slotGameScene.clockTimer);
          }
        } catch (e) {}
      });

      window.addEventListener("resize", function () {
        setTimeout(fitGameCanvas, 50);
      });
      window.addEventListener("orientationchange", function () {
        setTimeout(fitGameCanvas, 120);
      });
