/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createCoinButton = function(cx, cy) {
          if (cx == null || cy == null) return;
          // 呼吸光晕（尺寸收紧以贴合赔率面板内的小方框）
          this.coinBtnGlow = this.add
            .circle(cx, cy, 19, 0xffd700, 0.22)
            .setDepth(11);

          this.tweens.add({
            targets: this.coinBtnGlow,
            scale: 1.2,
            alpha: 0.06,
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });

          // 金色圆环外框
          this.coinBtnRing = this.add
            .circle(cx, cy, 16, 0x2a1400)
            .setStrokeStyle(2, UI.goldDim)
            .setDepth(12);

          // 💰 图标：买入 / 提出统一入口（原 🏦 改为筹码袋 + 角标 +/−，功能与动画不变）
          this.coinBtnIcon = this.add
            .text(cx, cy, "💰", { fontSize: "18px" })
            .setOrigin(0.5)
            .setDepth(13);

          // 角标 +/−：提示可增减筹码，纯装饰，不单独接管点击
          this.coinBtnBadge = this.add
            .text(cx + 10, cy + 9, "+/−", {
              fontSize: "8px",
              fontStyle: "bold",
              color: "#ffd700",
              stroke: "#2a1400",
              strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(13);

          // 可点击热区（默认 topOnly，覆盖在赔率大面板之上，不影响外围点击）
          this.coinBtnHit = this.add
            .circle(cx, cy, 19, 0x000000, 0.01)
            .setInteractive({ useHandCursor: true })
            .setDepth(14);

          this.coinBtnHit.on("pointerover", () => {
            this.coinBtnRing.setStrokeStyle(2, 0xfff6b0);
          });
          this.coinBtnHit.on("pointerout", () => {
            this.coinBtnRing.setStrokeStyle(2, UI.goldDim);
          });
          // 资金动画统一以 💰 为汇聚 / 发散基准点
          this.cashIconX = cx;
          this.cashIconY = cy;
          this.cashIcon = this.coinBtnIcon;

          this.coinBtnHit.on("pointerdown", (pointer, lx, ly, event) => {
            event.stopPropagation();
            this.sfx.click();
            this.tweens.add({
              targets: [this.coinBtnRing, this.coinBtnIcon, this.coinBtnBadge],
              scale: 0.88,
              duration: 70,
              yoyo: true,
            });
            this.toggleCoinModal(true);
          });

          this.createCoinModal();
        };


        SlotGame.prototype.createCoinModal = function() {
          const cx = GAME_WIDTH / 2;
          const cy = GAME_HEIGHT / 2;

          this.coinModalGroup = this.add
            .container(0, 0)
            .setDepth(100)
            .setVisible(false);

          // 全屏遮罩，点击空白处关闭
          const overlay = this.add
            .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
            .setOrigin(0)
            .setInteractive();
          overlay.on("pointerdown", () => this.toggleCoinModal(false));

          // 弹窗面板
          const panel = this.add
            .rectangle(cx, cy, 300, 190, 0x1a0d02, 0.97)
            .setStrokeStyle(3, 0xffd700);

          const title = this.add
            .text(cx, cy - 70, "💰 资金操作", {
              fontSize: "20px",
              fontStyle: "bold",
              color: "#ffd700",
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5);

          // 买入按钮
          const buyBtn = this.add
            .rectangle(cx, cy - 15, 240, 46, 0x2f7d32)
            .setStrokeStyle(2, 0x9be89b)
            .setInteractive({ useHandCursor: true });
          const buyText = this.add
            .text(cx, cy - 15, "买入 +1000", {
              fontSize: "17px",
              fontStyle: "bold",
              color: "#ffffff",
            })
            .setOrigin(0.5);

          // 提出按钮
          const cashBtn = this.add
            .rectangle(cx, cy + 45, 240, 46, 0x8b0000)
            .setStrokeStyle(2, 0xffb3b3)
            .setInteractive({ useHandCursor: true });
          const cashText = this.add
            .text(cx, cy + 45, "提出 -1000", {
              fontSize: "17px",
              fontStyle: "bold",
              color: "#ffffff",
            })
            .setOrigin(0.5);

          buyBtn.on("pointerover", () => buyBtn.setFillStyle(0x3d9c40));
          buyBtn.on("pointerout", () => buyBtn.setFillStyle(0x2f7d32));
          buyBtn.on("pointerdown", () => {
            this.sfx.buttonPress();
            this.balance += 1000;
            this.updateDisplay();
            this.setMessage("买入成功 +1000");
            this.playCashFlyAnim("out");
            this.toggleCoinModal(false);
          });

          cashBtn.on("pointerover", () => cashBtn.setFillStyle(0xa80000));
          cashBtn.on("pointerout", () => cashBtn.setFillStyle(0x8b0000));
          cashBtn.on("pointerdown", () => {
            if (this.balance < 1000) {
              this.sfx.click();
              this.setMessage("余额不足，无法提出");
              return;
            }
            this.sfx.buttonPress();
            this.balance -= 1000;
            this.updateDisplay();
            this.setMessage("提出成功 -1000");
            this.playCashFlyAnim("in");
            this.toggleCoinModal(false);
          });

          const closeBtn = this.add
            .text(cx + 132, cy - 88, "✕", {
              fontSize: "18px",
              fontStyle: "bold",
              color: "#ffd700",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
          closeBtn.on("pointerdown", () => this.toggleCoinModal(false));

          this.coinModalGroup.add([
            overlay,
            panel,
            title,
            buyBtn,
            buyText,
            cashBtn,
            cashText,
            closeBtn,
          ]);
        };


        SlotGame.prototype.toggleCoinModal = function(show) {
          this.coinModalGroup.setVisible(show);
        };

