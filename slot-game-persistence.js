/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.loadGameState = function() {
          try {
            if (typeof window === "undefined" || !window.localStorage) return;
            const raw = window.localStorage.getItem("wanjin_slot_save");
            if (!raw) return;

            const saved = JSON.parse(raw);
            if (typeof saved.balance === "number") this.balance = Math.round(saved.balance);
            if (typeof saved.bet === "number") this.bet = Math.round(saved.bet);
            if (typeof saved.jackpotValue === "number")
              this.jackpotValue = Math.round(saved.jackpotValue);
            if (typeof saved.lastWin === "number") this.lastWin = Math.round(saved.lastWin);
            if (saved.mode === "NORMAL" || saved.mode === "FAST") this.mode = saved.mode;
            if (typeof saved.sfxEnabled === "boolean") this.sfx.enabled = saved.sfxEnabled;
          } catch (err) {
            // 没有存档、存档损坏，或浏览器禁用了 localStorage：忽略，使用默认初始值
          }
        };


        SlotGame.prototype.saveGameState = function() {
          try {
            if (typeof window === "undefined" || !window.localStorage) return;
            const payload = JSON.stringify({
              balance: Math.round(this.balance),
              bet: Math.round(this.bet),
              jackpotValue: Math.round(this.jackpotValue),
              lastWin: Math.round(this.lastWin),
              mode: this.mode,
              sfxEnabled: !!this.sfx.enabled,
              // 音乐状态同步写入，便于恢复
              musicEnabled: !!bgMusic.enabled,
              musicPlayMode: bgMusic.playMode,
              musicCurrentNum: bgMusic.currentNum,
            });
            window.localStorage.setItem("wanjin_slot_save", payload);
            localStorage.setItem("bgMusicEnabled", String(!!bgMusic.enabled));
            localStorage.setItem("bgMusicPlayMode", bgMusic.playMode || "order");
            localStorage.setItem("bgMusicCurrentNum", String(bgMusic.currentNum || 1));
          } catch (err) {
            // 存储空间已满或浏览器禁用了 localStorage：静默忽略，不影响游戏运行
          }
        };

