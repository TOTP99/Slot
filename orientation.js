      // 横竖屏切换：竖屏留声机 / 横屏老虎机
      (function setupOrientationTransition() {
        var tip = document.getElementById("rotate-tip");
        var game = document.getElementById("game");
        if (!tip || !game) return;

        var lastPortrait = null;

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

        var onChange = function () {
          check(true);
        };
        window.addEventListener("orientationchange", onChange);
        window.addEventListener("resize", onChange);

        try {
          if (window.matchMedia) {
            var mql = window.matchMedia("(orientation: portrait)");
            if (mql.addEventListener) {
              mql.addEventListener("change", onChange);
            } else if (mql.addListener) {
              mql.addListener(onChange);
            }
          }
        } catch (e) {}
      })();
