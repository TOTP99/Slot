/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createSettingsModal = function() {
          const cx = GAME_WIDTH / 2;
          const cy = GAME_HEIGHT / 2;
          const panelW = 560;
          const panelH = 370;
          const top = cy - panelH / 2;

          this.settingsModalGroup = this.add
            .container(0, 0)
            .setDepth(100)
            .setVisible(false);

          const children = [];

          const overlay = this.add
            .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
            .setOrigin(0)
            .setInteractive();
          overlay.on("pointerdown", () => this.toggleSettingsModal(false));
          children.push(overlay);

          // 外层微光
          children.push(
            this.add
              .rectangle(cx, cy, panelW + 9, panelH + 9, UI.gold, 0.08)
              .setStrokeStyle(1, UI.goldDim),
          );

          const panel = this.add
            .rectangle(cx, cy, panelW, panelH, 0x0e0a06, 0.98)
            .setStrokeStyle(2, UI.gold)
            .setInteractive();
          panel.on("pointerdown", (pointer, lx, ly, event) => {
            event.stopPropagation();
          });
          children.push(panel);

          const pad = 21;
          const leftX = cx - panelW / 2 + pad;
          const rightX = cx + panelW / 2 - pad;
          const dividerX = cx - 28;

          // 左：赔率表（无列标题，直接从顶部留白后开始）；图标放大 125%，行距相应放宽
          const payRows = [
            ["7️⃣7️⃣7️⃣", "×50"],
            ["🌸🌸🌸", "×20"],
            ["🌺🌺🌺", "×15"],
            ["🍇🍇🍇", "×10"],
            ["🍓🍓🍓", "×8"],
            ["🍒🍒🍒", "×6"],
            ["🍄🍄🍄", "×4"],
            ["任意一对", "×2"],
          ];
          const payStart = top + 28;
          const paySpacing = 46;
          payRows.forEach((row, i) => {
            const ry = payStart + i * paySpacing;
            children.push(
              this.add
                .text(leftX + 7, ry, row[0], {
                  fontSize: "18px",
                  color: "#e8dcc0",
                })
                .setOrigin(0, 0.5),
            );
            children.push(
              this.add
                .text(dividerX - 12, ry, row[1], {
                  fontSize: "14px",
                  fontStyle: "bold",
                  color: "#ffd700",
                })
                .setOrigin(1, 0.5),
            );
          });

          children.push(
            this.add
              .rectangle(dividerX, cy, 1, panelH - 40, UI.gold, 0.22)
              .setOrigin(0.5),
          );

          // 右：设置（无列标题）
          const makeOptionButton = (bx, by, label) => {
            const bg = this.add
              .rectangle(bx, by, 58, 28, 0x1a140c, 0.95)
              .setStrokeStyle(1, UI.goldDim)
              .setInteractive({ useHandCursor: true });
            const txt = this.add
              .text(bx, by, label, {
                fontSize: "13px",
                color: "#e8dcc0",
              })
              .setOrigin(0.5);
            children.push(bg, txt);
            return { bg, txt };
          };

          // 通用：给一个文字/图标叠加一个更大的隐形热区，扩大点击范围，
          // 并统一处理悬停放大反馈 + 按下音效，避免每处再各自重复实现。
          const addHitZone = (visual, bx, by, w, h, sound, onDown) => {
            const hit = this.add
              .rectangle(bx, by, w, h, 0x000000, 0.001)
              .setInteractive({ useHandCursor: true });
            hit.on("pointerover", () => visual.setScale(1.15));
            hit.on("pointerout", () => visual.setScale(1));
            hit.on("pointerdown", (p, lx, ly, e) => {
              if (e) e.stopPropagation();
              if (sound) sound();
              onDown();
            });
            children.push(hit);
            return hit;
          };

          const rowLabelX = dividerX + 16;
          const optAX = cx + 66;
          const optBX = cx + 146;
          const boxCenterX = cx + 106;

          let rowY = payStart;
          children.push(
            this.add
              .text(rowLabelX, rowY, "速度", {
                fontSize: "14px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const normalOpt = makeOptionButton(optAX, rowY, "正常");
          const fastOpt = makeOptionButton(optBX, rowY, "加速");
          this.speedButtons = [
            { label: "NORMAL", btn: normalOpt.bg, txt: normalOpt.txt },
            { label: "FAST", btn: fastOpt.bg, txt: fastOpt.txt },
          ];
          normalOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            this.mode = "NORMAL";
            this.sfx.click();
            this.updateSpeedButtons();
            this.saveGameState();
          });
          fastOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            this.mode = "FAST";
            this.sfx.click();
            this.updateSpeedButtons();
            this.saveGameState();
          });
          this.updateSpeedButtons();

          rowY += 60;
          children.push(
            this.add
              .text(rowLabelX, rowY, "自动", {
                fontSize: "14px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const autoYesOpt = makeOptionButton(optAX, rowY, "是");
          const autoNoOpt = makeOptionButton(optBX, rowY, "否");
          this.autoYesButton = autoYesOpt;
          this.autoNoButton = autoNoOpt;
          autoYesOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (!this.autoPlay) {
              this.sfx.click();
              this.toggleAutoPlay();
            }
          });
          autoNoOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (this.autoPlay) {
              this.sfx.click();
              this.toggleAutoPlay();
            }
          });
          this.updateAutoOptionButtons();

          rowY += 60;
          children.push(
            this.add
              .text(rowLabelX, rowY, "音效", {
                fontSize: "14px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const soundOnOpt = makeOptionButton(optAX, rowY, "开启");
          const soundOffOpt = makeOptionButton(optBX, rowY, "关闭");
          this.soundOnButton = soundOnOpt;
          this.soundOffButton = soundOffOpt;
          soundOnOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (!this.sfx.enabled) {
              this.sfx.enabled = true;
              this.sfx.click();
              this.updateSoundOptionButtons();
              this.saveGameState();
            }
          });
          soundOffOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (this.sfx.enabled) {
              this.sfx.click();
              this.sfx.enabled = false;
              this.updateSoundOptionButtons();
              this.saveGameState();
            }
          });
          this.updateSoundOptionButtons();

          rowY += 60;
          children.push(
            this.add
              .rectangle(boxCenterX, rowY, rightX - dividerX - 10, 1, UI.gold, 0.22)
              .setOrigin(0.5),
          );

          // 投注：文字标签 / 数值框 / +− 按钮均放大 125%，并整体右移一点、加宽行距，避免与左侧标签、面板边缘拥挤
          rowY += 64;
          // BET 这一行（标签 + 长方形数值框 + −/+ 按钮）整体上移 6px，
          // 与下方 CHIPS 行留出更充裕的间距；后续行的 rowY 仍按原基准累加，不受影响。
          const betRowY = rowY - 6;
          children.push(
            this.add
              .text(rowLabelX, betRowY, "BET", {
                fontSize: "18px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const bigBoxCenterX = boxCenterX + 34;
          const betBoxX = bigBoxCenterX;
          children.push(
            this.add
              .rectangle(betBoxX, betRowY, 155, 38, 0x0a0806, 0.95)
              .setStrokeStyle(1, UI.goldDim),
          );
          const betMinus = this.add
            .text(betBoxX - 55, betRowY, "−", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          const betPlus = this.add
            .text(betBoxX + 55, betRowY, "+", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          this.modalBetValue = this.add
            .text(betBoxX, betRowY, this.formatInt(this.bet), {
              fontSize: "19px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          children.push(betMinus, betPlus, this.modalBetValue);
          // 命中范围放大到 44×44，明显比原本紧贴文字的热区更容易点中；按下有声效
          addHitZone(betMinus, betBoxX - 55, betRowY, 44, 44, () => this.sfx.click(), () => {
            this.changeBet(-this.betStep);
            if (this.modalBetValue)
              this.modalBetValue.setText(this.formatInt(this.bet));
          });
          addHitZone(betPlus, betBoxX + 55, betRowY, 44, 44, () => this.sfx.click(), () => {
            this.changeBet(this.betStep);
            if (this.modalBetValue)
              this.modalBetValue.setText(this.formatInt(this.bet));
          });

          // 筹码：与投注同比例放大 125%，行距加宽避免与投注框拥挤
          rowY += 58;
          children.push(
            this.add
              .text(rowLabelX, rowY, "CHIPS", {
                fontSize: "18px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          children.push(
            this.add
              .rectangle(betBoxX, rowY, 170, 38, 0x0a0806, 0.95)
              .setStrokeStyle(1, UI.goldDim),
          );
          const chipMinus = this.add
            .text(betBoxX - 64, rowY, "−", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          const chipPlus = this.add
            .text(betBoxX + 64, rowY, "+", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          children.push(
            this.add
              .text(betBoxX, rowY, "1000", {
                fontSize: "19px",
                color: "#ffd700",
                fontStyle: "bold",
              })
              .setOrigin(0.5),
          );
          children.push(chipMinus, chipPlus);
          // 同样放大到 44×44 的命中范围；金币音效已有，予以保留
          addHitZone(chipPlus, betBoxX + 64, rowY, 44, 44, null, () => {
            this.sfx.coinChime("out");
            this.balance = Math.round(this.balance + 1000);
            this.updateDisplay();
            this.setMessage("CHIPS +1000");
          });
          addHitZone(chipMinus, betBoxX - 64, rowY, 44, 44, null, () => {
            if (this.balance < 1000) {
              this.setMessage("INSUFFICIENT CHIPS");
              this.sfx.lose();
              return;
            }
            this.sfx.coinChime("in");
            this.balance = Math.round(this.balance - 1000);
            this.updateDisplay();
            this.setMessage("CHIPS -1000");
          });

          this.musicOnButton = null;
          this.musicOffButton = null;
          this.orderPlayButton = null;
          this.shufflePlayButton = null;

          // 关闭按钮：放大至 200%，并相应调整位置与外层微光留出的边距保持协调
          const closeX = cx + panelW / 2 - 28;
          const closeY = top + 24;
          const closeBtn = this.add
            .text(closeX, closeY, "✕", {
              fontSize: "32px",
              fontStyle: "bold",
              color: "#ffd700",
            })
            .setOrigin(0.5);
          children.push(closeBtn);
          // x 的命中范围同样放大到 44×44，比原来紧贴字形的热区更容易点中
          addHitZone(closeBtn, closeX, closeY, 44, 44, () => this.sfx.click(), () => {
            this.toggleSettingsModal(false);
          });

          this.settingsModalGroup.add(children);
        };


        SlotGame.prototype.toggleSettingsModal = function(show) {
          if (show && this.modalBetValue) {
            this.modalBetValue.setText(this.formatInt(this.bet));
          }
          this.settingsModalGroup.setVisible(show);
        };


        SlotGame.prototype.updateAutoOptionButtons = function() {
          if (!this.autoYesButton || !this.autoNoButton) return;
          this.setControlActive(
            this.autoYesButton.bg,
            this.autoYesButton.txt,
            this.autoPlay,
          );
          this.setControlActive(
            this.autoNoButton.bg,
            this.autoNoButton.txt,
            !this.autoPlay,
          );
        };


        SlotGame.prototype.updateSoundOptionButtons = function() {
          if (!this.soundOnButton || !this.soundOffButton) return;
          this.setControlActive(
            this.soundOnButton.bg,
            this.soundOnButton.txt,
            this.sfx.enabled,
          );
          this.setControlActive(
            this.soundOffButton.bg,
            this.soundOffButton.txt,
            !this.sfx.enabled,
          );
        };


        SlotGame.prototype.updateMusicOptionButtons = function() {
          if (!this.musicOnButton || !this.musicOffButton) return;
          this.setControlActive(
            this.musicOnButton.bg,
            this.musicOnButton.txt,
            bgMusic.enabled,
          );
          this.setControlActive(
            this.musicOffButton.bg,
            this.musicOffButton.txt,
            !bgMusic.enabled,
          );
        };


        SlotGame.prototype.setEqVisualizerActive = function(active) {
          if (!this.eqBars) return;
          this.eqActive = !!active;
          this.eqGlowAlpha = active ? 0.08 : 0.02;

          this.eqBars.forEach((bar) => {
            if (active) {
              bar.setAlpha(0.9);
            } else {
              this.tweens.add({
                targets: bar,
                scaleY: 0.1,
                alpha: 0.25,
                duration: 220,
                ease: "Sine.easeOut",
              });
            }
          });
        };


        SlotGame.prototype.updateEqVisualizer = function() {
          if (!this.eqBars || !this.eqGlow) return;
          if (this.eqPageHidden) return;

          const bands = bgMusic.sampleSpectrum();
          const playing = this.eqActive && bgMusic.isPlaying();

          for (let i = 0; i < 5; i++) {
            // 喷泉效果：基础增益更猛，并叠加随机跳花，让静音频段也有细碎跃动
            const spark = playing ? Math.random() * 0.22 : 0;
            const raw = bands[i] * 1.9 + spark;
            const level = playing
              ? raw > 1.35
                ? 1.35
                : raw < 0.1
                  ? 0.1
                  : raw
              : 0.1;
            const cur = this.eqBars[i].scaleY;
            // 喷涌：冲高时几乎瞬发（像水柱猛地冲出），回落时缓慢飘落（像水滴落下）
            const rising = level > cur;
            const next = rising
              ? cur * 0.12 + level * 0.88
              : cur * 0.86 + level * 0.14;
            this.eqBars[i].scaleY = next;
            this.eqBars[i].setAlpha(playing ? 0.6 + Math.min(0.4, next * 0.35) : 0.25);
          }

          // 光晕：能量变化够大或播放状态切换才重算颜色
          const e = bgMusic.energy;
          if (
            playing === this._eqLastPlaying &&
            Math.abs(e - (this._eqLastEnergy || 0)) < 0.05
          ) {
            // 仅微调透明度
            if (playing) {
              this.eqGlow.setAlpha(
                Math.min(0.35, (this.eqGlowAlpha || 0.08) * (0.6 + e * 1.2)),
              );
            }
            return;
          }
          this._eqLastPlaying = playing;
          this._eqLastEnergy = e;

          const b = bgMusic.brightness > 1.3 ? 1.3 : bgMusic.brightness < 0 ? 0 : bgMusic.brightness;
          const v =
            bgMusic.vocalBias > 0.6
              ? 0.6
              : bgMusic.vocalBias < -0.6
                ? -0.6
                : bgMusic.vocalBias;

          let c1, c2;
          if (!playing) {
            c1 = 0x3a2a10;
            c2 = 0x1a1208;
          } else if (v > 0.12) {
            c1 = 0xff4da6;
            c2 = 0x40e0ff;
          } else if (v < -0.12) {
            c1 = 0xff8c42;
            c2 = 0xffd700;
          } else if (b > 0.85) {
            c1 = 0x40e0ff;
            c2 = 0xffe566;
          } else {
            c1 = 0xc9a227;
            c2 = 0xffd700;
          }

          const mix = 0.35 + e * 0.5 + b * 0.15;
          const t = mix < 0 ? 0 : mix > 1 ? 1 : mix;
          const col = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(c1),
            Phaser.Display.Color.ValueToColor(c2),
            100,
            (t * 100) | 0,
          );
          const alpha = playing
            ? (this.eqGlowAlpha || 0.08) * (0.6 + e * 1.2)
            : 0.02;
          this.eqGlow.setFillStyle(
            Phaser.Display.Color.GetColor(col.r, col.g, col.b),
            alpha > 0.35 ? 0.35 : alpha,
          );
        };

