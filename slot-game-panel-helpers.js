/* 万锦老虎机 - 自动拆分自单文件版 */

        SlotGame.prototype.createLuxuryBackground = function() {
          // 已按需求移除全部背景（渐变 / 高光 / 拉丝纹理 / 暗角 / 噪点），
          // 画面背景现在完全由 Phaser 游戏配置的 backgroundColor 承担。
        };


        SlotGame.prototype.createPanel = function(x, y, width, height, fill = UI.panel, alpha = 0.96, hideGroup = null, scaleGroup = null) {
          // 不使用玻璃/透视效果：面板改为完全不透明的实色层。
          const outer = this.add
            .rectangle(x, y, width + 6, height + 6, UI.goldDim, 1)
            .setStrokeStyle(1, UI.goldDim);

          const panel = this.add
            .rectangle(x, y, width, height, fill, 1)
            .setStrokeStyle(1, UI.gold);

          const lineTop = this.add
            .rectangle(x, y - height / 2 + 2, width - 14, 1, UI.champagne, 1)
            .setOrigin(0.5);

          const lineBottom = this.add
            .rectangle(x, y + height / 2 - 2, width - 14, 1, 0x050706, 1)
            .setOrigin(0.5);

          if (hideGroup) hideGroup.push(outer, panel, lineTop, lineBottom);
          if (scaleGroup) scaleGroup.add([outer, panel, lineTop, lineBottom]);

          return panel;
        };


        SlotGame.prototype.setControlActive = function(bg, txt, active) {
          if (active) {
            bg.setFillStyle(UI.activeFill);
            txt.setColor(UI.textDark);
          } else {
            bg.setFillStyle(UI.panelDeep);
            txt.setColor(UI.cream);
          }
        };

