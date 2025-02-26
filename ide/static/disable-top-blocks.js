(function() {
    // Define isOrphan function
    function isOrphan(block) {
      const parent = block.getParent();
      if (parent && isOrphan(parent)) {
        return true;
      }
      return !parent && !!(block.outputConnection || block.previousConnection);
    }
  
    // DisableTopBlocks Plugin
    function DisableTopBlocks(workspace) {
      this.workspace = workspace;
      this.oldPreconditionFn = null;
    }
  
    // Initialize the plugin
    DisableTopBlocks.prototype.init = function() {
      const disableMenuItem = Blockly.ContextMenuRegistry.registry.getItem('blockDisable');
      if (!disableMenuItem) {
        console.warn("DisableTopBlocks: Context menu item 'blockDisable' not found.");
        return;
      }
  
      this.oldPreconditionFn = disableMenuItem.preconditionFn;
  
      // Override the context menu disable option
      disableMenuItem.preconditionFn = (scope) => {
        const block = scope.block;
        if (!block.isInFlyout && block.workspace.options.disable && block.isEditable()) {
          if (block.getInheritedDisabled() || isOrphan(block)) {
            // Explicitly disable the block
            block.setEnabled(false);  // 변경된 메서드
            return 'disabled';
          }
          return 'enabled';
        }
        return 'hidden';
      };
  
      // Disable orphan blocks on workspace change
      this.workspace.addChangeListener(() => {
        const blocks = this.workspace.getAllBlocks();
        blocks.forEach((block) => {
          if (isOrphan(block)) {
            block.setEnabled(false);  // 변경된 메서드
          } else {
            block.setEnabled(true);  // 활성화
          }
        });
      });
    };
  
    // Restore original functionality
    DisableTopBlocks.prototype.dispose = function() {
      const disableMenuItem = Blockly.ContextMenuRegistry.registry.getItem('blockDisable');
      if (disableMenuItem) {
        disableMenuItem.preconditionFn = this.oldPreconditionFn;
      }
    };
  
    // Export the plugin and isOrphan function as global variables
    window.DisableTopBlocks = DisableTopBlocks;
    window.isOrphan = isOrphan;
  })();
  