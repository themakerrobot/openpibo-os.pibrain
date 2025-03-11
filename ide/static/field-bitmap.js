(function() {
    var Blockly = window.Blockly || {};
  
    Blockly.Msg['BUTTON_LABEL_RANDOMIZE'] = 'Randomize';
    Blockly.Msg['BUTTON_LABEL_CLEAR'] = 'Clear';
  
    const DEFAULT_PIXEL_COLOURS = {
        empty: '#fff',
        filled: '#363d80',
    };
  
    class FieldBitmap extends Blockly.Field {
        constructor(value, validator, config) {
            super(value, validator, config);
            this.SERIALIZABLE = true;
            this.EDITABLE = true;
            this.CURSOR = 'pointer';
            this.pixelColours = Object.assign({}, DEFAULT_PIXEL_COLOURS, config?.colours);
            this.imgHeight = config?.height || 8;
            this.imgWidth = config?.width || 8;
            this.setValue(this.getEmptyArray());
            this.initView();
        }
  
        static fromJson(options) {
            return new FieldBitmap(options.value ?? Blockly.Field.SKIP_SETUP, undefined, options);
        }
  
        getEmptyArray() {
            return Array.from({ length: this.imgHeight }, () => Array(this.imgWidth).fill(0));
        }
  
        initView() {
            this.updateSize_();
            if (!this.matrixPreview) {
                this.matrixPreview = Blockly.utils.dom.createSvgElement('svg', {
                    width: this.imgWidth * 10 + 10,
                    height: this.imgHeight * 10 + 10,
                });
                if (this.fieldGroup_) {
                    this.fieldGroup_.appendChild(this.matrixPreview);
                } else {
                    setTimeout(() => {
                        if (this.fieldGroup_) {
                            this.fieldGroup_.appendChild(this.matrixPreview);
                        }
                    }, 100);
                }
            }
            this.updateMatrixPreview();
            
            const clickTarget = this.getClickTarget_() || (this.sourceBlock_ && this.sourceBlock_.getSvgRoot());
            if (clickTarget) {
                clickTarget.removeEventListener('click', this.showEditor_);
                clickTarget.addEventListener('click', () => this.showEditor_());
            }
        }
  
        updateSize_() {
            const padding = 7;
            const newWidth = this.imgWidth * 10 + padding * 2;
            const newHeight = this.imgHeight * 10 + padding * 2;
            this.size_.width = newWidth;
            this.size_.height = newHeight;
            if (this.borderRect_) {
                this.borderRect_.setAttribute('width', String(newWidth));
                this.borderRect_.setAttribute('height', String(newHeight));
            }
        }
  
        showEditor_() {
            const dropDownDiv = Blockly.DropDownDiv.getContentDiv();
            while (dropDownDiv.firstChild) {
                dropDownDiv.removeChild(dropDownDiv.firstChild);
            }
  
            const container = document.createElement('div');
            container.style.display = 'grid';
            container.style.gridTemplateColumns = `repeat(${this.imgWidth}, 20px)`;
            container.style.background = '#ddd';
            container.style.padding = '10px';
            
            let matrix = this.getValue();
            let cells = [];
  
            for (let y = 0; y < this.imgHeight; y++) {
                for (let x = 0; x < this.imgWidth; x++) {
                    let cell = document.createElement('div');
                    cell.style.width = '20px';
                    cell.style.height = '20px';
                    cell.style.border = '1px solid black';
                    cell.style.backgroundColor = matrix[y][x] ? this.pixelColours.filled : this.pixelColours.empty;
  
                    cell.onclick = () => {
                        matrix[y][x] = matrix[y][x] ? 0 : 1;
                        cell.style.backgroundColor = matrix[y][x] ? this.pixelColours.filled : this.pixelColours.empty;
                        this.setValue(matrix);
                        this.updateMatrixPreview();
                    };
  
                    container.appendChild(cell);
                    cells.push(cell);
                }
            }
            dropDownDiv.appendChild(container);
            Blockly.DropDownDiv.showPositionedByField(this, () => {
                dropDownDiv.removeChild(container);
            });
        }
  
        updateMatrixPreview() {
            const padding = 7;
            const borderOffset = 2;
            this.matrixPreview.setAttribute('width', this.imgWidth * 10 + padding * 2 + borderOffset);
            this.matrixPreview.setAttribute('height', this.imgHeight * 10 + padding * 2 + borderOffset);
            
            while (this.matrixPreview.firstChild) {
                this.matrixPreview.removeChild(this.matrixPreview.firstChild);
            }
            for (let y = 0; y < this.imgHeight; y++) {
                for (let x = 0; x < this.imgWidth; x++) {
                    Blockly.utils.dom.createSvgElement('rect', {
                        x: x * 10 + padding,
                        y: y * 10 + padding,
                        width: 10,
                        height: 10,
                        fill: this.getValue()[y][x] ? this.pixelColours.filled : this.pixelColours.empty,
                        stroke: '#000',
                        'stroke-width': 0.5,
                    }, this.matrixPreview);
                }
            }
        }
    }
  
    Blockly.fieldRegistry.register('field_bitmap', FieldBitmap);
    window.FieldBitmap = FieldBitmap;
  })();
  