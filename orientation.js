      // 横竖屏切换：竖屏留声机 / 横屏老虎机
      (function setupOrientationTransition() {
        var tip = document.getElementById("rotate-tip");
        var game = document.getElementById("game");
        if (!tip || !game) return;

        var lastPortrait = null;

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
            if (window.__phonograph) window.__phonograph.start();
          } else {
            tip.classList.remove("show");
            if (window.__phonograph) window.__phonograph.stop();
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
