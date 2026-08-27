/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.checkWin = function() {
          const [a, b, c] = this.reels.map((reel) => {
            const center = reel.items[2];
            return center.symbol || reel.value;
          });

          const result = evaluateSpinResult(a, b, c, this.bet, this.jackpotValue);

          if (result.type === "jackpot") {
            this.balance += result.win;
            this.lastWin = result.win;
            this.updateDisplay();

            this.setMessage(`JACKPOT! +${this.formatMoney(result.win)}`, 18);
            this.playJackpot();
            this.scheduleAutoPlay();
            return;
          }

          if (result.type === "three") {
            this.balance += result.win;
            this.lastWin = result.win;
            this.updateDisplay();

            this.setMessage(
              `${a.label}${a.label}${a.label} WIN +${this.formatMoney(result.win)}`,
              18,
            );
            this.playBigWin();
            this.scheduleAutoPlay();
            return;
          }

          if (result.type === "pair") {
            this.balance += result.win;
            this.lastWin = result.win;
            this.updateDisplay();

            this.setMessage(
              `PAIR ${result.symbol.label}${result.symbol.label} +${this.formatMoney(result.win)}`,
              18,
            );
            this.playSmallWin();
            this.scheduleAutoPlay();
            return;
          }

          this.updateDisplay();
          this.setMessage("NO WIN — TRY AGAIN");
          this.sfx.lose();
          this.scheduleAutoPlay();
        };


        SlotGame.prototype.scheduleAutoPlay = function() {
          if (!this.autoPlay) return;

          if (
            this.autoPlayRounds >= this.maxAutoPlayRounds ||
            this.balance < this.bet
          ) {
            this.autoPlay = false;
            this.updateAutoButtonOff();
            this.setMessage("自动模式已结束");
            return;
          }

          this.time.delayedCall(850, () => {
            if (this.autoPlay && !this.isSpinning) {
              this.startSpin();
            }
          });
        };


        SlotGame.prototype.flashLines = function() {
          [this.paylineTop, this.paylineMiddle, this.paylineBottom].forEach(
            (line) => {
              this.tweens.add({
                targets: line,
                alpha: 1,
                scaleX: 1.07,
                duration: 120,
                yoyo: true,
                repeat: 6,
              });
            },
          );
        };


        SlotGame.prototype.playSmallWin = function() {
          this.sfx.smallWin();
          this.flashLines();

          this.reels.forEach((reel) => {
            this.tweens.add({
              targets: reel.container,
              scale: 1.06,
              duration: 140,
              yoyo: true,
              repeat: 2,
            });
          });
        };


        SlotGame.prototype.playBigWin = function() {
          this.sfx.bigWin();
          this.cameras.main.flash(350, 255, 215, 0);
          this.cameras.main.shake(450, 0.009);
          this.flashLines();

          this.reels.forEach((reel) => {
            reel.frame.setStrokeStyle(6, 0x00ff99);

            this.tweens.add({
              targets: reel.container,
              scale: 1.12,
              duration: 150,
              yoyo: true,
              repeat: 4,
            });
          });

          this.showWinText("BIG WIN!", "#00ff99");
          this.coinExplosion(45);

          this.time.delayedCall(1000, () => {
            this.reels.forEach((reel) =>
              reel.frame.setStrokeStyle(4, 0xffd700),
            );
          });
        };


        SlotGame.prototype.playJackpot = function() {
          this.sfx.jackpot();
          this.cameras.main.flash(600, 255, 215, 0);
          this.cameras.main.shake(900, 0.018);
          this.flashLines();

          this.tweens.add({
            targets: this.jackpotText,
            scale: 1.12,
            duration: 180,
            yoyo: true,
            repeat: 7,
          });

          if (this.jackpotStars && this.jackpotStars.length) {
            this.jackpotStars.forEach((star) => {
              this.tweens.add({
                targets: star,
                scale: Phaser.Math.FloatBetween(1.8, 2.6),
                alpha: 1,
                duration: 150,
                yoyo: true,
                repeat: 7,
              });
            });
          }

          this.showWinText("JACKPOT!", "#ffd700");
          this.coinExplosion(90);
          this.fireworksBurst(70);

          // JACKPOT 基础值按当前下注比例缩放（以 bet=50 为基准单位），
          // 横竖屏统一，避免同一把游戏两种模式下奖池落点不一致
          this.jackpotValue =
            Math.round(this.baseJackpotValue * (this.bet / 50)) +
            Phaser.Math.Between(250, 1250);
          this.updateDisplay();
        };


        SlotGame.prototype.fireworksBurst = function(amount) {
          const colors = ["#ffd700", "#ff6b6b", "#4ecdc4", "#ffe66d", "#ff9ff3", "#54a0ff", "#ffffff"];
          const batch = 12;
          const batches = Math.ceil(amount / batch);
          for (let b = 0; b < batches; b++) {
            this.time.delayedCall(b * 55, () => {
              const count = Math.min(batch, amount - b * batch);
              const ox = Phaser.Math.Between(380, 560);
              const oy = Phaser.Math.Between(160, 240);
              for (let i = 0; i < count; i++) {
                const col = colors[i % colors.length];
                const p = this.add
                  .text(ox, oy, "✦", {
                    fontSize: `${Phaser.Math.Between(14, 26)}px`,
                    color: col,
                  })
                  .setOrigin(0.5)
                  .setDepth(60);
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const dist = Phaser.Math.Between(80, 220);
                this.tweens.add({
                  targets: p,
                  x: ox + Math.cos(angle) * dist,
                  y: oy + Math.sin(angle) * dist * 0.7 - Phaser.Math.Between(40, 120),
                  alpha: 0,
                  scale: Phaser.Math.FloatBetween(0.4, 1.4),
                  angle: Phaser.Math.Between(-180, 180),
                  duration: Phaser.Math.Between(700, 1300),
                  ease: "Cubic.easeOut",
                  onComplete: () => p.destroy(),
                });
              }
            });
          }
        };


        SlotGame.prototype.showWinText = function(text, color) {
          const winText = this.add
            .text(470, 145, text, {
              fontSize: "60px",
              fontStyle: "bold",
              color,
              stroke: "#000000",
              strokeThickness: 9,
              shadow: {
                offsetX: 0,
                offsetY: 0,
                color,
                blur: 16,
                fill: true,
              },
            })
            .setOrigin(0.5);

          this.tweens.add({
            targets: winText,
            scale: 1.24,
            alpha: 0,
            duration: 1800,
            ease: "Cubic.easeOut",
            onComplete: () => winText.destroy(),
          });
        };


        SlotGame.prototype.coinExplosion = function(amount) {
          const batchSize = 15;
          const batches = Math.ceil(amount / batchSize);

          for (let batch = 0; batch < batches; batch++) {
            this.time.delayedCall(batch * 40, () => {
              const count = Math.min(batchSize, amount - batch * batchSize);

              for (let i = 0; i < count; i++) {
                const coin = this.add
                  .text(
                    Phaser.Math.Between(350, 590),
                    Phaser.Math.Between(200, 310),
                    "●",
                    {
                      fontSize: `${Phaser.Math.Between(18, 30)}px`,
                      color: "#ffd700",
                      stroke: "#7a3b00",
                      strokeThickness: 1,
                    },
                  )
                  .setOrigin(0.5);

                this.tweens.add({
                  targets: coin,
                  x: coin.x + Phaser.Math.Between(-300, 300),
                  y: coin.y - Phaser.Math.Between(90, 240),
                  alpha: 0,
                  scale: 1.8,
                  angle: Phaser.Math.Between(-360, 360),
                  duration: Phaser.Math.Between(800, 1400),
                  ease: "Cubic.easeOut",
                  onComplete: () => coin.destroy(),
                });
              }
            });
          }
        };

