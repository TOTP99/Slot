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

