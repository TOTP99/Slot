/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.updateDisplay = function() {
          fitTextToBox(
            this.balanceValue,
            this.formatInt(this.balance),
            LAYOUT.balanceW - 35,
            21,
            13,
          );

          if (this.betValue) {
            fitTextToBox(
              this.betValue,
              this.formatInt(this.bet),
              78,
              15,
              10,
            );
          }
          if (this.sideBetValue) {
            this.sideBetValue.setText(this.formatInt(this.bet));
          }
          if (this.modalBetValue) {
            this.modalBetValue.setText(this.formatInt(this.bet));
          }

          fitTextToBox(
            this.lastWinValue,
            this.formatInt(this.lastWin),
            LAYOUT.lastWinW - 35,
            21,
            13,
          );

          fitTextToBox(
            this.jackpotText,
            `💎 JACKPOT ${this.formatMoney(this.jackpotValue)}`,
            320,
            21,
            14,
          );

          this.saveGameState();
        };


        SlotGame.prototype.changeBet = function(amount) {
          if (this.isSpinning) return;

          this.sfx.click();

          this.bet = Math.round(
            Phaser.Math.Clamp(
              this.bet + amount,
              this.minBet,
              this.maxBet,
            ),
          );

          if (this.betValue) {
            fitTextToBox(
              this.betValue,
              this.formatInt(this.bet),
              78,
              15,
              10,
            );
            this.tweens.killTweensOf(this.betValue);
            this.betValue.setScale(1);
            this.tweens.add({
              targets: this.betValue,
              scale: 1.18,
              duration: 120,
              yoyo: true,
            });
          }
          if (this.sideBetValue) {
            this.sideBetValue.setText(this.formatInt(this.bet));
          }
          if (this.modalBetValue) {
            this.modalBetValue.setText(this.formatInt(this.bet));
          }
          this.saveGameState();
        };


        SlotGame.prototype.setBetButtonsEnabled = function(enabled) {
          if (!this.betMinus || !this.betPlus) return;

          const alpha = enabled ? 1 : 0.45;

          this.betMinus.disableInteractive();
          this.betPlus.disableInteractive();

          if (enabled) {
            this.betMinus.setInteractive({
              useHandCursor: true,
              hitArea: new Phaser.Geom.Rectangle(-20, -19, 40, 38),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            });
            this.betPlus.setInteractive({
              useHandCursor: true,
              hitArea: new Phaser.Geom.Rectangle(-20, -19, 40, 38),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            });
          }

          [this.betMinus, this.betPlus].forEach((item) => item.setAlpha(alpha));
        };

