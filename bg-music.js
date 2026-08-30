/* ============================================================
 * 背景音乐播放器（BGMusic）
 * 依赖：无（原生 <audio> + Web Audio API），需在 slot-game.js /
 * phonograph.js 之前加载，二者都会读取全局单例 bgMusic。
 * ============================================================ */

// ---------- 背景音乐歌单清单 ----------
// 加歌方式：把 mp3 文件改名为 1.mp3、2.mp3 …按你想要的播放顺序编号，
// 放进和 index.html 同一个目录即可，以后无需再改这里的代码。
// 播放时按数字从小到大依次尝试；如果某个编号的文件缺失，会自动跳过找下一个，
// 直到编号 BG_MUSIC_MAX 结束后循环回到 1。
const BG_MUSIC_MAX = 99; // 支持的最大编号（对应 1.mp3 ~ 99.mp3），全部 99 首参与循环播放
const BG_MUSIC_BASE = "https://totp99.github.io/source/mp3/"; // mp3 取歌来源

class BGMusic {
  constructor() {
    this.currentNum = 1;
    this._skipAttempts = 0; // 连续跳过次数，防止全部文件缺失时死循环

    this.audio = new Audio();
    this.audio.loop = false; // 由 ended/error 事件控制切歌
    this.audio.preload = "auto";
    // 注意：不要设 crossOrigin=anonymous，本地/无 CORS 的 mp3 会被静音或加载失败
    this.audio.volume = 0.5; // 固定音量（无滑杆；iOS 上 <audio>.volume 仍受系统限制）

    const savedEnabled = localStorage.getItem("bgMusicEnabled");
    this.enabled = savedEnabled === null ? true : savedEnabled === "true"; // 默认开启

    const savedMode = localStorage.getItem("bgMusicPlayMode");
    const savedShuffleLegacy = localStorage.getItem("bgMusicShuffle") === "true";
    // order / shuffle / single / all
    let mode = savedMode || (savedShuffleLegacy ? "shuffle" : "order");
    if (mode !== "order" && mode !== "shuffle" && mode !== "single" && mode !== "all") {
      mode = "order";
    }
    this.playMode = mode;
    this.shuffle = this.playMode === "shuffle";

    const savedNum = parseInt(localStorage.getItem("bgMusicCurrentNum") || "1", 10);
    this.currentNum =
      Number.isFinite(savedNum) && savedNum >= 1 && savedNum <= BG_MUSIC_MAX
        ? savedNum
        : 1;

    // Web Audio 分析：频谱 → 均衡条（声高 / 情绪 / 男女声区 / 乐器频段）
    this.ctx = null;
    this.analyser = null;
    this._source = null;
    this._gain = null;
    this._freqData = null;
    this._connected = false;

    // 五频段平滑值：低音乐器 / 男声区 / 主旋律 / 女声区 / 高频空气
    this.bands = [0, 0, 0, 0, 0];
    this.energy = 0; // 整体响度 0~1
    this.brightness = 0; // 频谱重心偏高→亮/兴奋；偏低→暖/沉稳
    this.vocalBias = 0; // <0 偏男声区能量，>0 偏女声区
    this._playing = false;
    this._bandBins = null;
    this._analyserFailed = false;

    this.audio.addEventListener("ended", () => this._advance());
    this.audio.addEventListener("error", () => this._advance()); // 该编号文件缺失/加载失败，自动跳到下一个
    this.audio.addEventListener("playing", () => {
      this._skipAttempts = 0; // 成功播放后重置跳过计数
    });

    this._loadTrack(this.currentNum);
    this._setupMediaSession();
  }

