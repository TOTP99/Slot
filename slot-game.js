/* ============================================================
 * 万锦老虎机 (Wanjin Slot Machine) — 合并版 slot-game.js
 * 由 19 个拆分文件自动合并生成，逻辑与拆分版完全一致。
 * 依赖：Phaser 3、UI/LAYOUT/SYMBOLS 等常量、SoundFX、bgMusic、
 * fitTextToBox、rollSpinResult/evaluateSpinResult 等辅助函数
 * （这些定义在其他文件中，需在本文件之前加载）。
 * ============================================================ */

// ---------- 主场景：核心生命周期（构造 / preload / create）----------
// 其余方法通过 SlotGame.prototype.xxx 挂载在别的文件里（见 slot-game-*.js），
// 加载顺序由 index.html 保证。
class SlotGame extends Phaser.Scene {
        constructor() {
          super("SlotGame");

          this.balance = 1000;
          this.bet = 50;
          this.minBet = 10;
          this.maxBet = 500;
          this.betStep = 10;

          this.baseJackpotValue = 25000;
          this.jackpotValue = 25800;
          this.lastWin = 0;

          this.isSpinning = false;
          this.stopRequested = false;
          this.inputLocked = false;
          this.leverState = "up"; // up | down
          this.mode = "NORMAL"; // NORMAL | FAST

          this.autoPlay = false;
          this.autoPlayRounds = 0;
          this.maxAutoPlayRounds = 5;

          this.reels = [];
          this.stoppedReelsCount = 0;
          this.sfx = new SoundFX();

          // 隐藏功能（长按 JACKPOT 触发）：
          // focusHideGroup 收集左侧唱片面板的所有元素，触发时整体隐藏；
          // machineScaleGroup 收集老虎机机身 + 下方四分播报屏的所有元素，
          // 触发时两者作为一个整体一起放大 115%（拉杆与 JACKPOT 不参与，始终原地不动）。
          this.focusMode = false;
          this.focusHideGroup = [];
          this.machineScaleGroup = null;
          this.machineScaleAnchor = { x: 0, y: 0 };

          this.speedSettings = {
            NORMAL: { duration: 1700, interval: 40, step: 18 },
            FAST: { duration: 1000, interval: 22, step: 20 },
          };
        }

        preload() {
          // 无需预加载留声机图
        }

        create() {
          window.__slotGameScene = this;
          // 老虎机机身 + 拉杆的放大分组：先建好容器，createMachine/createReels/
          // createRightControls 会把各自的显示对象塞进来。
          this.machineScaleGroup = this.add.container(0, 0);
          // 画面背景完全由 Phaser 游戏配置的 backgroundColor 承担，此处无需额外绘制。
          this.createHeader();
          this.loadGameState(); // 读取本机浏览器存档：余额 / 下注 / 奖池
          this.createPaytableButton();
          this.createMachine();
          this.createReels();
          this.createBottomPanels(); // 含"上次获胜"格，四分播报屏统一在此创建
          this.createRightControls();
          // Container 不像 Scene 那样自动按 depth 排序子元素——它只按加入顺序渲染。
          // 卷轴是在三线之后才加入 machineScaleGroup 的，若不手动排序会把三线盖住。
          this.machineScaleGroup.sort("depth");
          this.createSettingsModal(); // 赔率 + 速度 / 自动五次 / 音效 设置弹窗
          this.createKeyboardControls();
          this.createAmbientAnimations();
          this.setupFocusModeToggle(); // 长按 JACKPOT：隐藏左侧面板，老虎机+下方播报屏整体放大115%
          this.toggleFocusMode(true); // 默认即为长按放大后的效果，无需再手动长按
          this.updateDisplay();
        }

}

