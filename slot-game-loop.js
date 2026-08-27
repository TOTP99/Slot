/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.update = function(_time, delta) {
          // 频谱可视化约 30fps，避免每帧 FFT + 改色
          this._eqAcc = (this._eqAcc || 0) + delta;
          if (this._eqAcc < 33) return;
          this._eqAcc = 0;
          this.updateEqVisualizer();
        };


        SlotGame.prototype.updatePlayModeButtons = function() {
          if (!this.orderPlayButton || !this.shufflePlayButton) return;
          this.setControlActive(
            this.orderPlayButton.bg,
            this.orderPlayButton.txt,
            !bgMusic.shuffle,
          );
          this.setControlActive(
            this.shufflePlayButton.bg,
            this.shufflePlayButton.txt,
            bgMusic.shuffle,
          );
        };


        SlotGame.prototype.updateSpeedButtons = function() {
          this.speedButtons.forEach(({ label, btn, txt }) => {
            this.setControlActive(btn, txt, label === this.mode);
          });
        };


        SlotGame.prototype.createKeyboardControls = function() {
          this.input.keyboard.on("keydown-SPACE", () => {
            this.sfx.click();
            this.handleSpinInput();
          });
        };


        SlotGame.prototype.createAmbientAnimations = function() {
          // 签名扫光动效已按需求移除。
          this.machineGlow.setAlpha(0.07);
          if (this.paylineTop) this.paylineTop.setAlpha(0.7);
          if (this.paylineMiddle) this.paylineMiddle.setAlpha(0.88);
          if (this.paylineBottom) this.paylineBottom.setAlpha(0.7);
        };

