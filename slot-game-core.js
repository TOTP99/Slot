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
          this.createLuxuryBackground();
          this.createHeader();
          this.loadGameState(); // 读取本机浏览器存档：余额 / 下注 / 奖池
          this.createPaytableButton();
          this.createMachine();
          this.createReels();
          this.createBottomPanels();
          this.createLastWinPanel();
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