  // 尽量让系统在切到其他 App/锁屏时仍显示媒体控件（真正关网页后无法继续播）
  _setupMediaSession() {
    try {
      if (!("mediaSession" in navigator)) return;
      const update = () => {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "TP音乐 · 第 " + this.currentNum + " 首",
          artist: "万锦老虎机",
          album: "Background",
        });
        navigator.mediaSession.playbackState = this.isPlaying()
          ? "playing"
          : "paused";
      };
      navigator.mediaSession.setActionHandler("play", () => {
        this.play();
        update();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        this.pause();
        update();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        this.skipPrev();
        update();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        this.skipNext();
        update();
      });
      this.audio.addEventListener("play", update);
      this.audio.addEventListener("pause", update);
      update();
    } catch (e) {}
  }

  // 须在用户手势中调用。成功则走 Web Audio 分析；失败则保持原生 <audio> 出声
  ensureAnalyser() {
    if (this._connected) {
      this._resumeCtx();
      return true;
    }
    if (this._analyserFailed) return false;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this._analyserFailed = true;
        return false;
      }
      if (!this.ctx) this.ctx = new AC();
      this._resumeCtx();
      if (!this.analyser) {
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.6;
        this._freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this._rebuildBandBins();
      }
      if (!this._source) {
        // 每个 <audio> 只能 createMediaElementSource 一次；之后必须经 destination 才能出声
        this._source = this.ctx.createMediaElementSource(this.audio);
        // 用一个 GainNode 兜底：暂停/切歌时先做几十毫秒淡出，避免直接截断波形产生"啪"的爆音
        this._gain = this.ctx.createGain();
        this._gain.gain.value = 1;
        this._source.connect(this.analyser);
        this._source.connect(this._gain);
        this._gain.connect(this.ctx.destination);
      }
      this._connected = true;
      return true;
    } catch (e) {
      // 接管失败：不破坏原生播放，频谱走伪数据
      this._analyserFailed = true;
      this._connected = false;
      return false;
    }
  }

  _resumeCtx() {
    if (this.ctx && this.ctx.state === "suspended") {
      const r = this.ctx.resume();
      if (r && typeof r.catch === "function") r.catch(() => {});
    }
  }

  _playAudio() {
    this._resumeCtx();
    try {
      const p = this.audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // 自动播放被拦截时不吞掉状态；下一次用户手势会再次尝试。
          this._playing = false;
        });
      }
    } catch (e) {
      this._playing = false;
    }
  }

  // 预计算 Hz→bin 区间，避免每帧 floor/ceil
  _rebuildBandBins() {
    if (!this.analyser || !this.ctx) return;
    const n = this.analyser.frequencyBinCount;
    const binHz = this.ctx.sampleRate / this.analyser.fftSize;
    // 低音/鼓 · 男声区 · 主旋律 · 女声区 · 高频空气
    const ranges = [
      [40, 120],
      [120, 320],
      [320, 1200],
      [1200, 4000],
      [4000, 12000],
    ];
    this._bandBins = ranges.map(([lo, hi]) => [
      Math.max(0, Math.floor(lo / binHz)),
      Math.min(n - 1, Math.ceil(hi / binHz)),
    ]);
  }

  // 由场景按 ~30fps 调用：频谱 → 5 条 + 情绪指标
  sampleSpectrum() {
    const playing =
      this.enabled &&
      this.audio &&
      !this.audio.paused &&
      !this.audio.ended &&
      this.audio.currentTime > 0;
    this._playing = playing;

    if (!playing) {
      for (let i = 0; i < 5; i++) this.bands[i] *= 0.88;
      this.energy *= 0.9;
      this.brightness *= 0.92;
      this.vocalBias *= 0.92;
      return this.bands;
    }

    if (this._connected && this.analyser && this._freqData) {
      this.analyser.getByteFrequencyData(this._freqData);
      const data = this._freqData;
      if (!this._bandBins) this._rebuildBandBins();
      const bins = this._bandBins;

      for (let b = 0; b < 5; b++) {
        const a = bins[b][0];
        const c = bins[b][1];
        let sum = 0;
        const count = c - a + 1;
        for (let i = a; i <= c; i++) sum += data[i];
        const avg = sum / count / 255;
        // 软曲线近似 pow(x,0.85)，避免 Math.pow
        let v = avg * 1.35;
        if (v > 1) v = 1;
        v = v * (0.85 + 0.15 * v);
        this.bands[b] = this.bands[b] * 0.55 + v * 0.45;
      }

      const e =
        (this.bands[0] +
          this.bands[1] +
          this.bands[2] +
          this.bands[3] +
          this.bands[4]) *
        0.2;
      this.energy = this.energy * 0.6 + e * 0.4;

      const bright =
        (this.bands[3] * 0.45 + this.bands[4] * 0.55) /
        (this.bands[0] * 0.5 + this.bands[1] * 0.3 + 0.15);
      this.brightness =
        this.brightness * 0.7 + (bright > 1.4 ? 1.4 : bright) * 0.3;

      this.vocalBias =
        this.vocalBias * 0.75 + (this.bands[3] - this.bands[1]) * 0.25;
    } else {
      // 无分析器：轻量伪频谱
      const t = performance.now() * 0.001;
      const pulse = 0.35 + 0.25 * Math.sin(t * 4.2);
      const raw0 = pulse * (0.7 + 0.3 * Math.sin(t * 2.1));
      const raw1 = pulse * (0.45 + 0.25 * Math.sin(t * 3.3 + 1));
      const raw2 = pulse * (0.55 + 0.3 * Math.sin(t * 5.1 + 2));
      const raw3 = pulse * (0.4 + 0.35 * Math.sin(t * 6.7 + 0.5));
      const raw4 = pulse * (0.3 + 0.4 * Math.sin(t * 8.9 + 1.2));
      this.bands[0] = this.bands[0] * 0.7 + raw0 * 0.3;
      this.bands[1] = this.bands[1] * 0.7 + raw1 * 0.3;
      this.bands[2] = this.bands[2] * 0.7 + raw2 * 0.3;
      this.bands[3] = this.bands[3] * 0.7 + raw3 * 0.3;
      this.bands[4] = this.bands[4] * 0.7 + raw4 * 0.3;
      this.energy = this.energy * 0.7 + pulse * 0.3;
      this.brightness = 0.5;
      this.vocalBias = 0;
    }

    return this.bands;
  }

  isPlaying() {
    // 以真实 audio 状态为准，避免仅依赖采样缓存导致 UI/逻辑误判
    try {
      return (
        !!this.enabled &&
        !!this.audio &&
        !this.audio.paused &&
        !this.audio.ended
      );
    } catch (e) {
      return !!this._playing;
    }
  }

  _loadTrack(num) {
    this.currentNum = num;
    try {
      localStorage.setItem("bgMusicCurrentNum", String(num));
    } catch (e) {}
    this.audio.src = new URL(`${num}.mp3`, BG_MUSIC_BASE).href;
    this.audio.loop = this.playMode === "single";
    this._notifyTrackChange();
  }

  // 曲目变化订阅：无论顺序切歌、随机切歌，还是播完自动切到下一首，
  // 只要 currentNum 改变就统一从这一处通知所有界面刷新，
  // 避免各处各自维护刷新时机、遗漏导致显示的编号和实际播放曲目不一致
  // （此前"随机播放时曲号显示错误"正是因为自动切歌 _advance() 未触发任何界面刷新）。
  onTrackChange(cb) {
    if (typeof cb !== "function") return;
    if (!this._trackChangeListeners) this._trackChangeListeners = [];
    this._trackChangeListeners.push(cb);
  }

  _notifyTrackChange() {
    if (!this._trackChangeListeners) return;
    for (const cb of this._trackChangeListeners) {
      try {
        cb(this.currentNum);
      } catch (e) {}
    }
  }

  // order: 顺序到尽头后停；all: 顺序循环；shuffle: 随机；single: 单曲循环
  _pickNext() {
    if (this.playMode === "single") {
      return this.currentNum;
    }
    if (this.playMode === "shuffle") {
      if (BG_MUSIC_MAX <= 1) return 1;
      let next;
      do {
        next = 1 + Math.floor(Math.random() * BG_MUSIC_MAX);
      } while (next === this.currentNum);
      return next;
    }
    // order / all
    return this.currentNum >= BG_MUSIC_MAX ? 1 : this.currentNum + 1;
  }

  _advance() {
    this._skipAttempts += 1;
    if (this._skipAttempts > BG_MUSIC_MAX) {
      // 连续跳过次数超过总编号数，说明目录里没有任何可用的 mp3，停止尝试避免死循环
      return;
    }
    if (this.playMode === "order" && this.currentNum >= BG_MUSIC_MAX) {
      // 顺序播放：播完最后一首后停止，不自动循环回第一首
      this._loadTrack(1);
      this.pause();
      return;
    }
    if (this.playMode === "single") {
      this.audio.currentTime = 0;
      if (this.enabled) this._playAudio();
      return;
    }
    this._loadTrack(this._pickNext());
    if (this.enabled) this._playAudio();
  }

  // mode: order / shuffle / single / all
  setPlayMode(mode) {
    if (
      mode !== "order" &&
      mode !== "shuffle" &&
      mode !== "single" &&
      mode !== "all"
    ) {
      mode = "order";
    }
    this.playMode = mode;
    this.shuffle = mode === "shuffle";
    this.audio.loop = mode === "single";
    localStorage.setItem("bgMusicPlayMode", mode);
    localStorage.setItem("bgMusicShuffle", String(this.shuffle));
  }

  skipNext() {
    this._skipAttempts = 0;
    this._loadTrack(this._pickNext());
    if (this.enabled) this._playAudio();
  }

  skipPrev() {
    this._skipAttempts = 0;
    let prev;
    if (this.shuffle) {
      prev = this._pickNext();
    } else {
      prev = this.currentNum <= 1 ? BG_MUSIC_MAX : this.currentNum - 1;
    }
    this._loadTrack(prev);
    if (this.enabled) this._playAudio();
  }

  // 显式播放（竖屏 ▶️ 键）
  async play() {
    if (!this.audio) return;
    this.ensureAnalyser();
    if (!this.enabled) {
      this.enabled = true;
      localStorage.setItem("bgMusicEnabled", "true");
    }
    this._fadeGainTo(1, 0.05);
    this._playAudio();
  }

  // 需在用户手势（点击/触摸/按键）中调用，否则浏览器会拦截自动播放
  async tryPlay() {
    if (!this.enabled) return;
    this.ensureAnalyser();
    this._fadeGainTo(1, 0.05);
    this._playAudio();
  }

  // 短暂线性淡入/淡出，避免音量突变（尤其是暂停瞬间）产生爆音/怪声
  _fadeGainTo(target, seconds) {
    if (!this._gain || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const g = this._gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(target, now + seconds);
    } catch (e) {}
  }

  pause() {
    if (this._gain && this.ctx && this.ctx.state === "running") {
      // 先淡出 60ms 再真正 pause()，避免直接截断波形产生"咔"的爆音
      this._fadeGainTo(0, 0.06);
      const audioEl = this.audio;
      const gain = this._gain;
      setTimeout(() => {
        try {
          audioEl.pause();
        } catch (e) {}
        // 淡出后立刻把音量拉回 1，供下次播放使用（此时已静音，不会有声音）
        try {
          gain.gain.cancelScheduledValues(this.ctx.currentTime);
          gain.gain.setValueAtTime(1, this.ctx.currentTime);
        } catch (e) {}
      }, 70);
      return;
    }
    try {
      this.audio.pause();
    } catch (e) {}
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem("bgMusicEnabled", String(enabled));
    if (enabled) {
      this.tryPlay();
    } else {
      this.pause();
    }
  }
}

const bgMusic = new BGMusic();
