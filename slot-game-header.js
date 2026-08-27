/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createHeader = function() {
          // 标题句子已移除；奖池条上移填补空出的头部空间。
          // 取消边框与背景，原背景处改为随机闪烁的星光效果。
          this.createJackpotSparkle(480, LAYOUT.jackpotY, 350, 38);

          this.jackpotText = this.add
            .text(
              480,
              LAYOUT.jackpotY,
              `💎 JACKPOT ${this.formatMoney(this.jackpotValue)}`,
              {
                fontSize: "25px",
                fontStyle: "bold",
                fontFamily: 'Arial, sans-serif',
                color: "#f0d58a",
                stroke: "#090b0b",
                strokeThickness: 1,
                shadow: { offsetX: 0, offsetY: 1, color: "#9b7a3e", blur: 6, fill: true },
              },
            )
            .setOrigin(0.5);

        };


        SlotGame.prototype.createJackpotSparkle = function(cx, cy, w, h) {
          const count = 16;
          this.jackpotStars = [];
          for (let i = 0; i < count; i++) {
            const sx = cx - w / 2 + Phaser.Math.Between(8, w - 8);
            const sy = cy - h / 2 + Phaser.Math.Between(4, h - 4);
            const points = Phaser.Math.RND.pick([4, 4, 5]);
            const outerR = Phaser.Math.Between(3, 6);
            const star = this.add
              .star(sx, sy, points, Math.max(1, outerR - 3), outerR, 0xfff3c4, 0.9)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(0);
            this.jackpotStars.push(star);
            this.twinkleStar(star);
          }
        };


        SlotGame.prototype.twinkleStar = function(star) {
          const delay = Phaser.Math.Between(0, 2200);
          const duration = Phaser.Math.Between(650, 1500);
          this.time.delayedCall(delay, () => {
            if (!star.active) return;
            this.tweens.add({
              targets: star,
              alpha: { from: 0.9, to: Phaser.Math.FloatBetween(0.1, 0.3) },
              scale: { from: 1, to: Phaser.Math.FloatBetween(0.5, 1.6) },
              duration,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          });
        };


        SlotGame.prototype.updateLiveClock = function() {
          if (!this.rightClockText) return;
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          this.rightClockText.setText(`${hh}:${mm}`);

          // 每个整 15 分钟响一次：00 / 15 / 30 / 45
          const quarterKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${Math.floor(now.getMinutes() / 15)}`;
          if (
            now.getSeconds() === 0 &&
            now.getMilliseconds() < 1000 &&
            this.lastQuarterKey !== quarterKey
          ) {
            this.lastQuarterKey = quarterKey;
            this.sfx.quarterBell();
          }

          // 顺带保持播放/暂停图标与实际播放状态同步（复用此定时器，不额外新开一个）
          this.refreshPlayPauseIcon();
        };

