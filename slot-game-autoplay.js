/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.toggleAutoPlay = function() {
          this.autoPlay = !this.autoPlay;

          if (this.autoPlay) {
            this.autoPlayRounds = 0;
            this.updateAutoOptionButtons();
            this.setMessage(`自动模式已开启（${this.maxAutoPlayRounds}次）`);

            if (!this.isSpinning) {
              this.time.delayedCall(350, () => {
                if (this.autoPlay && !this.isSpinning) {
                  this.startSpin();
                }
              });
            }
          } else {
            this.updateAutoButtonOff();
            this.setMessage("自动模式已关闭");
          }
        };


        SlotGame.prototype.updateAutoButtonOff = function() {
          this.updateAutoOptionButtons();
        };


        SlotGame.prototype.handleSpinInput = function() {
          if (this.inputLocked) return;

          this.inputLocked = true;
          this.time.delayedCall(280, () => {
            this.inputLocked = false;
          });

          if (this.isSpinning) {
            this.requestStop();
            return;
          }

          // 拉杆正在下落动画中，忽略重复点击
          if (this.leverState === "down") return;

          this.pullLever(true);
        };


        SlotGame.prototype.requestStop = function() {
          if (!this.isSpinning || this.stopRequested) return;

          this.stopRequested = true;
          this.setMessage("STOPPING...");

          this.reels.forEach((reel, index) => {
            if (!reel.stopped && !reel.forceStopScheduled) {
              reel.forceStopScheduled = true;
              this.time.delayedCall(index * 140, () =>
                this.stopReel(reel, index),
              );
            }
          });
        };

