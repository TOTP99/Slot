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

