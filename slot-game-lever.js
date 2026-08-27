/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.pullLever = function(thenStart = true) {
          if (this.leverState === "down") return;

          this.leverState = "down";
          this.sfx.leverGrip();

          this.tweens.killTweensOf(this.leverHand);
          this.tweens.killTweensOf(this.leverContainer);

          // 从侧上方飞入并握住
          const midX = (this.handRestX + this.handGripX) / 2 + 8;
          const midY = (this.handRestY + this.handGripY) / 2 - 18;

          this.leverHand.setText("✋");
          this.leverHand.setAlpha(0);
          this.leverHand.setPosition(this.handRestX, this.handRestY);
          this.leverHand.setScale(0.85);
          this.leverHand.setAngle(-40);

          // 1) 淡入 + 弧线接近
          this.tweens.add({
            targets: this.leverHand,
            alpha: 1,
            scale: 1.05,
            duration: 90,
            ease: "Sine.easeOut",
          });

          this.tweens.add({
            targets: this.leverHand,
            x: midX,
            y: midY,
            angle: -18,
            duration: 120,
            ease: "Sine.easeOut",
            onComplete: () => {
              // 2) 落到手柄并握紧
              this.tweens.add({
                targets: this.leverHand,
                x: this.handGripX,
                y: this.handGripY,
                angle: -4,
                scale: 0.96,
                duration: 110,
                ease: "Cubic.easeInOut",
                onComplete: () => {
                  this.leverHand.setText("✊");
                  this.sfx.leverPull();

                  // 3) 微抬蓄力后重压拉下
                  this.tweens.add({
                    targets: this.leverHand,
                    y: this.handGripY - 5,
                    scale: 0.94,
                    duration: 50,
                    ease: "Sine.easeOut",
                    onComplete: () => {
                      this.tweens.add({
                        targets: this.leverHand,
                        x: this.handGripX + 14,
                        y: this.handGripY + 72,
                        angle: 32,
                        scale: 0.88,
                        duration: 260,
                        ease: "Cubic.easeIn",
                        onComplete: () => {
                          this.tweens.add({
                            targets: this.leverHand,
                            y: this.handGripY + 68,
                            scale: 0.92,
                            duration: 90,
                            ease: "Sine.easeOut",
                          });
                        },
                      });
                    },
                  });

                  this.tweens.add({
                    targets: this.leverContainer,
                    angle: -22,
                    duration: 50,
                    ease: "Sine.easeOut",
                    onComplete: () => {
                      this.tweens.add({
                        targets: this.leverContainer,
                        angle: 55,
                        duration: 260,
                        ease: "Cubic.easeIn",
                        onComplete: () => {
                          this.cameras.main.shake(110, 0.008);

                          this.tweens.add({
                            targets: this.leverContainer,
                            angle: 48,
                            duration: 90,
                            yoyo: true,
                            ease: "Sine.easeOut",
                          });

                          if (thenStart) {
                            this.startSpin();
                          }
                        },
                      });
                    },
                  });
                },
              });
            },
          });
        };


        SlotGame.prototype.resetLever = function() {
          this.leverState = "up";
          this.sfx.leverReset();

          this.tweens.killTweensOf(this.leverHand);
          this.tweens.killTweensOf(this.leverContainer);

          // 松手：张开 → 滑开淡出
          this.leverHand.setText("✋");

          this.tweens.add({
            targets: this.leverHand,
            scale: 1.05,
            angle: 8,
            duration: 100,
            ease: "Sine.easeOut",
            onComplete: () => {
              this.tweens.add({
                targets: this.leverHand,
                alpha: 0,
                x: this.handRestX,
                y: this.handRestY - 10,
                angle: -30,
                scale: 0.9,
                duration: 320,
                ease: "Cubic.easeInOut",
                onComplete: () => {
                  if (this.leverHand) {
                    this.leverHand.setText("✋");
                    this.leverHand.setScale(1);
                  }
                },
              });
            },
          });

          this.tweens.add({
            targets: this.leverContainer,
            angle: -18,
            duration: 420,
            ease: "Back.easeOut",
          });

          this.leverHandle.setFillStyle(LEVER_HANDLE_IDLE_FILL);
          this.leverHandle.setStrokeStyle(2, 0xffd700);
        };

