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

    async packItems() {
        if (this.items.length === 0) {
            this.showMessage('No items to pack. Generate a grid first!');
            return;
        }
        
        if (!this.packingAlgorithm) {
            this.packingAlgorithm = new PackingAlgorithm(this.columnCount);
        }
        
        this.setButtonsEnabled(false);
        const originalItems = [...this.items];
        
        await this.animatePackingAlgorithm();

        this.displayPackingResults(originalItems, this.items);
        this.setButtonsEnabled(true);
    }

    async animatePackingAlgorithm() {
        // Initialize items with their original row positions
        const packedItems = this.items.map((item, index) => ({
            ...item,
            row: index
        }));
        
        this.items = packedItems;
        this.displayGrid();
        
        // Wait a moment to show initial state
        await this.delay(500);
        
        // Part 1: Process items in queue, adding swapped items back to queue
        const queue = [...packedItems];
        let processedCount = 0;
        
        while (queue.length > 0) {
            const currentItem = queue.shift();
            processedCount++;
            
            // Show queue status periodically
            // if (processedCount % 5 === 0 && queue.length > 0) {
            //     this.showMessage(`Part 1: Processing item ${processedCount}, ${queue.length} items remaining in queue...`);
            //     await this.delay(600);
            //     this.displayGrid();
            // }
            
            // Highlight the current item being processed
            await this.highlightItem(currentItem);
            
            let itemMoved = false;
            
            for (let targetRow = 0; targetRow < currentItem.row; targetRow++) {
                // Check if there's matching empty space
                if (this.packingAlgorithm.hasMatchingEmptySpace(currentItem, packedItems, targetRow)) {
                    await this.animateItemMove(currentItem, targetRow);
                    itemMoved = true;
                    break;
                }
                
                // Check for smaller items to swap with
                const swapCandidate = this.packingAlgorithm.findSmallerItemToSwap(currentItem, packedItems, targetRow);
                if (swapCandidate) {
                    await this.animateItemSwap(currentItem, swapCandidate);
                    // Add the swapped item back to the queue for re-processing
                    queue.push(swapCandidate);
                    itemMoved = true;
                    break;
                }
            }
            
            // Remove highlight and add small delay if item didn't move
            await this.removeHighlight(currentItem);
            if (!itemMoved) {
                await this.delay(200); // Brief pause to show this item was processed but couldn't move
            }
        }
        
        // Sort rows by density with animation
        await this.animateRowSorting(packedItems);
    }

    async animateItemMove(item, newRow) {
        const oldRow = item.row;
        const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
        if (!itemElement) return;
        
        itemElement.classList.add('animating');
        
        // Calculate distance using the known row height (97px + 8px gap = 105px)
        const rowHeight = 105;
        const distance = (newRow - oldRow) * rowHeight;
        
        // Apply the transform
        itemElement.style.transform = `translateY(${distance}px)`;
        
        // Wait for animation to complete
        await this.delay(200);
        
        // Update the item's row
        item.row = newRow;
        
        // Remove transform and animating class
        itemElement.style.transform = '';
        itemElement.classList.remove('animating');
        
        // Redisplay grid with new positions
        this.displayGrid();
        
        // Small delay between moves
        await this.delay(200);
    }

    async animateItemSwap(itemA, itemB) {
        const itemAElement = document.querySelector(`[data-item-id="${itemA.id}"]`);
        const itemBElement = document.querySelector(`[data-item-id="${itemB.id}"]`);
        
        if (!itemAElement || !itemBElement) return;
        
        // Add animating classes
        itemAElement.classList.add('animating');
        itemBElement.classList.add('animating');
        
        // Calculate distances using known row height
        const rowHeight = 105;
        const distanceA = (itemB.row - itemA.row) * rowHeight;
        const distanceB = (itemA.row - itemB.row) * rowHeight;
        
        // Apply transforms
        itemAElement.style.transform = `translateY(${distanceA}px)`;
        itemBElement.style.transform = `translateY(${distanceB}px)`;
        
        // Wait for animation to complete
        await this.delay(200);
        
        // Swap the row values
        [itemA.row, itemB.row] = [itemB.row, itemA.row];
        
        // Remove transforms and animating classes
        itemAElement.style.transform = '';
        itemBElement.style.transform = '';
        itemAElement.classList.remove('animating');
        itemBElement.classList.remove('animating');
        
        this.displayGrid();
        
        // Small delay between moves
        await this.delay(200);
    }

    async animateRowSorting(items) {
        const sortedItems = this.packingAlgorithm.sortItemsByRowDensity(items);
        
        // Only animate if the order actually changed
        const hasChanged = sortedItems.some((item, index) => 
            items.find(i => i.id === item.id).row !== item.row
        );
        
        if (hasChanged) {
            // Store current positions before applying transforms
            const itemPositions = new Map();
            
            // Apply all transforms first using measured distances
            for (const sortedItem of sortedItems) {
                const originalItem = items.find(i => i.id === sortedItem.id);
                if (originalItem.row !== sortedItem.row) {
                    const itemElement = document.querySelector(`[data-item-id="${sortedItem.id}"]`);
                    if (itemElement) {
                        // Get current position
                        const currentRect = itemElement.getBoundingClientRect();
                        
                        // Temporarily update the grid to see target position
                        const originalRow = itemElement.style.gridRow;
                        itemElement.style.gridRow = sortedItem.row + 1;
                        
                        // Force layout and get target position
                        itemElement.offsetHeight;
                        const targetRect = itemElement.getBoundingClientRect();
                        
                        // Restore original position for animation
                        itemElement.style.gridRow = originalRow;
                        
                        // Calculate and apply transform
                        const distance = targetRect.top - currentRect.top;
                        itemElement.classList.add('animating');
                        itemElement.style.transform = `translateY(${distance}px)`;
                    }
                }
            }
            
            // Wait for animation
            await this.delay(200);
            
            // Clean up transforms and update items
            for (const item of sortedItems) {
                const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
                if (itemElement) {
                    itemElement.style.transform = '';
                    itemElement.classList.remove('animating');
                }
            }
            
            // Update items and redisplay
            this.items = sortedItems;
            this.displayGrid();
        }
    }

    async highlightItem(item) {
        const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
        if (itemElement) {
            itemElement.classList.add('processing');
            await this.delay(400); // Duration of highlight animation
        }
    }

    async removeHighlight(item) {
        const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
        if (itemElement) {
            itemElement.classList.remove('processing');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setButtonsEnabled(enabled) {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = !enabled;
            button.style.opacity = enabled ? '1' : '0.6';
            button.style.cursor = enabled ? 'pointer' : 'not-allowed';
        });
        
        const sliders = document.querySelectorAll('.slider');
        sliders.forEach(slider => {
            slider.disabled = !enabled;
            slider.style.opacity = enabled ? '1' : '0.6';
        });
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