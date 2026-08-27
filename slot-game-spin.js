/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.startSpin = function() {
          if (this.isSpinning) return;

          if (this.balance < this.bet) {
            this.setMessage("余额不足，无法开始！");
            this.sfx.lose();
            this.autoPlay = false;
            this.updateAutoButtonOff();
            this.resetLever();
            return;
          }

          // 自动模式等非手动拉杆路径：若拉杆未下，补一段简短甩下动画
          if (this.leverState !== "down") {
            this.leverState = "down";
            this.sfx.leverPull();
            this.leverHand.setText("✊");
            this.leverHand.setAlpha(1);
            this.leverHand.setPosition(this.handGripX, this.handGripY);
            this.tweens.add({
              targets: this.leverContainer,
              angle: 48,
              duration: 200,
              ease: "Cubic.easeIn",
            });
            this.tweens.add({
              targets: this.leverHand,
              y: this.handGripY + 70,
              x: this.handGripX + 12,
              angle: 28,
              scale: 0.9,
              duration: 200,
            });
          }

          this.reels.forEach((reel) => {
            if (reel.intervalEvent) {
              reel.intervalEvent.remove(false);
              reel.intervalEvent = null;
            }

            reel.stopped = true;
            reel.forceStopScheduled = false;
            reel.container.y = LAYOUT.reelY;
          });

          this.isSpinning = true;
          this.stopRequested = false;
          this.stoppedReelsCount = 0;
          this.setBetButtonsEnabled(false);

          // 这一把三个轮子最终该停在什么符号，在起转时就一次性按概率表决定好，
          // 之后每个轮子各自停止时（stopReel -> getControlledResult）只是取用，
          // 不再各自独立随机——这样才能让"对子/三连/JACKPOT"的概率真正可控
          this.pendingSpinResult = rollSpinResult();

          this.animateBalanceDecrease(this.bet);

          this.jackpotValue += Math.max(1, Math.round(this.bet * 0.05));
          this.updateDisplay();

          if (this.autoPlay) {
            this.autoPlayRounds++;
            this.setMessage(
              `AUTO SPIN ${this.autoPlayRounds}/${this.maxAutoPlayRounds}`,
              18,
            );
          } else {
            const modeLabel = this.mode === "FAST" ? "FAST" : "NORMAL";
            this.setMessage(`${modeLabel} SPIN • SPACE TO STOP`, 17);
          }

          this.reels.forEach((reel, index) => {
            this.startReelSpin(reel, index);
          });

          this.cameras.main.shake(90, 0.002);
        };


        SlotGame.prototype.animateBalanceDecrease = function(amount) {
          const startBalance = this.balance;
          const endBalance = this.balance - amount;

          this.balance = endBalance;

          this.tweens.addCounter({
            from: startBalance,
            to: endBalance,
            duration: 320,
            ease: "Cubic.easeOut",
            onUpdate: (tween) => {
              fitTextToBox(
                this.balanceValue,
                this.formatInt(tween.getValue()),
                LAYOUT.balanceW - 35,
                21,
                13,
              );
            },
            onComplete: () => this.updateDisplay(),
          });

          this.tweens.add({
            targets: this.balanceValue,
            scale: 1.1,
            duration: 140,
            yoyo: true,
          });
        };


        SlotGame.prototype.startReelSpin = function(reel, index) {
          const settings = this.speedSettings[this.mode];

          if (reel.intervalEvent) {
            reel.intervalEvent.remove(false);
            reel.intervalEvent = null;
          }

          reel.stopped = false;
          reel.forceStopScheduled = false;

          reel.frame.setStrokeStyle(3, UI.goldBright);

          const stopDelay = settings.duration + index * 320;
          const decelWindow = 260; // 停止前的减速窗口（毫秒），让转轮"滑行进站"而不是硬停
          const spinStartTime = this.time.now;

          reel.intervalEvent = this.time.addEvent({
            delay: settings.interval,
            loop: true,
            callback: () => {
              this.sfx.spinTick();

              // 越接近停止时刻，滚动步长越小，形成自然减速的滑行手感
              const remaining = stopDelay - (this.time.now - spinStartTime);
              const decelRatio =
                remaining < decelWindow
                  ? Math.max(0.25, remaining / decelWindow)
                  : 1;
              const step = settings.step * decelRatio;

              reel.items.forEach((item) => {
                item.txt.y += step;
                item.bg.y += step;

                if (item.txt.y > 128) {
                  const symbol = Phaser.Utils.Array.GetRandom(SYMBOLS);

                  item.symbol = symbol;
                  item.txt.y = -128;
                  item.bg.y = -128;
                  item.txt.setText(symbol.label);
                  item.txt.setColor(symbol.color);
                  item.txt.setFontSize(symbol.label.length > 1 ? 42 : 52);
                }
              });
            },
          });

          this.time.delayedCall(stopDelay, () => {
            // stopReel 内部已对 reel.stopped 做了守卫，急停场景下重复调用是安全的
            this.stopReel(reel, index);
          });
        };


        SlotGame.prototype.stopReel = function(reel, index) {
          if (reel.stopped) return;

          reel.stopped = true;

          if (reel.intervalEvent) {
            reel.intervalEvent.remove(false);
            reel.intervalEvent = null;
          }

          const finalSymbol = this.getControlledResult(index);
          reel.value = finalSymbol;

          reel.items.forEach((item, i) => {
            const randomSymbol = Phaser.Utils.Array.GetRandom(SYMBOLS);

            item.symbol = randomSymbol;
            item.txt.y = (i - 2) * 64;
            item.bg.y = (i - 2) * 64;
            item.txt.setText(randomSymbol.label);
            item.txt.setColor(randomSymbol.color);
            item.txt.setFontSize(randomSymbol.label.length > 1 ? 42 : 52);

            // 非中奖行的符号淡入落位，避免"瞬间贴图切换"的生硬感
            if (i !== 2) {
              item.txt.setAlpha(0.35);
              this.tweens.add({
                targets: item.txt,
                alpha: 1,
                duration: 150,
                ease: "Sine.easeOut",
              });
            }
          });

          const center = reel.items[2];

          center.symbol = finalSymbol;
          center.txt.setText(finalSymbol.label);
          center.txt.setColor(finalSymbol.color);
          center.txt.setFontSize(finalSymbol.label.length > 1 ? 42 : 52);
          center.txt.y = 0;
          center.bg.y = 0;

          this.sfx.reelStop();

          this.tweens.add({
            targets: reel.container,
            y: LAYOUT.reelY + 7,
            duration: 120,
            ease: "Sine.easeOut",
            yoyo: true,
          });

          this.tweens.add({
            targets: center.txt,
            scale: 1.15,
            duration: 140,
            yoyo: true,
          });

          reel.frame.setStrokeStyle(2, UI.goldDim);

          this.stoppedReelsCount++;

          if (this.stoppedReelsCount >= this.reels.length) {
            this.time.delayedCall(300, () => {
              this.isSpinning = false;
              this.setBetButtonsEnabled(true);
              this.resetLever();
              this.checkWin();
            });
          }
        };


        SlotGame.prototype.getControlledResult = function(index) {
          if (this.pendingSpinResult && this.pendingSpinResult[index]) {
            return this.pendingSpinResult[index];
          }
          // 兜底：理论上不会走到这里（除非 startSpin 未正常执行）
          return Phaser.Utils.Array.GetRandom(SYMBOLS);
        };

