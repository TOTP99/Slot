      // ---------- 布局坐标 ----------
      const LAYOUT = {
        jackpotY: 70,

        paytableX: 112,
        paytableY: 280,
        paytableW: 170,
        paytableH: 306,

        machineX: 470,
        machineY: 270,
        machineOuterW: 560,
        machineOuterH: 255,
        machineInnerW: 520,
        machineInnerH: 208,
        reelFrameW: 150,
        reelFrameH: 170,
        reelXs: [350, 470, 590],
        reelY: 270,

        messageX: 470,
        messageY: 402,
        messageW: 448,
        messageH: 44,

        // 余额 / 上次获胜现在并入四分屏，不再占用底部独立区域
        balanceX: 302,
        balanceY: 402,
        balanceW: 108,
        balanceH: 44,

        lastWinX: 638,
        lastWinY: 402,
        lastWinW: 108,
        lastWinH: 44,

        rightPanelX: 855,
      };

      // ---------- UI 配色（高级金边主题） ----------
      // 全站唯一金色来源：GOLD（数值，画布用）/ GOLD_CSS（字符串，文本颜色用），
      // 与页面 CSS 变量 --gold 保持同一数值，避免多处各自定义、互相不一致。
      const GOLD = 0xffd700;
      const GOLD_CSS = "#ffd700";
      // 拉杆手柄外圈的"待机"填充色：hover 高亮和松开复位都要用这同一个值，
      // 否则第一次 hover 后手柄会永久停在 hover 用的过渡色上，回不到真正的默认色
      const LEVER_HANDLE_IDLE_FILL = 0x5c4010;
      const UI = {
        bg: 0x090b0b,
        bgWine: 0x16070d,
        bgGreen: 0x07130f,
        panel: 0x101714,
        panelDeep: 0x0b100e,
        gold: GOLD,
        goldDim: GOLD,
        goldBright: GOLD,
        champagne: GOLD,
        cream: "#e8dcc0",
        creamHex: 0xe8dcc0,
        textDark: "#17120a",
        danger: 0x651a2c,
        emerald: 0x1f6b55,
        activeFill: 0x8d6f32,
      };

      // ---------- 文本适配 ----------
      function fitTextToBox(
        textObject,
        value,
        maxWidth,
        baseFontSize = 20,
        minFontSize = 12,
      ) {
        if (!textObject) return;

        textObject.setText(value);
        textObject.setFontSize(baseFontSize);

        let size = baseFontSize;

        while (textObject.width > maxWidth && size > minFontSize) {
          size -= 1;
          textObject.setFontSize(size);
        }
      }
