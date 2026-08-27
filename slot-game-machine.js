/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createMachine = function() {
          // 外层柔光
          this.machineGlow = this.add.rectangle(
            LAYOUT.machineX,
            LAYOUT.machineY,
            LAYOUT.machineOuterW + 14,
            LAYOUT.machineOuterH + 10,
            UI.gold,
            0.1,
          );

          // 厚重金边机壳
          const outerShell = this.add
            .rectangle(
              LAYOUT.machineX,
              LAYOUT.machineY,
              LAYOUT.machineOuterW + 6,
              LAYOUT.machineOuterH + 6,
              UI.goldDim,
              0.7,
            )
            .setStrokeStyle(2, UI.gold);

          const darkShell = this.add
            .rectangle(
              LAYOUT.machineX,
              LAYOUT.machineY,
              LAYOUT.machineOuterW,
              LAYOUT.machineOuterH,
              0x101714,
            )
            .setStrokeStyle(3, UI.goldDim);

          const innerPanel = this.add
            .rectangle(
              LAYOUT.machineX,
              LAYOUT.machineY,
              LAYOUT.machineInnerW,
              LAYOUT.machineInnerH,
              UI.panelDeep,
            )
            .setStrokeStyle(2, UI.goldDim);

          // 深色转轮窗：去掉粉红/酒红描边，保持传统赌场深色窗框
          const reelWindow = this.add
            .rectangle(LAYOUT.machineX, LAYOUT.machineY, 452, 170, 0x0a0a0c)
            .setStrokeStyle(2, UI.goldDim);

          // 传统三线：中间粗、上下细，对齐符号行距(64px)，压在卷轴容器之上，
          // 半透明穿过图标背景，符号仍清晰可见——这才是传统老虎机支付线的样子。
          this.paylineTop = this.add
            .rectangle(
              LAYOUT.machineX,
              LAYOUT.machineY - 64,
              448,
              2,
              UI.goldDim,
              0.7,
            )
            .setDepth(5);

          this.paylineMiddle = this.add
            .rectangle(
              LAYOUT.machineX,
              LAYOUT.machineY,
              448,
              5,
              UI.gold,
              0.88,
            )
            .setDepth(5);

          this.paylineBottom = this.add
            .rectangle(
              LAYOUT.machineX,
              LAYOUT.machineY + 64,
              448,
              2,
              UI.goldDim,
              0.7,
            )
            .setDepth(5);

          const lineLabelLeft = this.add
            .text(226, LAYOUT.machineY, "三线", {
              fontSize: "14px",
              fontStyle: "bold",
              color: UI.cream,
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5);

          const lineLabelRight = this.add
            .text(714, LAYOUT.machineY, "三线", {
              fontSize: "14px",
              fontStyle: "bold",
              color: UI.cream,
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5);

          // 老虎机机身整体收进放大分组：长按 JACKPOT 触发彩蛋时随分组一起放大 115%
          this.machineScaleGroup.add([
            this.machineGlow,
            outerShell,
            darkShell,
            innerPanel,
            reelWindow,
            this.paylineTop,
            this.paylineMiddle,
            this.paylineBottom,
            lineLabelLeft,
            lineLabelRight,
          ]);
        };


        SlotGame.prototype.createReels = function() {
          LAYOUT.reelXs.forEach((x, reelIndex) => {
            const frame = this.add
              .rectangle(
                x,
                LAYOUT.reelY,
                LAYOUT.reelFrameW,
                LAYOUT.reelFrameH,
                0x090b0b,
                1,
              )
              .setStrokeStyle(2, UI.goldDim)
              .setDepth(2);

            const maskShape = this.add.graphics();
            maskShape.fillStyle(0xffffff);
            maskShape.fillRect(
              x - LAYOUT.reelFrameW / 2 + 5,
              LAYOUT.reelY - LAYOUT.reelFrameH / 2 + 4,
              LAYOUT.reelFrameW - 10,
              LAYOUT.reelFrameH - 8,
            );

            const mask = maskShape.createGeometryMask();
            maskShape.setVisible(false);

            const container = this.add.container(x, LAYOUT.reelY).setDepth(3);
            container.setMask(mask);

            // 边框、遮罩图形、符号容器三者要保持同一父级变换，放大/隐藏时遮罩才不会错位
            this.machineScaleGroup.add([frame, maskShape, container]);

            const items = [];

            for (let i = -2; i <= 2; i++) {
              const symbol = Phaser.Utils.Array.GetRandom(SYMBOLS);

              const bg = this.add.circle(0, i * 64, 30, 0x000000, 1);

              const txt = this.add
                .text(0, i * 64, symbol.label, {
                  fontSize: symbol.label.length > 1 ? "42px" : "52px",
                  fontStyle: "bold",
                  color: symbol.color,
                  stroke: "#090b0b",
                  strokeThickness: 2,
                  shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 3, fill: true },
                })
                .setOrigin(0.5);

              container.add([bg, txt]);
              items.push({ bg, txt, symbol });
            }

            this.reels.push({
              frame,
              container,
              items,
              value: SYMBOLS[reelIndex],
              intervalEvent: null,
              stopped: true,
              forceStopScheduled: false,
            });
          });
        };

