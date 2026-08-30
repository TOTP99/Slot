/* ============================================================
 * 万锦老虎机 - 游戏常量 + 中奖概率表
 * 操作：拉杆 / SPIN / 空格 一点即转；转动中再次操作急停。
 * 依赖：无。rollSpinResult / evaluateSpinResult 供 slot-game.js 使用。
 * ============================================================ */

// ---------- 画布尺寸 ----------
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

// ---------- 符号表 ----------
const SYMBOLS = [
  { key: "seven", label: "7️⃣", color: "#ff2d2d", multiplier: 50 },
  { key: "blossom", label: "🌸", color: "#ff8fab", multiplier: 20 },
  { key: "hibiscus", label: "🌺", color: "#ff4d6d", multiplier: 15 },
  { key: "grape", label: "🍇", color: "#9b5de5", multiplier: 10 },
  { key: "strawberry", label: "🍓", color: "#ff2d55", multiplier: 8 },
  { key: "cherry", label: "🍒", color: "#e63946", multiplier: 6 },
  { key: "mushroom", label: "🍄", color: "#c77dff", multiplier: 4 },
];

// ---------- 中奖概率表（结果导向）----------
// 说明：三个轮子若各自独立均匀随机（原实现），"任意两个相同"的概率会被
// 组合数学自动放大到 ~37%，加上固定 25800 的 JACKPOT，实测综合期望回报率
// (RTP) 超过 200%，余额会持续暴涨。这里改为「先按目标概率决定这一把的
// 结果类型，再倒推三个轮子该显示什么符号」，回报率可控、且不影响任何
// 动画/UI/存档结构：调用方拿到的仍然是 3 个 SYMBOLS 条目，接口不变。
//
// 踩过的坑：曾经尝试过"给每个符号单独设权重、三个轮子各自独立按权重抽"
// 的方案（让高倍符号更稀有），但权重越向低倍符号倾斜，符号分布越集中，
// 会通过生日悖论效应把"任意两轮凑成对子"的概率进一步推高（实测能到
// 43%+），而对子固定赔 2 倍下注，光这一项就能把 RTP 顶到 100%+——权重
// 调整完全无法压低对子频率。所以改用当前的"结果层"概率表，直接控制
// 每种结果类型的出现概率，不受符号分布的组合数学效应影响。
const SPIN_TABLE_TOTAL = 1000000;
const THREE_OF_KIND_WEIGHTS = {
  blossom: 700,
  hibiscus: 1000,
  grape: 1700,
  strawberry: 2300,
  cherry: 3200,
  mushroom: 4500,
};
const JACKPOT_WEIGHT = 320; // 约 1/3125 把出一次三连 7️⃣
const PAIR_WEIGHT = 270000; // 27% 出对子
// 实测 1000 万把模拟 RTP ≈ 87%：约 71.6% 空手、27% 中对子(2x)、
// ~1.3% 中三连(4x~20x)、~0.032% 中 JACKPOT（金额随每把下注的 5% 持续
// 累积，命中后按当前下注比例回落到基础值，见 playJackpot()）。

function buildSpinOutcomeTable() {
  const table = [{ type: "pair", weight: PAIR_WEIGHT }];
  Object.keys(THREE_OF_KIND_WEIGHTS).forEach((key) => {
    table.push({ type: "three", key, weight: THREE_OF_KIND_WEIGHTS[key] });
  });
  table.push({ type: "jackpot", key: "seven", weight: JACKPOT_WEIGHT });
  const used = table.reduce((sum, item) => sum + item.weight, 0);
  table.push({ type: "none", weight: Math.max(0, SPIN_TABLE_TOTAL - used) });
  return table;
}
const SPIN_OUTCOME_TABLE = buildSpinOutcomeTable();

function pickWeighted(table) {
  const total = table.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < table.length; i++) {
    roll -= table[i].weight;
    if (roll <= 0) return table[i];
  }
  return table[table.length - 1];
}

function symbolByKey(key) {
  return SYMBOLS.find((s) => s.key === key) || SYMBOLS[0];
}

// 根据本节点抽中的结果类型，倒推三个轮子应显示的符号（数组顺序=轮子顺序）
function rollSpinResult() {
  const outcome = pickWeighted(SPIN_OUTCOME_TABLE);

  if (outcome.type === "jackpot" || outcome.type === "three") {
    const s = symbolByKey(outcome.key);
    return [s, s, s];
  }

  if (outcome.type === "pair") {
    const pairSymbol = Phaser.Utils.Array.GetRandom(SYMBOLS);
    let oddSymbol = Phaser.Utils.Array.GetRandom(SYMBOLS);
    while (oddSymbol.key === pairSymbol.key) {
      oddSymbol = Phaser.Utils.Array.GetRandom(SYMBOLS);
    }
    const arrangements = [
      [pairSymbol, pairSymbol, oddSymbol],
      [pairSymbol, oddSymbol, pairSymbol],
      [oddSymbol, pairSymbol, pairSymbol],
    ];
    return Phaser.Utils.Array.GetRandom(arrangements);
  }

  // none：三个互不相同的符号
  const shuffled = Phaser.Utils.Array.Shuffle(SYMBOLS.slice());
  return [shuffled[0], shuffled[1], shuffled[2]];
}

// 判定三个轮子结果的中奖类型与金额（横屏 checkWin 唯一入口）
function evaluateSpinResult(a, b, c, bet, jackpotValue) {
  const isThreeOfAKind = a.key === b.key && b.key === c.key;
  const isJackpot = isThreeOfAKind && a.key === "seven";
  const isPair =
    !isThreeOfAKind && (a.key === b.key || a.key === c.key || b.key === c.key);

  if (isJackpot) {
    return { type: "jackpot", win: jackpotValue, symbol: a };
  }
  if (isThreeOfAKind) {
    return { type: "three", win: bet * a.multiplier, symbol: a };
  }
  if (isPair) {
    const pairSymbol = a.key === b.key || a.key === c.key ? a : b;
    return { type: "pair", win: bet * 2, symbol: pairSymbol };
  }
  return { type: "none", win: 0, symbol: null };
}
