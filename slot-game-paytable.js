/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createPaytableButton = function() {
          const x = LAYOUT.paytableX;
          const y = LAYOUT.paytableY;
          const w = LAYOUT.paytableW;
          const h = LAYOUT.paytableH;

          this.createPanel(x, y, w, h, 0x0c0a08, 0.96, this.focusHideGroup);

          this.updateLiveClock();
          this.clockTimer = setInterval(() => this.updateLiveClock(), 250);

          // 麦克风（放大 218%，位置下移 8px，与面板顶部保持足够间距，确保完整露出、不被遮挡）
          const micY = y - h / 2 + 84 + 8;
          const micIcon = this.add
            .text(x, micY, "🎷", { fontSize: "98px" })
            .setOrigin(0.5);
          this.focusHideGroup.push(micIcon);

          // 播放控制：⏮️ ⏸️/▶️ ⏭️ —— 中间键为播放/暂停切换（按当前播放状态动态显示图标）
          const tY = micY + 104;
          const gap = 54;

          const prevBtn = this.add
            .text(x - gap, tY, "⏮️", { fontSize: "34px" })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
          prevBtn.on("pointerdown", () => {
            this.sfx.click();
            bgMusic.skipPrev();
            this.saveGameState();
          });
          prevBtn.on("pointerover", () => prevBtn.setScale(1.1));
          prevBtn.on("pointerout", () => prevBtn.setScale(1));
          this.focusHideGroup.push(prevBtn);

          this.sidePlayPauseBtn = this.add
            .text(x, tY, bgMusic.isPlaying() ? "⏸️" : "▶️", { fontSize: "34px" })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
          this.sidePlayPauseBtn.on("pointerdown", () => {
            this.sfx.click();
            if (bgMusic.isPlaying()) {
              bgMusic.pause();
            } else {
              bgMusic.play();
            }
            this.refreshPlayPauseIcon();
            this.saveGameState();
          });
          this.sidePlayPauseBtn.on("pointerover", () =>
            this.sidePlayPauseBtn.setScale(1.1),
          );
          this.sidePlayPauseBtn.on("pointerout", () =>
            this.sidePlayPauseBtn.setScale(1),
          );
          this.focusHideGroup.push(this.sidePlayPauseBtn);

          const nextBtn = this.add
            .text(x + gap, tY, "⏭️", { fontSize: "34px" })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
          nextBtn.on("pointerdown", () => {
            this.sfx.click();
            bgMusic.skipNext();
            this.saveGameState();
          });
          nextBtn.on("pointerover", () => nextBtn.setScale(1.1));
          nextBtn.on("pointerout", () => nextBtn.setScale(1));
          this.focusHideGroup.push(nextBtn);

          // 曲号（放大 120%：13px → 16px）
          const trackY = tY + 42;
          this.sideTrackLabel = this.add
            .text(x, trackY, "01 / 56", {
              fontSize: "16px",
              fontStyle: "bold",
              color: "#ffd700",
            })
            .setOrigin(0.5);
          this.refreshTrackLabel();
          this.focusHideGroup.push(this.sideTrackLabel);

          // 无论顺序切歌、随机切歌，还是曲目播完自动切下一首，曲号都会同步刷新，
          // 修复了此前"随机播放时曲号显示错误（停留在旧编号）"的问题
          bgMusic.onTrackChange(() => this.refreshTrackLabel());

          // 底部一体金框按键（沿用原金框尺寸/位置逻辑）→ 打开赔率*设置弹窗
          const ctrlY = trackY + 45;
          const frameW = w - 28;
          const frameH = 40;
          const frame = this.add
            .rectangle(x, ctrlY, frameW, frameH, 0x120a04, 0.92)
            .setStrokeStyle(1, UI.gold)
            .setInteractive({ useHandCursor: true });
          const ctrlLabel = this.add
            .text(x, ctrlY, "赔率*设置", {
              fontSize: "24px",
              fontStyle: "bold",
              color: "#ffd700",
            })
            .setOrigin(0.5);
          const openCtrl = () => {
            this.sfx.click();
            this.toggleSettingsModal(true);
          };
          frame.on("pointerdown", openCtrl);
          frame.on("pointerover", () => {
            frame.setStrokeStyle(2, 0xffd700);
            ctrlLabel.setScale(1.06);
          });
          frame.on("pointerout", () => {
            frame.setStrokeStyle(1, UI.gold);
            ctrlLabel.setScale(1);
          });
          ctrlLabel.setInteractive({ useHandCursor: true });
          ctrlLabel.on("pointerdown", openCtrl);
          this.focusHideGroup.push(frame, ctrlLabel);

          // 兼容
          this.eqBars = null;
          this.eqGlow = null;
          this.eqActive = false;
          this.eqPageHidden = false;
          this._eqAcc = 0;
          this.sideBetValue = null;
          this.musicPanelGroup = null;
          this.musicModeBtns = null;
        };


        SlotGame.prototype.refreshTrackLabel = function() {
          if (!this.sideTrackLabel) return;
          const n = bgMusic.currentNum || 1;
          this.sideTrackLabel.setText(
            String(n).padStart(2, "0") +
              " / " +
              String(BG_MUSIC_MAX).padStart(2, "0"),
          );
        };


        SlotGame.prototype.refreshPlayPauseIcon = function() {
          if (!this.sidePlayPauseBtn) return;
          this.sidePlayPauseBtn.setText(bgMusic.isPlaying() ? "⏸️" : "▶️");
        };


        SlotGame.prototype.updateMusicModeButtons = function() {
          if (!this.musicModeBtns) return;
          const order = this.musicModeBtns.order;
          const shuffle = this.musicModeBtns.shuffle;
          if (order) {
            const on = bgMusic.playMode === "order";
            order.setAlpha(on ? 1 : 0.55);
            order.setScale(on ? 1.12 : 1);
          }
          if (shuffle) {
            const on = bgMusic.playMode === "shuffle";
            shuffle.setAlpha(on ? 1 : 0.55);
            shuffle.setScale(on ? 1.12 : 1);
          }
        };


        SlotGame.prototype.toggleMusicPanel = function(show) {};