/* 万锦老虎机 - 自动拆分自单文件版 */

        // 颜色调亮/调暗：percent>0 变亮，<0 变暗。用于从单一 fill 色推出
        // 渐变的上下两级色阶，不需要每个调用点都手写一套配色。
        SlotGame.prototype.shadeColor = function(hex, percent) {
          const c = Phaser.Display.Color.ValueToColor(hex).clone();
          if (percent >= 0) c.brighten(percent);
          else c.darken(-percent);
          return c.color;
        };


        // 圆角 + 竖向渐变面板的底层绘制：外发光环 → 渐变主体 → 顶部玻璃高光。
        // gfx 需已 setPosition 到面板中心，绘制以 (0,0) 为中心展开。
        SlotGame.prototype.drawGradientPanel = function(gfx, w, h, radius, topColor, bottomColor, fillAlpha, strokeColor, strokeWidth) {
          gfx.clear();
          gfx.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, fillAlpha);
          gfx.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
          if (strokeColor !== null && strokeWidth > 0) {
            gfx.lineStyle(strokeWidth, strokeColor, 0.95);
            gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
          }
        };


        SlotGame.prototype.createPanel = function(x, y, width, height, fill = UI.panel, alpha = 0.96, hideGroup = null, scaleGroup = null) {
          const radius = Math.min(PANEL_RADIUS, height / 2, width / 2);
          const topColor = this.shadeColor(fill, 22);
          const bottomColor = this.shadeColor(fill, -16);

          // 外发光环：柔化边缘，替代原来死板的等宽描边矩形
          const glow = this.add.graphics().setPosition(x, y);
          glow.fillStyle(UI.goldDim, 0.12);
          glow.fillRoundedRect(-(width + 8) / 2, -(height + 8) / 2, width + 8, height + 8, radius + 4);

          const panel = this.add.graphics().setPosition(x, y);
          this.drawGradientPanel(panel, width, height, radius, topColor, bottomColor, alpha, UI.gold, 1.4);

          // 玻璃感顶部高光：一条弧形亮带，让平面看起来有反光曲面
          const highlight = this.add.graphics().setPosition(x, y);
          highlight.fillStyle(0xffffff, 0.05);
          highlight.fillRoundedRect(
            -width / 2 + 3,
            -height / 2 + 2,
            width - 6,
            Math.max(4, height * 0.34),
            Math.max(2, radius * 0.55),
          );

          if (hideGroup) hideGroup.push(glow, panel, highlight);
          if (scaleGroup) scaleGroup.add([glow, panel, highlight]);

          return panel;
        };


        SlotGame.prototype.setControlActive = function(bg, txt, active) {
          // bg 现在是圆角渐变 Graphics，没有 setFillStyle 可改，改为整体重绘
          const fill = active ? UI.activeFill : 0x1a140c;
          const top = this.shadeColor(fill, active ? 16 : 10);
          const bottom = this.shadeColor(fill, active ? -8 : -8);
          const stroke = active ? UI.gold : UI.goldDim;
          const w = bg._btnW || 58;
          const h = bg._btnH || 28;
          this.drawGradientPanel(bg, w, h, 8, top, bottom, 0.95, stroke, active ? 1.5 : 1);
          txt.setColor(active ? UI.textDark : UI.cream);
        };

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createHeader = function() {
          // 标题句子已移除；奖池条上移填补空出的头部空间。
          // 取消边框与背景，原背景处改为随机闪烁的星光效果。
          // 星区相对原 350×38 加宽加高 20%，星数加密 20%。
          this.createJackpotSparkle(480, LAYOUT.jackpotY, 420, 46);

          this.jackpotText = this.add
            .text(
              480,
              LAYOUT.jackpotY,
              `⚿ Jackpot ${this.formatMoney(this.jackpotValue)}`,
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
          // 原 16 颗加密 20% → 19
          const count = 19;
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

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createMachine = function() {
          const mx = LAYOUT.machineX;
          const my = LAYOUT.machineY;
          const shellRadius = 26;

          // 外层柔光（呼吸动画在 createAmbientAnimations 中驱动）
          this.machineGlow = this.add.rectangle(
            mx,
            my,
            LAYOUT.machineOuterW + 14,
            LAYOUT.machineOuterH + 10,
            UI.gold,
            0.1,
          );

          // 厚重金边机壳：圆角 + 竖向渐变，替代原来的死板直角平色矩形
          const outerShell = this.add.graphics().setPosition(mx, my);
          this.drawGradientPanel(
            outerShell,
            LAYOUT.machineOuterW + 6,
            LAYOUT.machineOuterH + 6,
            shellRadius,
            this.shadeColor(UI.goldDim, -10),
            this.shadeColor(UI.goldDim, -55),
            0.85,
            UI.gold,
            2.5,
          );

          const darkShell = this.add.graphics().setPosition(mx, my);
          this.drawGradientPanel(
            darkShell,
            LAYOUT.machineOuterW,
            LAYOUT.machineOuterH,
            shellRadius - 4,
            this.shadeColor(0x101714, 12),
            this.shadeColor(0x101714, -22),
            1,
            UI.goldDim,
            2,
          );

          const innerPanel = this.add.graphics().setPosition(mx, my);
          this.drawGradientPanel(
            innerPanel,
            LAYOUT.machineInnerW,
            LAYOUT.machineInnerH,
            shellRadius - 10,
            this.shadeColor(UI.panelDeep, 16),
            this.shadeColor(UI.panelDeep, -12),
            1,
            UI.goldDim,
            1.5,
          );

          // 深色转轮窗：圆角凹槽 + 内阴影，让符号看起来是"从窗口里转出来"
          // 而不是贴在平面上——顶部/底部各叠一层黑色渐变模拟凹陷纵深感。
          const reelWindow = this.add.graphics().setPosition(mx, my);
          this.drawGradientPanel(
            reelWindow,
            452,
            170,
            14,
            0x000000,
            0x141416,
            1,
            UI.goldDim,
            2,
          );
          const reelInnerShadow = this.add.graphics().setPosition(mx, my);
          reelInnerShadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
          reelInnerShadow.fillRoundedRect(-226, -85, 452, 34, { tl: 14, tr: 14, bl: 0, br: 0 });
          reelInnerShadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
          reelInnerShadow.fillRoundedRect(-226, 51, 452, 34, { tl: 0, tr: 0, bl: 14, br: 14 });

          // 传统三线：中间粗、上下细，对齐符号行距(64px)，压在卷轴容器之上，
          // 半透明穿过图标背景，符号仍清晰可见——这才是传统老虎机支付线的样子。
          this.paylineTop = this.add
            .rectangle(mx, my - 64, 448, 2, UI.goldDim, 0.7)
            .setDepth(5);

          this.paylineMiddle = this.add
            .rectangle(mx, my, 448, 5, UI.gold, 0.88)
            .setDepth(5);

          this.paylineBottom = this.add
            .rectangle(mx, my + 64, 448, 2, UI.goldDim, 0.7)
            .setDepth(5);

          // 三线标签：加一枚宝石红圆角小徽章打底，不再是裸文字贴在机身上
          const makeLineLabel = (lx) => {
            const chip = this.add.graphics().setPosition(lx, my);
            this.drawGradientPanel(
              chip,
              46,
              24,
              12,
              this.shadeColor(UI.ruby, 20),
              this.shadeColor(UI.rubyDim, -10),
              0.92,
              UI.gold,
              1,
            );
            const label = this.add
              .text(lx, my, "三线", {
                fontSize: "13px",
                fontStyle: "bold",
                color: "#f4ead0",
              })
              .setOrigin(0.5);
            return [chip, label];
          };
          const leftLabelParts = makeLineLabel(226);
          const rightLabelParts = makeLineLabel(714);

          // 老虎机机身整体收进放大分组：长按 JACKPOT 触发彩蛋时随分组一起放大 115%
          this.machineScaleGroup.add([
            this.machineGlow,
            outerShell,
            darkShell,
            innerPanel,
            reelWindow,
            reelInnerShadow,
            this.paylineTop,
            this.paylineMiddle,
            this.paylineBottom,
            ...leftLabelParts,
            ...rightLabelParts,
          ]);
        };


        // 转轮边框需要在中奖时切换描边宽度/颜色做高亮闪烁（原来靠 Rectangle
        // 的 setStrokeStyle 直接改属性）。换成圆角渐变 Graphics 后没有那个
        // 属性，改用重绘：保留同一份填充配色，只重画描边部分。
        SlotGame.prototype.setReelFrameStroke = function(reel, strokeWidth, strokeColor) {
          if (!reel || !reel.frame) return;
          this.drawGradientPanel(
            reel.frame,
            LAYOUT.reelFrameW,
            LAYOUT.reelFrameH,
            16,
            this._reelFrameTop,
            this._reelFrameBottom,
            1,
            strokeColor,
            strokeWidth,
          );
        };


        SlotGame.prototype.createReels = function() {
          this._reelFrameTop = this.shadeColor(0x090b0b, 14);
          this._reelFrameBottom = this.shadeColor(0x090b0b, -20);

          LAYOUT.reelXs.forEach((x, reelIndex) => {
            const frame = this.add.graphics().setPosition(x, LAYOUT.reelY).setDepth(2);
            this.drawGradientPanel(
              frame,
              LAYOUT.reelFrameW,
              LAYOUT.reelFrameH,
              16,
              this._reelFrameTop,
              this._reelFrameBottom,
              1,
              UI.goldDim,
              2,
            );

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

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createPaytableButton = function() {
          const x = LAYOUT.paytableX;
          const y = LAYOUT.paytableY;
          const w = LAYOUT.paytableW;
          const h = LAYOUT.paytableH;

          this.createPanel(x, y, w, h, 0x0c0a08, 0.96, this.focusHideGroup);

          this.updateLiveClock();
          this.clockTimer = setInterval(() => this.updateLiveClock(), 250);

          // 麦克风（放大 218%，位置下移 8px，与面板顶部保持足够间距，确保完整露出、不被遮挡）
          const micY = y - h / 2 + 84 + 8;
          const micIcon = this.add
            .text(x, micY, "🎷", { fontSize: "98px" })
            .setOrigin(0.5);
          this.focusHideGroup.push(micIcon);

          // 播放控制：⏮️ ⏸️/▶️ ⏭️ —— 中间键为播放/暂停切换（按当前播放状态动态显示图标）
          const tY = micY + 104;
          const gap = 54;

          const prevBtn = this.add
            .text(x - gap, tY, "⏮️", { fontSize: "34px" })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
          prevBtn.on("pointerdown", () => {
            this.sfx.click();
            bgMusic.skipPrev();
            this.saveGameState();
          });
          prevBtn.on("pointerover", () => prevBtn.setScale(1.1));
          prevBtn.on("pointerout", () => prevBtn.setScale(1));
          this.focusHideGroup.push(prevBtn);

          this.sidePlayPauseBtn = this.add
            .text(x, tY, bgMusic.isPlaying() ? "⏸️" : "▶️", { fontSize: "34px" })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
          this.sidePlayPauseBtn.on("pointerdown", () => {
            this.sfx.click();
            if (bgMusic.isPlaying()) {
              bgMusic.pause();
            } else {
              bgMusic.play();
            }
            this.refreshPlayPauseIcon();
            this.saveGameState();
          });
          this.sidePlayPauseBtn.on("pointerover", () =>
            this.sidePlayPauseBtn.setScale(1.1),
          );
          this.sidePlayPauseBtn.on("pointerout", () =>
            this.sidePlayPauseBtn.setScale(1),
          );
          this.focusHideGroup.push(this.sidePlayPauseBtn);

          const nextBtn = this.add
            .text(x + gap, tY, "⏭️", { fontSize: "34px" })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
          nextBtn.on("pointerdown", () => {
            this.sfx.click();
            bgMusic.skipNext();
            this.saveGameState();
          });
          nextBtn.on("pointerover", () => nextBtn.setScale(1.1));
          nextBtn.on("pointerout", () => nextBtn.setScale(1));
          this.focusHideGroup.push(nextBtn);

          // 曲号（放大 120%：13px → 16px）
          const trackY = tY + 42;
          this.sideTrackLabel = this.add
            .text(x, trackY, "01 / 56", {
              fontSize: "16px",
              fontStyle: "bold",
              color: "#ffd700",
            })
            .setOrigin(0.5);
          this.refreshTrackLabel();
          this.focusHideGroup.push(this.sideTrackLabel);

          // 无论顺序切歌、随机切歌，还是曲目播完自动切下一首，曲号都会同步刷新，
          // 修复了此前"随机播放时曲号显示错误（停留在旧编号）"的问题
          bgMusic.onTrackChange(() => this.refreshTrackLabel());

          // 底部一体金框按键（圆角渐变）→ 打开赔率*设置弹窗
          const ctrlY = trackY + 45;
          const frameW = w - 28;
          const frameH = 40;
          const frame = this.add.graphics().setPosition(x, ctrlY);
          const drawCtrlFrame = (strokeWidth, strokeColor) =>
            this.drawGradientPanel(
              frame,
              frameW,
              frameH,
              12,
              this.shadeColor(0x120a04, 14),
              this.shadeColor(0x120a04, -8),
              0.92,
              strokeColor,
              strokeWidth,
            );
          drawCtrlFrame(1, UI.gold);
          frame.setInteractive(
            new Phaser.Geom.Rectangle(-frameW / 2, -frameH / 2, frameW, frameH),
            Phaser.Geom.Rectangle.Contains,
          );
          if (frame.input) frame.input.cursor = "pointer";
          const ctrlLabel = this.add
            .text(x, ctrlY, "赔率*设置", {
              fontSize: "24px",
              fontStyle: "bold",
              color: "#ffd700",
            })
            .setOrigin(0.5);
          const openCtrl = () => {
            this.sfx.click();
            this.toggleSettingsModal(true);
          };
          frame.on("pointerdown", openCtrl);
          frame.on("pointerover", () => {
            drawCtrlFrame(2, 0xffd700);
            ctrlLabel.setScale(1.06);
          });
          frame.on("pointerout", () => {
            drawCtrlFrame(1, UI.gold);
            ctrlLabel.setScale(1);
          });
          ctrlLabel.setInteractive({ useHandCursor: true });
          ctrlLabel.on("pointerdown", openCtrl);
          this.focusHideGroup.push(frame, ctrlLabel);
        };


        SlotGame.prototype.refreshTrackLabel = function() {
          if (!this.sideTrackLabel) return;
          const n = bgMusic.currentNum || 1;
          this.sideTrackLabel.setText(
            String(n).padStart(2, "0") +
              " / " +
              String(BG_MUSIC_MAX).padStart(2, "0"),
          );
        };


        SlotGame.prototype.refreshPlayPauseIcon = function() {
          if (!this.sidePlayPauseBtn) return;
          this.sidePlayPauseBtn.setText(bgMusic.isPlaying() ? "⏸️" : "▶️");
        };


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

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createSettingsModal = function() {
          const cx = GAME_WIDTH / 2;
          const cy = GAME_HEIGHT / 2;
          const panelW = 560;
          const panelH = 370;
          const top = cy - panelH / 2;

          this.settingsModalGroup = this.add
            .container(0, 0)
            .setDepth(100)
            .setVisible(false);

          const children = [];

          const overlay = this.add
            .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
            .setOrigin(0)
            .setInteractive();
          overlay.on("pointerdown", () => this.toggleSettingsModal(false));
          children.push(overlay);

          // 外层微光：圆角版，呼应弹窗本体的圆角
          const modalGlow = this.add.graphics().setPosition(cx, cy);
          modalGlow.fillStyle(UI.gold, 0.08);
          modalGlow.fillRoundedRect(-(panelW + 9) / 2, -(panelH + 9) / 2, panelW + 9, panelH + 9, 22);
          modalGlow.lineStyle(1, UI.goldDim, 0.9);
          modalGlow.strokeRoundedRect(-(panelW + 9) / 2, -(panelH + 9) / 2, panelW + 9, panelH + 9, 22);
          children.push(modalGlow);

          // 弹窗主体：圆角渐变（视觉层），叠加一个透明的矩形热区专门负责拦截点击——
          // 圆角 Graphics 本身不支持精确的圆角点击判定，用不可见矩形兜底最省事可靠。
          const panelVisual = this.add.graphics().setPosition(cx, cy);
          this.drawGradientPanel(
            panelVisual,
            panelW,
            panelH,
            20,
            this.shadeColor(0x0e0a06, 16),
            this.shadeColor(0x0e0a06, -10),
            0.98,
            UI.gold,
            2,
          );
          children.push(panelVisual);

          const panel = this.add
            .rectangle(cx, cy, panelW, panelH, 0x000000, 0.001)
            .setInteractive();
          panel.on("pointerdown", (pointer, lx, ly, event) => {
            event.stopPropagation();
          });
          children.push(panel);

          const pad = 21;
          const leftX = cx - panelW / 2 + pad;
          const rightX = cx + panelW / 2 - pad;
          const dividerX = cx - 28;

          // 左：赔率表（无列标题，直接从顶部留白后开始）；图标放大 125%，行距相应放宽
          const payRows = [
            ["7️⃣7️⃣7️⃣", "×50"],
            ["🌸🌸🌸", "×20"],
            ["🌺🌺🌺", "×15"],
            ["🍇🍇🍇", "×10"],
            ["🍓🍓🍓", "×8"],
            ["🍒🍒🍒", "×6"],
            ["🍄🍄🍄", "×4"],
            ["任意一对", "×2"],
          ];
          const payStart = top + 28;
          const paySpacing = 46;
          payRows.forEach((row, i) => {
            const ry = payStart + i * paySpacing;
            children.push(
              this.add
                .text(leftX + 7, ry, row[0], {
                  fontSize: "18px",
                  color: "#e8dcc0",
                })
                .setOrigin(0, 0.5),
            );
            children.push(
              this.add
                .text(dividerX - 12, ry, row[1], {
                  fontSize: "14px",
                  fontStyle: "bold",
                  color: "#ffd700",
                })
                .setOrigin(1, 0.5),
            );
          });

          children.push(
            this.add
              .rectangle(dividerX, cy, 1, panelH - 40, UI.gold, 0.22)
              .setOrigin(0.5),
          );

          // 右：设置（无列标题）——圆角小按钮，取代原来的直角实色矩形
          const makeOptionButton = (bx, by, label) => {
            const w = 58;
            const h = 28;
            const bg = this.add.graphics().setPosition(bx, by);
            bg._btnW = w;
            bg._btnH = h;
            this.drawGradientPanel(
              bg,
              w,
              h,
              8,
              this.shadeColor(0x1a140c, 10),
              this.shadeColor(0x1a140c, -8),
              0.95,
              UI.goldDim,
              1,
            );
            bg.setInteractive(
              new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
              Phaser.Geom.Rectangle.Contains,
            );
            if (bg.input) bg.input.cursor = "pointer";
            const txt = this.add
              .text(bx, by, label, {
                fontSize: "13px",
                color: "#e8dcc0",
              })
              .setOrigin(0.5);
            children.push(bg, txt);
            return { bg, txt };
          };

          // 通用：给一个文字/图标叠加一个更大的隐形热区，扩大点击范围，
          // 并统一处理悬停放大反馈 + 按下音效，避免每处再各自重复实现。
          const addHitZone = (visual, bx, by, w, h, sound, onDown) => {
            const hit = this.add
              .rectangle(bx, by, w, h, 0x000000, 0.001)
              .setInteractive({ useHandCursor: true });
            hit.on("pointerover", () => visual.setScale(1.15));
            hit.on("pointerout", () => visual.setScale(1));
            hit.on("pointerdown", (p, lx, ly, e) => {
              if (e) e.stopPropagation();
              if (sound) sound();
              onDown();
            });
            children.push(hit);
            return hit;
          };

          const rowLabelX = dividerX + 16;
          const optAX = cx + 66;
          const optBX = cx + 146;
          const boxCenterX = cx + 106;

          let rowY = payStart;
          children.push(
            this.add
              .text(rowLabelX, rowY, "速度", {
                fontSize: "14px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const normalOpt = makeOptionButton(optAX, rowY, "正常");
          const fastOpt = makeOptionButton(optBX, rowY, "加速");
          this.speedButtons = [
            { label: "NORMAL", btn: normalOpt.bg, txt: normalOpt.txt },
            { label: "FAST", btn: fastOpt.bg, txt: fastOpt.txt },
          ];
          normalOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            this.mode = "NORMAL";
            this.sfx.click();
            this.updateSpeedButtons();
            this.saveGameState();
          });
          fastOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            this.mode = "FAST";
            this.sfx.click();
            this.updateSpeedButtons();
            this.saveGameState();
          });
          this.updateSpeedButtons();

          rowY += 60;
          children.push(
            this.add
              .text(rowLabelX, rowY, "自动", {
                fontSize: "14px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const autoYesOpt = makeOptionButton(optAX, rowY, "是");
          const autoNoOpt = makeOptionButton(optBX, rowY, "否");
          this.autoYesButton = autoYesOpt;
          this.autoNoButton = autoNoOpt;
          autoYesOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (!this.autoPlay) {
              this.sfx.click();
              this.toggleAutoPlay();
            }
          });
          autoNoOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (this.autoPlay) {
              this.sfx.click();
              this.toggleAutoPlay();
            }
          });
          this.updateAutoOptionButtons();

          rowY += 60;
          children.push(
            this.add
              .text(rowLabelX, rowY, "音效", {
                fontSize: "14px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const soundOnOpt = makeOptionButton(optAX, rowY, "开启");
          const soundOffOpt = makeOptionButton(optBX, rowY, "关闭");
          this.soundOnButton = soundOnOpt;
          this.soundOffButton = soundOffOpt;
          soundOnOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (!this.sfx.enabled) {
              this.sfx.enabled = true;
              this.sfx.click();
              this.updateSoundOptionButtons();
              this.saveGameState();
            }
          });
          soundOffOpt.bg.on("pointerdown", (p, lx, ly, e) => {
            e.stopPropagation();
            if (this.sfx.enabled) {
              this.sfx.click();
              this.sfx.enabled = false;
              this.updateSoundOptionButtons();
              this.saveGameState();
            }
          });
          this.updateSoundOptionButtons();

          rowY += 60;
          children.push(
            this.add
              .rectangle(boxCenterX, rowY, rightX - dividerX - 10, 1, UI.gold, 0.22)
              .setOrigin(0.5),
          );

          // 投注：文字标签 / 数值框 / +− 按钮均放大 125%，并整体右移一点、加宽行距，避免与左侧标签、面板边缘拥挤
          rowY += 64;
          // BET 这一行（标签 + 长方形数值框 + −/+ 按钮）整体上移 6px，
          // 与下方 CHIPS 行留出更充裕的间距；后续行的 rowY 仍按原基准累加，不受影响。
          const betRowY = rowY - 6;
          children.push(
            this.add
              .text(rowLabelX, betRowY, "BET", {
                fontSize: "18px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const bigBoxCenterX = boxCenterX + 34;
          const betBoxX = bigBoxCenterX;
          const betBoxGfx = this.add.graphics().setPosition(betBoxX, betRowY);
          this.drawGradientPanel(
            betBoxGfx,
            155,
            38,
            9,
            this.shadeColor(0x0a0806, 10),
            this.shadeColor(0x0a0806, -6),
            0.95,
            UI.goldDim,
            1,
          );
          children.push(betBoxGfx);
          const betMinus = this.add
            .text(betBoxX - 55, betRowY, "−", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          const betPlus = this.add
            .text(betBoxX + 55, betRowY, "+", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          this.modalBetValue = this.add
            .text(betBoxX, betRowY, this.formatInt(this.bet), {
              fontSize: "19px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          children.push(betMinus, betPlus, this.modalBetValue);
          // 命中范围放大到 44×44，明显比原本紧贴文字的热区更容易点中；按下有声效
          addHitZone(betMinus, betBoxX - 55, betRowY, 44, 44, () => this.sfx.click(), () => {
            this.changeBet(-this.betStep);
            if (this.modalBetValue)
              this.modalBetValue.setText(this.formatInt(this.bet));
          });
          addHitZone(betPlus, betBoxX + 55, betRowY, 44, 44, () => this.sfx.click(), () => {
            this.changeBet(this.betStep);
            if (this.modalBetValue)
              this.modalBetValue.setText(this.formatInt(this.bet));
          });

          // 筹码：与投注同比例放大 125%，行距加宽避免与投注框拥挤
          rowY += 58;
          children.push(
            this.add
              .text(rowLabelX, rowY, "CHIPS", {
                fontSize: "18px",
                fontStyle: "bold",
                color: "#ffd700",
              })
              .setOrigin(0, 0.5),
          );
          const chipBoxGfx = this.add.graphics().setPosition(betBoxX, rowY);
          this.drawGradientPanel(
            chipBoxGfx,
            170,
            38,
            9,
            this.shadeColor(0x0a0806, 10),
            this.shadeColor(0x0a0806, -6),
            0.95,
            UI.goldDim,
            1,
          );
          children.push(chipBoxGfx);
          const chipMinus = this.add
            .text(betBoxX - 64, rowY, "−", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          const chipPlus = this.add
            .text(betBoxX + 64, rowY, "+", {
              fontSize: "22px",
              color: "#ffd700",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          children.push(
            this.add
              .text(betBoxX, rowY, "1000", {
                fontSize: "19px",
                color: "#ffd700",
                fontStyle: "bold",
              })
              .setOrigin(0.5),
          );
          children.push(chipMinus, chipPlus);
          // 同样放大到 44×44 的命中范围；金币音效已有，予以保留
          addHitZone(chipPlus, betBoxX + 64, rowY, 44, 44, null, () => {
            this.sfx.coinChime("out");
            this.balance = Math.round(this.balance + 1000);
            this.updateDisplay();
            this.setMessage("CHIPS +1000");
          });
          addHitZone(chipMinus, betBoxX - 64, rowY, 44, 44, null, () => {
            if (this.balance < 1000) {
              this.setMessage("INSUFFICIENT CHIPS");
              this.sfx.lose();
              return;
            }
            this.sfx.coinChime("in");
            this.balance = Math.round(this.balance - 1000);
            this.updateDisplay();
            this.setMessage("CHIPS -1000");
          });

          // 关闭按钮：放大至 200%，并相应调整位置与外层微光留出的边距保持协调
          const closeX = cx + panelW / 2 - 28;
          const closeY = top + 24;
          const closeBtn = this.add
            .text(closeX, closeY, "✕", {
              fontSize: "32px",
              fontStyle: "bold",
              color: "#ffd700",
            })
            .setOrigin(0.5);
          children.push(closeBtn);
          // x 的命中范围同样放大到 44×44，比原来紧贴字形的热区更容易点中
          addHitZone(closeBtn, closeX, closeY, 44, 44, () => this.sfx.click(), () => {
            this.toggleSettingsModal(false);
          });

          this.settingsModalGroup.add(children);
        };


        SlotGame.prototype.toggleSettingsModal = function(show) {
          if (show && this.modalBetValue) {
            this.modalBetValue.setText(this.formatInt(this.bet));
          }
          this.settingsModalGroup.setVisible(show);
        };


        SlotGame.prototype.updateAutoOptionButtons = function() {
          if (!this.autoYesButton || !this.autoNoButton) return;
          this.setControlActive(
            this.autoYesButton.bg,
            this.autoYesButton.txt,
            this.autoPlay,
          );
          this.setControlActive(
            this.autoNoButton.bg,
            this.autoNoButton.txt,
            !this.autoPlay,
          );
        };


        SlotGame.prototype.updateSoundOptionButtons = function() {
          if (!this.soundOnButton || !this.soundOffButton) return;
          this.setControlActive(
            this.soundOnButton.bg,
            this.soundOnButton.txt,
            this.sfx.enabled,
          );
          this.setControlActive(
            this.soundOffButton.bg,
            this.soundOffButton.txt,
            !this.sfx.enabled,
          );
        };


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

          this.setReelFrameStroke(reel, 3, UI.goldBright);

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

          this.setReelFrameStroke(reel, 2, UI.goldDim);

          this.stoppedReelsCount++;

          if (this.stoppedReelsCount >= this.reels.length) {
            this.time.delayedCall(300, () => {
              this.isSpinning = false;
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
            this.setReelFrameStroke(reel, 6, 0x00ff99);

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
              this.setReelFrameStroke(reel, 4, 0xffd700),
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

/* 万锦老虎机 - 自动拆分自单文件版 */

        // skipSave=true：只刷新 UI（横竖屏拉回存档时用，避免读完立刻再写）
        SlotGame.prototype.updateDisplay = function(skipSave) {
          fitTextToBox(
            this.balanceValue,
            this.formatInt(this.balance),
            LAYOUT.balanceW - 35,
            21,
            13,
          );

          if (this.modalBetValue) {
            this.modalBetValue.setText(this.formatInt(this.bet));
          }

          fitTextToBox(
            this.lastWinValue,
            this.formatInt(this.lastWin),
            LAYOUT.lastWinW - 35,
            21,
            13,
          );

          fitTextToBox(
            this.jackpotText,
            `⚿ Jackpot ${this.formatMoney(this.jackpotValue)}`,
            320,
            21,
            14,
          );

          if (!skipSave) this.saveGameState();
        };


        SlotGame.prototype.changeBet = function(amount) {
          if (this.isSpinning) return;

          this.sfx.click();

          this.bet = Math.round(
            Phaser.Math.Clamp(
              this.bet + amount,
              this.minBet,
              this.maxBet,
            ),
          );

          if (this.modalBetValue) {
            this.modalBetValue.setText(this.formatInt(this.bet));
          }
          this.saveGameState();
        };

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.formatMoney = function(value) {
          // 全站数字统一整数显示，不出现小数点
          return String(Math.round(Number(value)));
        };


        SlotGame.prototype.formatInt = function(value) {
          return String(Math.round(Number(value)));
        };


        SlotGame.prototype.setMessage = function(value, baseFontSize = 20) {
          fitTextToBox(
            this.messageText,
            value,
            LAYOUT.messageW - 28,
            baseFontSize,
            12,
          );
        };

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

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.refreshModeLabel = function() {
          if (!this.modeLabelSimple) return;
          const activeColor = "#ffd700";
          const dimColor = "#6a6a6a";
          this.modeLabelSimple.setColor(this.focusMode ? activeColor : dimColor);
          this.modeLabelComplex.setColor(this.focusMode ? dimColor : activeColor);
        };


        SlotGame.prototype.setupFocusModeToggle = function() {
          // 缩放锚点：老虎机机身的视觉中心，放大时以此为基准，位置不会跑偏
          this.machineScaleAnchor = {
            x: LAYOUT.machineX,
            y: LAYOUT.machineY,
          };
        };


        SlotGame.prototype.toggleFocusMode = function(silent) {
          this.focusMode = !this.focusMode;
          if (!silent) this.sfx.click();

          this.focusHideGroup.forEach((obj) => {
            if (obj) obj.setVisible(!this.focusMode);
          });
          this.refreshModeLabel();

          const scale = this.focusMode ? 1.15 : 1;
          const cx = this.machineScaleAnchor.x;
          const cy = this.machineScaleAnchor.y;
          const targetProps = {
            scaleX: scale,
            scaleY: scale,
            x: cx * (1 - scale),
            y: cy * (1 - scale),
          };
          if (silent) {
            this.machineScaleGroup.setScale(scale, scale);
            this.machineScaleGroup.setPosition(
              targetProps.x,
              targetProps.y
            );
          } else {
            this.tweens.add({
              targets: this.machineScaleGroup,
              ...targetProps,
              duration: 260,
              ease: "Sine.easeInOut",
            });
          }
        };

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.updateSpeedButtons = function() {
          this.speedButtons.forEach(({ label, btn, txt }) => {
            this.setControlActive(btn, txt, label === this.mode);
          });
        };


        SlotGame.prototype.createKeyboardControls = function() {
          this.input.keyboard.on("keydown-SPACE", () => {
            this.sfx.click();
            this.handleSpinInput();
          });
        };


        SlotGame.prototype.createAmbientAnimations = function() {
          // 注：移动式"扫光"动效之前按需求移除过，这里不恢复；
          // 只做原地的柔和呼吸（alpha 明暗），不引入任何位移/扫过效果。
          this.machineGlow.setAlpha(0.07);
          this.tweens.add({
            targets: this.machineGlow,
            alpha: 0.13,
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });

          if (this.paylineTop) this.paylineTop.setAlpha(0.7);
          if (this.paylineMiddle) this.paylineMiddle.setAlpha(0.88);
          if (this.paylineBottom) this.paylineBottom.setAlpha(0.7);

          if (this.paylineMiddle) {
            this.tweens.add({
              targets: this.paylineMiddle,
              alpha: 0.62,
              duration: 1500,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          }
        };

/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.loadGameState = function() {
          try {
            if (typeof window === "undefined" || !window.localStorage) return;
            const raw = window.localStorage.getItem("wanjin_slot_save");
            if (!raw) return;

            const saved = JSON.parse(raw);
            // 只接受有限数字，统一取整，避免脏数据/浮点污染
            if (typeof saved.balance === "number" && Number.isFinite(saved.balance)) {
              this.balance = Math.round(saved.balance);
            }
            if (typeof saved.bet === "number" && Number.isFinite(saved.bet)) {
              this.bet = Math.round(saved.bet);
            }
            if (typeof saved.jackpotValue === "number" && Number.isFinite(saved.jackpotValue)) {
              this.jackpotValue = Math.round(saved.jackpotValue);
            }
            if (typeof saved.lastWin === "number" && Number.isFinite(saved.lastWin)) {
              this.lastWin = Math.round(saved.lastWin);
            }
            if (saved.mode === "NORMAL" || saved.mode === "FAST") this.mode = saved.mode;
            if (typeof saved.sfxEnabled === "boolean") this.sfx.enabled = saved.sfxEnabled;
          } catch (err) {
            // 没有存档、存档损坏，或浏览器禁用了 localStorage：忽略，使用默认初始值
          }
        };


        /**
         * 写入存档。
         * @param {boolean} [immediate] 为 true 时跳过合并、立刻落盘（切竖屏前必须）
         * 常规路径：50ms 合并，减少转轮/UI 高频刷新时的重复 setItem。
         */
        SlotGame.prototype.saveGameState = function(immediate) {
          const self = this;
          const run = function () {
            self._saveTimer = 0;
            try {
              if (typeof window === "undefined" || !window.localStorage) return;
              const bal = Math.round(Number(self.balance) || 0);
              const bet = Math.round(Number(self.bet) || 0);
              const jp = Math.round(Number(self.jackpotValue) || 0);
              const lw = Math.round(Number(self.lastWin) || 0);
              const musicEnabled = !!(typeof bgMusic !== "undefined" && bgMusic.enabled);
              const musicPlayMode =
                (typeof bgMusic !== "undefined" && bgMusic.playMode) || "order";
              const musicCurrentNum =
                (typeof bgMusic !== "undefined" && bgMusic.currentNum) || 1;

              // 内容未变则跳过写入，减 I/O
              const payload = JSON.stringify({
                balance: bal,
                bet: bet,
                jackpotValue: jp,
                lastWin: lw,
                mode: self.mode,
                sfxEnabled: !!(self.sfx && self.sfx.enabled),
                musicEnabled: musicEnabled,
                musicPlayMode: musicPlayMode,
                musicCurrentNum: musicCurrentNum,
              });
              if (self._lastSavePayload === payload) return;
              self._lastSavePayload = payload;

              window.localStorage.setItem("wanjin_slot_save", payload);
              // 独立键给外部留声机（只认 bgMusic*）读
              localStorage.setItem("bgMusicEnabled", String(musicEnabled));
              localStorage.setItem("bgMusicPlayMode", musicPlayMode);
              localStorage.setItem("bgMusicCurrentNum", String(musicCurrentNum));
            } catch (err) {
              // 存储满 / 禁用：静默忽略
            }
          };

          if (immediate) {
            if (self._saveTimer) {
              clearTimeout(self._saveTimer);
              self._saveTimer = 0;
            }
            run();
            return;
          }
          if (self._saveTimer) return;
          self._saveTimer = setTimeout(run, 50);
        };
