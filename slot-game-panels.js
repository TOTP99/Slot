/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createBottomPanels = function() {
          // ========== 四分播报屏：余额 / 播报 / 播报 / 上次获胜 ==========
          const totalW = LAYOUT.messageW;
          const gap = 3;
          const cellW = (totalW - gap * 3) / 4;
          const startX = LAYOUT.messageX - totalW / 2 + cellW / 2;
          const xs = [0, 1, 2, 3].map((i) => startX + i * (cellW + gap));
          const makeDisplayCell = (x) =>
            this.createPanel(x, LAYOUT.messageY, cellW, LAYOUT.messageH, UI.panel, 0.94, null, this.machineScaleGroup);

          // 左（BALANCE）、右（LAST WIN）各自独立卡片；中间播报区合并为一整块，不再有分隔缝
          makeDisplayCell(xs[0]);
          makeDisplayCell(xs[3]);
          this.createPanel(
            (xs[1] + xs[2]) / 2,
            LAYOUT.messageY,
            cellW * 2 + gap,
            LAYOUT.messageH,
            UI.panel,
            0.94,
            null,
            this.machineScaleGroup,
          );

          const balanceLabel = this.add
            .text(xs[0], LAYOUT.messageY - 10, "BALANCE", {
              fontSize: "10px",
              fontStyle: "bold",
              color: UI.cream,
              letterSpacing: 1,
            })
            .setOrigin(0.5);
          this.balanceValue = this.add
            .text(xs[0], LAYOUT.messageY + 10, this.formatInt(this.balance), {
              fontSize: "17px",
              fontStyle: "bold",
              color: "#f4ead0",
            })
            .setOrigin(0.5);

          // 中间两格合并成一个视觉播报区，英文播报保持简洁。
          this.messageText = this.add
            .text((xs[1] + xs[2]) / 2, LAYOUT.messageY, "READY TO SPIN", {
              fontSize: "16px",
              fontStyle: "bold",
              color: "#e8dfc8",
              align: "center",
              wordWrap: { width: cellW * 2 + gap - 14 },
            })
            .setOrigin(0.5);

          const lastWinLabel = this.add
            .text(xs[3], LAYOUT.messageY - 10, "LAST WIN", {
              fontSize: "10px",
              fontStyle: "bold",
              color: UI.cream,
              letterSpacing: 1,
            })
            .setOrigin(0.5);
          this.lastWinValue = this.add
            .text(xs[3], LAYOUT.messageY + 10, this.formatInt(this.lastWin), {
              fontSize: "17px",
              fontStyle: "bold",
              color: "#f4ead0",
            })
            .setOrigin(0.5);

          // 长按 JACKPOT 时，老虎机机身 + 下方四分播报屏作为一个整体一起放大，
          // 因此这些元素收进 machineScaleGroup，而不是 focusHideGroup（不再隐藏）。
          this.machineScaleGroup.add([
            balanceLabel,
            this.balanceValue,
            this.messageText,
            lastWinLabel,
            this.lastWinValue,
          ]);

          // 兼容旧逻辑：投注值现在由控制弹窗中的 BET 行承载。
        };


        SlotGame.prototype.createLastWinPanel = function() {
          // 上次获胜已并入四分播报屏，由 createBottomPanels() 统一创建。
        };

