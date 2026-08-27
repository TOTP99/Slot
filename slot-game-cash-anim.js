/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.playCashFlyAnim = function(direction) {
          if (this.cashIconX === undefined) return;
          const cx = this.cashIconX;
          const cy = this.cashIconY;
          const coinCount = 9;

          this.sfx.coinChime(direction);

          for (let i = 0; i < coinCount; i++) {
            this.time.delayedCall(i * 90, () => {
              const angleDeg = Phaser.Math.Between(-160, -20);
              const angleRad = Phaser.Math.DegToRad(angleDeg);
              const dist = Phaser.Math.Between(45, 75);
              const dx = Math.cos(angleRad) * dist;
              const dy = Math.sin(angleRad) * dist;

              if (direction === "out") {
                const coin = this.add
                  .text(cx, cy, "🪙", { fontSize: "18px" })
                  .setOrigin(0.5)
                  .setDepth(12)
                  .setScale(0.7);

                this.tweens.add({
                  targets: coin,
                  x: cx + dx,
                  y: cy + dy,
                  scale: 1.1,
                  alpha: 0,
                  duration: 620,
                  ease: "Cubic.easeOut",
                  onComplete: () => coin.destroy(),
                });
              } else {
                const coin = this.add
                  .text(cx + dx, cy + dy, "🪙", { fontSize: "18px" })
                  .setOrigin(0.5)
                  .setDepth(12)
                  .setAlpha(0.9);

                this.tweens.add({
                  targets: coin,
                  x: cx,
                  y: cy,
                  scale: 0.3,
                  alpha: 0,
                  duration: 520,
                  ease: "Cubic.easeIn",
                  onComplete: () => coin.destroy(),
                });
              }
            });
          }

          // 💰 图标反馈脉冲
          this.tweens.add({
            targets: this.cashIcon,
            scale: 1.25,
            duration: 140,
            yoyo: true,
            ease: "Sine.easeOut",
          });
        };

