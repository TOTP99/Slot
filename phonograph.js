/* ============================================================
 * 竖屏留声机 UI 控制器（含竖屏迷你老虎机）
 * 依赖：config.js（SYMBOLS/rollSpinResult/evaluateSpinResult）、
 * bg-music.js（bgMusic/BG_MUSIC_MAX），需在二者之后、orientation
 * 逻辑（见 app.js）之前加载。通过 window.__phonograph 暴露
 * start()/stop()/sync() 供 app.js 在横竖屏切换时调用。
 * ============================================================ */

      // ---------- 竖屏留声机（第一稿）----------
      (function setupPhonograph() {
        var vinyl = document.getElementById("ph-vinyl");
        var arm = document.getElementById("ph-arm");
        var horn = document.getElementById("ph-horn");
        var label = document.getElementById("ph-label");
        var playBtn = document.getElementById("ph-play");
        var pauseBtn = document.getElementById("ph-pause");
        var prevBtn = document.getElementById("ph-prev");
        var nextBtn = document.getElementById("ph-next");
        var orderChip = document.getElementById("ph-order");
        var shuffleChip = document.getElementById("ph-shuffle");
        var trackNum = document.getElementById("ph-track-num");
        var clockEl = document.getElementById("ph-clock");
        var clockFullEl = document.getElementById("ph-clock-full");
        var balanceEl = document.getElementById("ph-balance");
        var betEl = document.getElementById("ph-bet");
        var msgEl = document.getElementById("ph-msg");
        var spinBtn = document.getElementById("ph-spin");
        var spectrum = document.getElementById("ph-spectrum");
        var reelEls = [
          document.getElementById("ph-r0"),
          document.getElementById("ph-r1"),
          document.getElementById("ph-r2"),
        ];
        if (!vinyl || !playBtn || !pauseBtn) return;

        var miniSpinning = false;
        var phActive = false;
        var raf = 0;
        var vinylAngle = 0;
        var vinylVel = 0;
        var specSmooth = [0, 0, 0, 0, 0];
        // 波动线历史：把每一帧的音乐能量累积成“时间轴波形”，
        // 而不是用正弦波直接假造整条曲线。
        var specHistory = [];
        var specLastSampleAt = 0;
        var specLastEnergy = 0;
        var specPhase = 0;
        var lastPlaying = null;

        function pad2(n) {
          return (n < 10 ? "0" : "") + n;
        }

        function updateClock() {
          var d = new Date();
          if (clockEl) {
            clockEl.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
          }
          if (clockFullEl) {
            clockFullEl.textContent =
              pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
          }
        }

        function syncTrack() {
          if (trackNum) {
            trackNum.textContent =
              pad2(bgMusic.currentNum) + "/" + pad2(BG_MUSIC_MAX);
          }
          var trackTitle = document.getElementById("ph-track-title");
          if (trackTitle) {
            trackTitle.textContent =
              "第 " + pad2(bgMusic.currentNum) + " 首 · TP音乐";
          }
        }

        function syncPlayUi() {
          var playing = bgMusic.isPlaying();
          if (playBtn) playBtn.classList.toggle("on", playing);
          if (pauseBtn) pauseBtn.classList.toggle("on", !playing);
          if (vinyl) vinyl.classList.toggle("playing", playing);
          if (label) label.classList.toggle("playing", playing);
          if (horn) horn.classList.toggle("playing", playing);
          if (arm && playing !== lastPlaying) {
            arm.classList.toggle("down", playing);
            arm.classList.toggle("up", !playing);
            lastPlaying = playing;
          }
          syncTrack();
          if (orderChip) orderChip.classList.toggle("on", bgMusic.playMode === "order");
          if (shuffleChip) shuffleChip.classList.toggle("on", bgMusic.playMode === "shuffle");
        }

        function getScene() {
          return window.__slotGameScene || null;
        }

        // 与竖屏播放面板共用同一套 onTrackChange 通知机制：
        // 无论顺序/随机切歌，还是自动播完切下一首，这里的曲号显示都会同步刷新
        if (typeof bgMusic.onTrackChange === "function") {
          bgMusic.onTrackChange(syncTrack);
        }

        function syncWallet() {
          var sc = getScene();
          var bal = sc ? sc.balance : 1000;
          var bet = sc ? sc.bet : 50;
          try {
            var raw = localStorage.getItem("wanjin_slot_save");
            if (raw && !sc) {
              var s = JSON.parse(raw);
              if (typeof s.balance === "number") bal = s.balance;
              if (typeof s.bet === "number") bet = s.bet;
            }
          } catch (e) {}
          if (balanceEl) balanceEl.textContent = Number(bal).toFixed(0);
          if (betEl) betEl.textContent = "—$" + Number(bet).toFixed(0);
        }

        function setMsg(t) {
          if (msgEl) msgEl.textContent = t;
        }

        var SPEC_GRADIENT_RGB = [
          [255, 45, 149],
          [255, 140, 66],
          [255, 224, 102],
          [64, 224, 255],
          [61, 90, 255],
        ];
        // 预烘焙 64 级颜色，避免每帧 parseInt / 字符串拼接
        var SPEC_COLOR_LUT = (function () {
          var lut = new Array(64);
          var stops = SPEC_GRADIENT_RGB;
          var n = stops.length - 1;
          for (var i = 0; i < 64; i++) {
            var t = i / 63;
            var pos = t * n;
            var seg = pos | 0;
            if (seg >= n) seg = n - 1;
            var localT = pos - seg;
            var c1 = stops[seg];
            var c2 = stops[seg + 1];
            var r = (c1[0] + (c2[0] - c1[0]) * localT + 0.5) | 0;
            var g = (c1[1] + (c2[1] - c1[1]) * localT + 0.5) | 0;
            var b = (c1[2] + (c2[2] - c1[2]) * localT + 0.5) | 0;
            lut[i] = "rgb(" + r + "," + g + "," + b + ")";
          }
          return lut;
        })();
        function specColorAt(t) {
          if (t < 0) t = 0;
          if (t > 1) t = 1;
          return SPEC_COLOR_LUT[(t * 63 + 0.5) | 0];
        }

        function drawSpectrum() {
          if (!spectrum || !phActive) return;
          var ctx = spectrum.getContext("2d");
          if (!ctx) return;

          var w = spectrum.width;
          var h = spectrum.height;
          var mid = h / 2;
          ctx.clearRect(0, 0, w, h);

          // 分析器不必每帧都跑：约 30fps 采样足够驱动波浪
          var now = performance.now();
          if (!drawSpectrum._lastAnalAt) drawSpectrum._lastAnalAt = 0;
          if (now - drawSpectrum._lastAnalAt > 32) {
            bgMusic.sampleSpectrum();
            drawSpectrum._lastAnalAt = now;
          }

          var bands = bgMusic.bands || [0, 0, 0, 0, 0];
          var playing = bgMusic.isPlaying();

          for (var b = 0; b < 5; b++) {
            var target = playing ? bands[b] : 0;
            specSmooth[b] = specSmooth[b] * 0.82 + target * 0.18;
          }

          var energy = bgMusic.energy || 0;
          var bass = specSmooth[0] || 0;
          var body = specSmooth[1] || 0;
          var transient = Math.max(0, energy - specLastEnergy);

          if (!playing) {
            specHistory = [];
            specLastSampleAt = now;
            specLastEnergy = 0;
            specPhase = 0;
          } else {
            if (!specLastSampleAt) specLastSampleAt = now;
            var elapsed = now - specLastSampleAt;
            // 约 24fps 写入历史，降低数组与绘制压力
            var steps = Math.min(2, Math.floor(elapsed / 42));

            for (var s = 0; s < steps; s++) {
              var sampleEnergy = energy < 0 ? 0 : energy > 1 ? 1 : energy;
              var sampleBass = bass < 0 ? 0 : bass > 1 ? 1 : bass;
              var sampleBody = body < 0 ? 0 : body > 1 ? 1 : body;

              // 振幅动态范围拉大：让波峰波谷的强弱对比非常明显
              var amp = 14 + sampleEnergy * 56 + sampleBass * 62 + transient * 88;

              // 频率刻意放低：同样宽度内波浪数量更少，避免像弹簧一样拥挤
              specPhase += 0.018 + sampleBass * 0.05 + sampleBody * 0.016;

              // 相位扭曲：前陡后缓，模拟被风推着走的海浪式不对称尖峰
              var skewed = specPhase + 0.32 * Math.sin(specPhase);
              // 三角波代替正弦：折角尖锐，而不是圆润的弧线
              var tri = (2 / Math.PI) * Math.asin(Math.sin(skewed));

              // 缓慢包络：大浪、小浪交替的呼吸感，让线条更飘逸
              var swell = 0.6 + 0.4 * Math.max(0, Math.sin(specPhase * 0.22 + 0.4));
              var punch = transient * 3.5 > 1 ? 1 : transient * 3.5;

              var sample = tri * amp * (swell + punch * 0.5);

              // 只做很轻的单次平滑：既不抖动，又保留三角波的尖锐折角
              if (specHistory.length > 0) {
                sample = sample * 0.82 + specHistory[specHistory.length - 1] * 0.18;
              }

              specHistory.push(sample);
              // 控制点数：手机上 96 点已够顺滑，显著减少 path 计算
              if (specHistory.length > 96) specHistory.shift();
            }

            if (steps > 0) specLastSampleAt += steps * 42;
            specLastEnergy = energy;
          }

          var points = specHistory.length;
          if (points < 2) {
            ctx.restore && ctx.restore();
            return;
          }

          var maxAbs = 1;
          for (var m = 0; m < points; m++) {
            var a = specHistory[m];
            if (a < 0) a = -a;
            if (a > maxAbs) maxAbs = a;
          }

          // 预计算坐标，避免重复三角函数与颜色解析
          if (!drawSpectrum._xs) {
            drawSpectrum._xs = new Float32Array(128);
            drawSpectrum._ys = new Float32Array(128);
          }
          var xs = drawSpectrum._xs;
          var ys = drawSpectrum._ys;
          var invMax = 1 / maxAbs;
          var invN = 1 / (points - 1);

          for (var i = 0; i < points; i++) {
            var t = i * invN;
            // 从右往左推进
            xs[i] = (1 - t) * w;
            var normalized = specHistory[i] * invMax;
            var y = mid + normalized * (h * 0.55);
            // 软压缩
            var dy = (y - mid) / (h * 0.52);
            // 近似 tanh，避免每点调用 Math.tanh
            var dy2 = dy * dy;
            y = mid + (dy * (h * 0.52)) / (1 + dy2 * 0.35);
            ys[i] = y;
          }

          ctx.save();
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.globalAlpha = playing ? 0.95 : 0.28;
          // 细虚线：- - - 非连续
          ctx.lineWidth = playing ? 1.6 : 1.2;
          ctx.setLineDash([7, 6]);
          ctx.shadowBlur = 0;

          // 彩虹细虚线：分 5 色带，每带一次 stroke
          var bandsN = 5;
          var seg = Math.max(1, (points / bandsN) | 0);
          for (var k = 0; k < bandsN; k++) {
            var i0 = k * seg;
            var i1 = k === bandsN - 1 ? points - 1 : (k + 1) * seg;
            if (i1 <= i0) continue;
            var tMid = (i0 + i1) * 0.5 * invN;
            ctx.beginPath();
            ctx.moveTo(xs[i0], ys[i0]);
            for (var i = i0 + 1; i <= i1; i++) ctx.lineTo(xs[i], ys[i]);
            ctx.strokeStyle = specColorAt(tMid);
            ctx.stroke();
          }

          ctx.setLineDash([]);
          ctx.restore();
        }

        function tickVinyl() {
          if (!vinyl) return;
          var playing = bgMusic.isPlaying();
          var energy = bgMusic.energy || 0;
          // 目标角速度：基础转盘速 + 随能量微加速
          var targetVel = playing ? 1.8 + energy * 1.2 : 0;
          vinylVel += (targetVel - vinylVel) * (playing ? 0.06 : 0.08);
          if (Math.abs(vinylVel) < 0.002) vinylVel = 0;
          vinylAngle = (vinylAngle + vinylVel) % 360;
          vinyl.style.transform = "rotate(" + vinylAngle.toFixed(2) + "deg)";
        }

        function loop() {
          if (!phActive) return;
          // 页面不可见时停掉 rAF，省电省性能；回来后再由 visibility 唤醒
          if (document.hidden) {
            raf = 0;
            return;
          }
          tickVinyl();
          drawSpectrum();
          syncPlayUi();
          raf = requestAnimationFrame(loop);
        }

        function startPh() {
          phActive = true;
          updateClock();
          syncWallet();
          syncPlayUi();
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          if (!document.hidden) {
            raf = requestAnimationFrame(loop);
          }
        }

        function stopPh() {
          phActive = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        }

        // 从后台回到前台：若竖屏留声机仍激活则恢复动画
        if (!window.__phVisibilityBound) {
          window.__phVisibilityBound = true;
          document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
              if (raf) cancelAnimationFrame(raf);
              raf = 0;
            } else if (phActive && !raf) {
              raf = requestAnimationFrame(loop);
            }
          });
        }

        playBtn.addEventListener("click", function () {
          bgMusic.play();
          setTimeout(syncPlayUi, 80);
        });
        pauseBtn.addEventListener("click", function () {
          bgMusic.pause();
          setTimeout(syncPlayUi, 80);
        });
        prevBtn.addEventListener("click", function () {
          bgMusic.skipPrev();
          bumpArmOnSeek();
        });
        function bumpArmOnSeek() {
          if (!arm) return;
          arm.classList.add("up");
          arm.classList.remove("down");
          lastPlaying = null;
          setTimeout(function () {
            syncPlayUi();
          }, 420);
        }
        nextBtn.addEventListener("click", function () {
          bgMusic.skipNext();
          bumpArmOnSeek();
        });
        if (orderChip) {
          orderChip.addEventListener("click", function () {
            bgMusic.setPlayMode("order");
            syncPlayUi();
          });
        }
        if (shuffleChip) {
          shuffleChip.addEventListener("click", function () {
            bgMusic.setPlayMode("shuffle");
            syncPlayUi();
          });
        }

        // 迷你三格：与横屏共用余额存档、共用符号表(SYMBOLS)和判定逻辑(rollSpinResult /
        // evaluateSpinResult)，不再各自维护一份容易脱节的赔率表
        var DEFAULT_BASE_JACKPOT = 25000;
        var DEFAULT_JACKPOT = 25800;

        function randSym() {
          return SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
        }

        function setReel(el, sym) {
          if (!el) return;
          el.innerHTML = "<span>" + sym.label + "</span>";
        }

        spinBtn.addEventListener("click", function () {
          if (miniSpinning) return;
          var sc = getScene();
          // 按下不再触发音效：竖屏场景下用户多在听歌，SPIN 音效会打断播放体验
          var bet = sc ? sc.bet : 50;
          var bal = sc ? sc.balance : 1000;
          var jackpotValue = sc ? sc.jackpotValue : DEFAULT_JACKPOT;
          try {
            if (!sc) {
              var raw = localStorage.getItem("wanjin_slot_save");
              if (raw) {
                var s = JSON.parse(raw);
                if (typeof s.balance === "number") bal = s.balance;
                if (typeof s.bet === "number") bet = s.bet;
                if (typeof s.jackpotValue === "number") jackpotValue = s.jackpotValue;
              }
            }
          } catch (e) {}
          if (bal < bet) {
            setMsg("—");
            return;
          }
          miniSpinning = true;
          spinBtn.disabled = true;
          bal -= bet;
          // 与横屏一致：每转一次，JACKPOT 池累积当前下注的 5%
          jackpotValue += Math.max(1, Math.round(bet * 0.05));
          if (sc) {
            sc.balance = bal;
            sc.jackpotValue = jackpotValue;
            if (sc.updateDisplay) sc.updateDisplay();
            else if (sc.saveGameState) sc.saveGameState();
          } else {
            try {
              var payload = JSON.stringify({
                balance: bal,
                bet: bet,
                jackpotValue: jackpotValue,
              });
              localStorage.setItem("wanjin_slot_save", payload);
            } catch (e) {}
          }
          syncWallet();
          setMsg("");

          // 起转时就按概率表一次性决定这一把的结果，动画只是把它"演"出来
          var finalResult = rollSpinResult();
          var a = finalResult[0];
          var b = finalResult[1];
          var c = finalResult[2];

          var ticks = 0;
          var timer = setInterval(function () {
            setReel(reelEls[0], randSym());
            setReel(reelEls[1], randSym());
            setReel(reelEls[2], randSym());
            ticks++;
            if (ticks > 12) {
              clearInterval(timer);
              setReel(reelEls[0], a);
              setReel(reelEls[1], b);
              setReel(reelEls[2], c);

              var evalResult = evaluateSpinResult(a, b, c, bet, jackpotValue);
              var win = evalResult.win;

              if (evalResult.type === "jackpot") {
                setMsg("💎 JACKPOT +" + win);
              } else if (evalResult.type === "three") {
                setMsg(a.label + a.label + a.label + " +" + win);
              } else if (evalResult.type === "pair") {
                setMsg("一对 +" + win);
              } else {
                setMsg("");
              }

              if (win > 0) {
                bal += win;
                if (evalResult.type === "jackpot") {
                  var base = sc && typeof sc.baseJackpotValue === "number"
                    ? sc.baseJackpotValue
                    : DEFAULT_BASE_JACKPOT;
                  // 与横屏一致：JACKPOT 基础值按当前下注比例缩放（以 bet=50 为基准单位）
                  jackpotValue =
                    Math.round(base * (bet / 50)) + 250 + Math.round(Math.random() * 1000);
                }
                if (sc) {
                  sc.balance = bal;
                  sc.jackpotValue = jackpotValue;
                  sc.lastWin = win;
                  if (sc.updateDisplay) sc.updateDisplay();
                  else if (sc.saveGameState) sc.saveGameState();
                } else {
                  try {
                    localStorage.setItem(
                      "wanjin_slot_save",
                      JSON.stringify({
                        balance: bal,
                        bet: bet,
                        jackpotValue: jackpotValue,
                      }),
                    );
                  } catch (e) {}
                }
              } else if (sc) {
                // 没中奖也要把本局新累积的 jackpotValue 写回去
                sc.jackpotValue = jackpotValue;
                if (sc.saveGameState) sc.saveGameState();
              } else {
                try {
                  localStorage.setItem(
                    "wanjin_slot_save",
                    JSON.stringify({ balance: bal, bet: bet, jackpotValue: jackpotValue }),
                  );
                } catch (e) {}
              }
              syncWallet();
              miniSpinning = false;
              spinBtn.disabled = false;
            }
          }, 70);
        });

        setInterval(updateClock, 1000);
        updateClock();
        syncWallet();
        syncPlayUi();

        window.__phonograph = {
          start: startPh,
          stop: stopPh,
          sync: function () {
            syncWallet();
            syncPlayUi();
          },
        };
      })();
