/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createRightControls = function() {
          const lx = LAYOUT.rightPanelX;
          const pivotY = 355;

          // 拉杆上方空地：时间显示 + 简/繁切换（原长按 JACKPOT 的彩蛋功能移到这里）
          this.createRightClockToggle(lx);

          // 拉杆：赌场风机械组件（金边底座 + 抛光金属杆 + 红宝石球头）
          // 槽体：暗金托板 + 深槽 + 双侧铆钉
          const plate = this.add
            .rectangle(lx, 318, 44, 128, 0x1a1408)
            .setStrokeStyle(2, 0xc9a227);
          const plateInner = this.add
            .rectangle(lx, 318, 36, 118, 0x0c0a06)
            .setStrokeStyle(1, 0x5c4818);
          const grooveOuter = this.add
            .rectangle(lx, 315, 18, 108, 0x2a2210)
            .setStrokeStyle(1, 0x8a7040);
          const grooveSlot = this.add
            .rectangle(lx, 315, 8, 100, 0x050403)
            .setStrokeStyle(1, 0x3a3010);
          const grooveHighlight = this.add
            .rectangle(lx + 5, 315, 2, 96, 0xffe8a0)
            .setAlpha(0.28);
          // 槽两侧装饰铆钉
          [[lx - 14, 270], [lx + 14, 270], [lx - 14, 360], [lx + 14, 360]].forEach(([rx, ry]) => {
            this.add.circle(rx, ry, 3.5, 0x3a3010).setStrokeStyle(1, 0xd4af37);
            this.add.circle(rx - 0.8, ry - 0.8, 1.2, 0xffe8a0, 0.45);
          });

          // 底部固定轴：多层金属环 + 中心螺钉感
          this.add.circle(lx, pivotY, 22, 0x2a2210).setStrokeStyle(2, 0x8a7040);
          this.add.circle(lx, pivotY, 17, 0x1a1a1a).setStrokeStyle(2, 0xffd700);
          this.add.circle(lx, pivotY, 11, 0x4a4a4a).setStrokeStyle(1, 0xc0c0c0);
          this.add.circle(lx, pivotY, 6, 0x222222).setStrokeStyle(1, 0xffd700);
          this.add.circle(lx - 1.5, pivotY - 1.5, 2, 0xffffff, 0.5);

          // 拉杆容器（绕底部轴旋转）——动画逻辑不变
          this.leverContainer = this.add.container(lx, pivotY);

          // 杆身阴影（偏右下，增强立体）
          const armShadow = this.add
            .rectangle(2.5, -46, 16, 100, 0x000000, 0.45)
            .setOrigin(0.5);

          // 杆身外金边
          const armRim = this.add
            .rectangle(0, -48, 14, 98, 0xc9a227)
            .setOrigin(0.5);

          // 杆身主金属
          const arm = this.add
            .rectangle(0, -48, 11, 94, 0x6e6e72)
            .setOrigin(0.5);

          // 杆身渐层高光 / 暗边
          const armShine = this.add
            .rectangle(-2.5, -48, 3.5, 88, 0xf5f5f7)
            .setOrigin(0.5)
            .setAlpha(0.55);
          const armEdge = this.add
            .rectangle(3.5, -48, 2.5, 90, 0x2a2a2e)
            .setOrigin(0.5)
            .setAlpha(0.65);

          // 杆身金色环箍（三道，更像真赌场拉杆）
          const collarYs = [-18, -48, -78];
          const collars = collarYs.map((cy) => {
            const outer = this.add
              .rectangle(0, cy, 18, 7, 0x8a7040)
              .setOrigin(0.5)
              .setStrokeStyle(1, 0xffd700);
            const inner = this.add
              .rectangle(0, cy, 16, 3, 0xffe566)
              .setOrigin(0.5)
              .setAlpha(0.55);
            return [outer, inner];
          });

          // 球头：外金环 → 深红金属 → 亮红芯 → 多层高光
          // （外金环的默认色也是 hover/离开热区时的"复位色"，务必和下方
          //  leverHit 的 pointerout 处理保持一致，避免第一次 hover 后颜色回不去）
          this.leverHandle = this.add
            .circle(0, -100, 26, LEVER_HANDLE_IDLE_FILL)
            .setStrokeStyle(2, 0xffd700);

          const handleGoldRing = this.add
            .circle(0, -100, 22, 0xb8860b)
            .setStrokeStyle(1.5, 0xffe566);

          const handleBody = this.add.circle(0, -100, 18, 0x6b0000);

          this.leverHandleInner = this.add.circle(0, -100, 12, 0xb00018);

          const handleCore = this.add.circle(0, -100, 6, 0xe01830);

          // 主高光（左上）
          const handleHighlight = this.add
            .circle(-7, -108, 7, 0xffffff, 0.75);
          // 次高光
          const handleHighlight2 = this.add
            .circle(6, -94, 3.5, 0xffe8a0, 0.4);
          // 底部反光
          const handleBounce = this.add
            .circle(2, -90, 5, 0xff6b6b, 0.22);

          // 球头底部与杆身衔接的小金颈
          const neck = this.add
            .rectangle(0, -84, 12, 10, 0xc9a227)
            .setOrigin(0.5);
          const neckInner = this.add
            .rectangle(0, -84, 8, 6, 0x5c4010)
            .setOrigin(0.5);

          const leverParts = [
            armShadow,
            armRim,
            arm,
            armShine,
            armEdge,
            neck,
            neckInner,
            this.leverHandle,
            handleGoldRing,
            handleBody,
            this.leverHandleInner,
            handleCore,
            handleHighlight,
            handleHighlight2,
            handleBounce,
          ];
          collars.forEach(([o, i]) => leverParts.push(o, i));
          this.leverContainer.add(leverParts);
          this.leverContainer.setAngle(-18); // 略微倾斜的“待拉”姿态

          // 手柄高光缓慢呼吸
          this.tweens.add({
            targets: handleHighlight,
            alpha: 0.35,
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
          this.tweens.add({
            targets: handleCore,
            alpha: 0.75,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });

          // 手（默认隐藏，从侧上方飞入抓住手柄）
          // 手柄世界坐标约 (lx-30, 305)，手要贴在球上
          this.handRestX = lx + 55;
          this.handRestY = 205;
          this.handGripX = lx - 8;
          this.handGripY = 263;

          this.leverHand = this.add
            .text(this.handRestX, this.handRestY, "✋", {
              fontSize: "40px",
            })
            .setOrigin(0.35, 0.35)
            .setAlpha(0)
            .setDepth(20)
            .setAngle(-25);

          // 拉杆可点击热区
          this.leverHit = this.add
            .rectangle(lx, 295, 120, 150, 0x000000, 0.01)
            .setInteractive({ useHandCursor: true });

          // 拉杆 / SPIN / 空格 统一：一点即转，转动中再点急停
          this.leverHit.on("pointerdown", () => {
            this.sfx.init();
            this.sfx.warmup();
            this.handleSpinInput();
          });

          this.leverHit.on("pointerover", () => {
            if (this.leverState === "up" && !this.isSpinning) {
              this.leverHandle.setFillStyle(0xffd700);
              this.leverHandle.setStrokeStyle(3, 0xffffff);
            }
          });

          this.leverHit.on("pointerout", () => {
            if (this.leverState !== "down") {
              this.leverHandle.setFillStyle(LEVER_HANDLE_IDLE_FILL);
              this.leverHandle.setStrokeStyle(2, 0xffd700);
            }
          });

          // 筹码 +/- 已并入左侧面板，不再在机身旁放 💰 入口

          // 拉杆整体（底座、槽、轴、杆身、热区、提示文字）不加入放大分组，
          // 长按 JACKPOT 触发彩蛋时拉杆保持原地不动、不参与缩放。
          // leverHand 是靠绝对世界坐标做“伸手拉杆”动画的独立元素，同样不参与分组变换。
        };


        SlotGame.prototype.drawRoundedPanel = function(gfx, w, h, radius, strokeColor, strokeWidth, fillColor, fillAlpha = 1) {
          gfx.clear();
          gfx.fillStyle(fillColor, fillAlpha);
          gfx.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
          gfx.lineStyle(strokeWidth, strokeColor, 1);
          gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
        };


        SlotGame.prototype.createRightClockToggle = function(lx) {
          const btnSize = 70;
          const cy = 165;
          const clockY = cy - 16;
          const modeY = cy + 14;
          const btnRadius = 14;

          this.rightClockToggleBg = this.add.graphics().setPosition(lx, cy);
          this.drawRoundedPanel(
            this.rightClockToggleBg,
            btnSize,
            btnSize,
            btnRadius,
            UI.gold,
            1,
            0x1a140c,
            0.92,
          );

          this.rightClockText = this.add
            .text(lx, clockY, "--:--", {
              fontSize: "17px",
              fontStyle: "bold",
              color: "#ffd700",
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5);

          this.modeLabelSimple = this.add
            .text(lx - 20, modeY, "简", {
              fontSize: "12px",
              fontStyle: "bold",
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5);

          this.modeLabelIcon = this.add
            .text(lx, modeY, "🕹️", { fontSize: "13px" })
            .setOrigin(0.5);

          this.modeLabelComplex = this.add
            .text(lx + 20, modeY, "繁", {
              fontSize: "12px",
              fontStyle: "bold",
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5);

          this.refreshModeLabel();

          this.rightClockToggleHit = this.add
            .rectangle(lx, cy, btnSize, btnSize, 0x000000, 0.01)
            .setInteractive({ useHandCursor: true });

          this.rightClockToggleHit.on("pointerover", () => {
            this.drawRoundedPanel(
              this.rightClockToggleBg,
              btnSize,
              btnSize,
              btnRadius,
              UI.gold,
              1.5,
              0x1a140c,
              0.92,
            );
          });
          this.rightClockToggleHit.on("pointerout", () => {
            this.drawRoundedPanel(
              this.rightClockToggleBg,
              btnSize,
              btnSize,
              btnRadius,
              UI.gold,
              1,
              0x1a140c,
              0.92,
            );
          });
          this.rightClockToggleHit.on("pointerdown", () => {
            this.tweens.add({
              targets: this.rightClockToggleBg,
              scaleX: 0.92,
              scaleY: 0.92,
              duration: 80,
              yoyo: true,
              ease: "Sine.easeInOut",
            });
            this.toggleFocusMode();
          });
        };

