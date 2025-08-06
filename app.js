
class GridLayoutApplet {
    constructor() {
        this.items = [];
        this.columnCount = 4;
        this.itemCount = 6;
        this.packingAlgorithm = null;
        this.initializeEventListeners();
        this.displayWelcomeMessage();
    }

    initializeEventListeners() {
        const columnSlider = document.getElementById('columnSlider');
        const itemSlider = document.getElementById('itemSlider');
        const columnValue = document.getElementById('columnValue');
        const itemValue = document.getElementById('itemValue');

        columnSlider.addEventListener('input', (e) => {
            this.columnCount = parseInt(e.target.value);
            columnValue.textContent = this.columnCount;
            this.packingAlgorithm = new PackingAlgorithm(this.columnCount);
            if (this.items.length > 0) {
                this.displayGrid();
            }
        });

        itemSlider.addEventListener('input', (e) => {
            this.itemCount = parseInt(e.target.value);
            itemValue.textContent = this.itemCount;
        });

        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateGrid();
        });

        document.getElementById('packBtn').addEventListener('click', () => {
            this.packItems();
        });

        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shuffleItems();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearGrid();
        });
    }

    displayWelcomeMessage() {
        const gridDisplay = document.getElementById('gridDisplay');
        gridDisplay.innerHTML = '<div class="empty-state">Adjust sliders and click "Generate Grid" to start!</div>';
    }

    generateGrid() {
        this.items = [];
        this.packingAlgorithm = new PackingAlgorithm(this.columnCount);
        
        for (let i = 0; i < this.itemCount; i++) {
            const maxColspan = Math.min(3, this.columnCount);
            const colspan = _.random(1, maxColspan);
            const maxStartCol = this.columnCount - colspan + 1;
            const startCol = _.random(1, maxStartCol);
            
            this.items.push({
                id: i + 1,
                startcol: startCol,
                colspan: colspan,
                startRow: i,
            });
        }
        
        this.displayGrid();
        this.displayItemData();
    }

    packItems() {
        if (this.items.length === 0) {
            this.showMessage('No items to pack. Generate a grid first!');
            return;
        }
        
        if (!this.packingAlgorithm) {
            this.packingAlgorithm = new PackingAlgorithm(this.columnCount);
        }
        
        const originalItems = [...this.items];
        
        // Run packing algorithm immediately without animation
        this.items = this.packingAlgorithm.packItems(this.items);
        
        this.displayGrid();
        this.displayPackingResults(originalItems, this.items);
    }

    shuffleItems() {
        if (this.items.length === 0) {
            this.showMessage('No items to shuffle. Generate a grid first!');
            return;
        }
        
        this.items = _.shuffle(this.items);
        this.displayGrid();
        this.displayItemData();
    }

    clearGrid() {
        this.items = [];
        document.getElementById('gridDisplay').innerHTML = '<div class="empty-state">Grid cleared. Generate a new grid to continue.</div>';
        document.getElementById('dataDisplay').style.display = 'none';
    }


    displayGrid() {
        const gridDisplay = document.getElementById('gridDisplay');
        gridDisplay.style.gridTemplateColumns = `repeat(${this.columnCount}, 1fr)`;
        
        const rowCount = this.getMaxRow() + 1;
        gridDisplay.style.gridTemplateRows = `repeat(${rowCount}, minmax(97px, auto))`;
        
        let gridHtml = '';
        
        this.items.forEach((item, index) => {
            const row = item.row !== undefined ? item.row + 1 : index + 1;
            const itemElement = `
                <div class="grid-item" 
                     data-item-id="${item.id}"
                     style="grid-column: ${item.startcol} / span ${item.colspan}; grid-row: ${row};">
                    <div>
                        <strong>Item ${item.id}</strong><br>
                        Row: ${row}, Col: ${item.startcol}<br>
                        Span: ${item.colspan}
                    </div>
                </div>
            `;
            gridHtml += itemElement;
        });
        
        gridDisplay.innerHTML = gridHtml;
    }

    getMaxRow() {
        if (this.items.length === 0) return 0;
        return Math.max(...this.items.map(item => item.row !== undefined ? item.row : this.items.indexOf(item)));
    }

    displayItemData() {
        const dataDisplay = document.getElementById('dataDisplay');
        
        const stats = this.calculateStats();
        const itemsJson = JSON.stringify(this.items, null, 2);
        
        const html = `
<strong>Grid Configuration:</strong>
Columns: ${this.columnCount}
Items: ${this.itemCount}

<strong>Item Statistics (using Lodash):</strong>
Total items: ${stats.totalItems}
Average colspan: ${stats.avgColspan}
Most common colspan: ${stats.mostCommonColspan}
Items by colspan: ${JSON.stringify(stats.itemsByColspan)}
Max start column: ${stats.maxStartCol}
Min start column: ${stats.minStartCol}

<strong>Items Array:</strong>
${itemsJson}
        `;
        
        dataDisplay.innerHTML = html;
        dataDisplay.style.display = 'block';
    }

    displayPackingResults(originalItems, packedItems) {
        const dataDisplay = document.getElementById('dataDisplay');
        
        if (!this.packingAlgorithm) return;
        
        const analysisResults = this.packingAlgorithm.analyzePackingResults(originalItems, packedItems);
        const stats = this.calculateStats();
        const itemsJson = JSON.stringify(this.items, null, 2);
        
        const html = `
<strong>Grid Configuration:</strong>
Columns: ${this.columnCount}
Items: ${this.itemCount}

<strong>Packing Results:</strong>
Original rows: ${analysisResults.originalRows}
Packed rows: ${analysisResults.packedRows}
Rows reduced: ${analysisResults.rowsReduced}
Original density: ${analysisResults.originalDensity}%
Packed density: ${analysisResults.packedDensity}%
Density improvement: ${analysisResults.densityImprovement > 0 ? '+' : ''}${analysisResults.densityImprovement}%
Swaps performed: ${analysisResults.swapsPerformed}

<strong>Item Statistics (using Lodash):</strong>
Total items: ${stats.totalItems}
Average colspan: ${stats.avgColspan}
Most common colspan: ${stats.mostCommonColspan}
Items by colspan: ${JSON.stringify(stats.itemsByColspan)}
Max start column: ${stats.maxStartCol}
Min start column: ${stats.minStartCol}

<strong>Packed Items Array:</strong>
${itemsJson}
        `;
        
        dataDisplay.innerHTML = html;
        dataDisplay.style.display = 'block';
    }

    calculateStats() {
        const colspans = _.map(this.items, 'colspan');
        const startCols = _.map(this.items, 'startcol');
        const itemsByColspan = _.countBy(this.items, 'colspan');
        const mostCommonColspan = _.maxBy(_.keys(itemsByColspan), key => itemsByColspan[key]);
        
        return {
            totalItems: this.items.length,
            avgColspan: _.round(_.mean(colspans), 2),
            mostCommonColspan: parseInt(mostCommonColspan),
            itemsByColspan: itemsByColspan,
            maxStartCol: _.max(startCols),
            minStartCol: _.min(startCols)
        };
    }

    showMessage(message) {
        const gridDisplay = document.getElementById('gridDisplay');
        gridDisplay.innerHTML = `<div class="empty-state">${message}</div>`;
        
        setTimeout(() => {
            if (this.items.length === 0) {
                this.displayWelcomeMessage();
            }
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GridLayoutApplet();
});