
class GridLayoutApplet {
    constructor() {
        this.items = [];
        this.columnCount = 4;
        this.itemCount = 6;
        this.packingAlgorithm = null;
        
        // Drag state
        this.dragState = {
            isDragging: false,
            draggedItem: null,
            draggedElement: null,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0,
            dragPreview: null
        };
        
        this.initializeEventListeners();
        this.displayWelcomeMessage();
        this.updateFormOptions();
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
            this.updateFormOptions();
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

        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.addNewItem();
        });

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Global touch events for mobile dragging
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
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
                    <div class="item-controls">
                        <button class="item-control-btn delete-btn" onclick="app.deleteItem(${item.id})" title="Delete item">×</button>
                        <button class="item-control-btn move-btn" onclick="app.startMoveItem(${item.id})" title="Move item">↔</button>
                    </div>
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
        
        // Add drag event listeners to each grid item
        this.items.forEach((item) => {
            const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
            if (itemElement) {
                itemElement.addEventListener('mousedown', (e) => this.handleMouseDown(e, item));
                itemElement.addEventListener('touchstart', (e) => this.handleTouchStart(e, item), { passive: false });
            }
        });
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

    // Interactive item management methods
    deleteItem(itemId) {
        this.items = this.items.filter(item => item.id !== itemId);
        if (this.items.length === 0) {
            this.displayWelcomeMessage();
        } else {
            this.displayGrid();
            this.displayItemData();
        }
    }

    addNewItem() {
        const startCol = parseInt(document.getElementById('newItemCol').value);
        const colspan = parseInt(document.getElementById('newItemSpan').value);
        const targetRow = parseInt(document.getElementById('newItemRow').value) - 1; // Convert to 0-based

        // Validate that item fits within grid columns
        if (startCol + colspan - 1 > this.columnCount) {
            alert(`Item doesn't fit! Max start column for span ${colspan} is ${this.columnCount - colspan + 1}`);
            return;
        }

        // Generate new unique ID
        const existingIds = this.items.map(item => item.id);
        const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

        const newItem = {
            id: newId,
            startcol: startCol,
            colspan: colspan,
            row: targetRow
        };

        this.items.push(newItem);
        this.displayGrid();
        this.displayItemData();
        
        // Reset form
        document.getElementById('newItemRow').value = 1;
    }

    startMoveItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        const newStartCol = prompt(`Move item ${itemId}:\nCurrent: Row ${(item.row || 0) + 1}, Col ${item.startcol}\n\nEnter new start column (1-${this.columnCount - item.colspan + 1}):`, item.startcol);
        if (newStartCol === null) return; // User cancelled

        const startCol = parseInt(newStartCol);
        if (isNaN(startCol) || startCol < 1 || startCol + item.colspan - 1 > this.columnCount) {
            alert(`Invalid column! Must be between 1 and ${this.columnCount - item.colspan + 1}`);
            return;
        }

        const newRow = prompt(`Enter new row (1-${this.getMaxRow() + 2}):`, (item.row || 0) + 1);
        if (newRow === null) return; // User cancelled

        const row = parseInt(newRow) - 1; // Convert to 0-based
        if (isNaN(row) || row < 0) {
            alert('Invalid row! Must be 1 or greater');
            return;
        }

        // Update item position
        item.startcol = startCol;
        item.row = row;

        // Auto-pack items after moving
        if (!this.packingAlgorithm) {
            this.packingAlgorithm = new PackingAlgorithm(this.columnCount);
        }
        
        // Run packing algorithm
        this.items = this.packingAlgorithm.packItems(this.items);

        this.displayGrid();
        this.displayItemData();
    }

    updateFormOptions() {
        // Update column options based on current column count
        const colSelect = document.getElementById('newItemCol');
        colSelect.innerHTML = '';
        for (let i = 1; i <= this.columnCount; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            colSelect.appendChild(option);
        }

        // Update colspan options
        const spanSelect = document.getElementById('newItemSpan');
        const currentSpan = parseInt(spanSelect.value) || 1;
        spanSelect.innerHTML = '';
        const maxSpan = Math.min(3, this.columnCount);
        for (let i = 1; i <= maxSpan; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentSpan && i <= maxSpan) {
                option.selected = true;
            }
            spanSelect.appendChild(option);
        }

        // Update max row suggestion
        const maxRow = this.getMaxRow() + 1;
        document.getElementById('newItemRow').max = maxRow + 5; // Allow adding rows beyond current max
    }

    // Drag and drop functionality
    handleMouseDown(e, item) {
        // Don't start drag if clicking on control buttons
        if (e.target.classList.contains('item-control-btn')) {
            return;
        }

        e.preventDefault();
        this.startDrag(e, item, e.clientX, e.clientY);
    }

    handleTouchStart(e, item) {
        // Don't start drag if touching control buttons
        if (e.target.classList.contains('item-control-btn')) {
            return;
        }

        e.preventDefault();
        const touch = e.touches[0];
        this.startDrag(e, item, touch.clientX, touch.clientY);
    }

    startDrag(e, item, clientX, clientY) {
        const itemElement = e.currentTarget;
        const rect = itemElement.getBoundingClientRect();
        
        this.dragState = {
            isDragging: true,
            draggedItem: item,
            draggedElement: itemElement,
            startX: clientX,
            startY: clientY,
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top,
            dragPreview: null
        };
        
        itemElement.classList.add('dragging');
        this.createDragPreview(itemElement, clientX, clientY);
    }

    handleMouseMove(e) {
        if (!this.dragState.isDragging) return;
        e.preventDefault();
        this.updateDrag(e.clientX, e.clientY);
    }

    handleTouchMove(e) {
        if (!this.dragState.isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.updateDrag(touch.clientX, touch.clientY);
    }

    handleMouseUp(e) {
        if (!this.dragState.isDragging) return;
        e.preventDefault();
        this.endDrag(e.clientX, e.clientY);
    }

    handleTouchEnd(e) {
        if (!this.dragState.isDragging) return;
        e.preventDefault();
        // Use the last known position from changedTouches
        const touch = e.changedTouches[0];
        this.endDrag(touch.clientX, touch.clientY);
    }

    updateDrag(clientX, clientY) {
        // Update drag preview position
        if (this.dragState.dragPreview) {
            this.dragState.dragPreview.style.left = (clientX - this.dragState.offsetX) + 'px';
            this.dragState.dragPreview.style.top = (clientY - this.dragState.offsetY) + 'px';
        }
        
        // Calculate which grid cell we're over
        this.updateDropTargets(clientX, clientY);
    }

    endDrag(clientX, clientY) {
        // Calculate drop position
        const dropPosition = this.calculateDropPosition(clientX, clientY);
        
        // Clean up drag state
        this.cleanupDrag();
        
        // Move item if valid drop position
        if (dropPosition && this.isValidDrop(dropPosition)) {
            this.moveItemToPosition(this.dragState.draggedItem, dropPosition);
        }
        
        this.resetDragState();
    }

    createDragPreview(originalElement, clientX, clientY) {
        const preview = originalElement.cloneNode(true);
        preview.classList.add('drag-preview');
        preview.classList.remove('dragging');
        preview.style.left = (clientX - this.dragState.offsetX) + 'px';
        preview.style.top = (clientY - this.dragState.offsetY) + 'px';
        preview.style.width = originalElement.offsetWidth + 'px';
        preview.style.height = originalElement.offsetHeight + 'px';
        
        document.body.appendChild(preview);
        this.dragState.dragPreview = preview;
    }

    updateDropTargets(clientX, clientY) {
        // Clear existing drop targets
        document.querySelectorAll('.drop-target, .invalid-drop').forEach(el => {
            el.classList.remove('drop-target', 'invalid-drop');
        });
        
        const dropPosition = this.calculateDropPosition(clientX, clientY);
        if (!dropPosition) return;
        
        // Show visual feedback for drop position
        const cellRect = this.getGridCellRect(dropPosition.col, dropPosition.row);
        
        if (cellRect && this.isValidDrop(dropPosition)) {
            // Create a temporary visual indicator for valid drop
            this.showDropIndicator(cellRect, true);
        } else if (cellRect) {
            // Show invalid drop indicator
            this.showDropIndicator(cellRect, false);
        }
    }

    calculateDropPosition(clientX, clientY) {
        const gridDisplay = document.getElementById('gridDisplay');
        const gridRect = gridDisplay.getBoundingClientRect();
        
        if (clientX < gridRect.left || clientX > gridRect.right || 
            clientY < gridRect.top || clientY > gridRect.bottom) {
            return null;
        }
        
        // Calculate column - account for grid gap (12px)
        const relativeX = clientX - gridRect.left;
        const totalGapWidth = 12 * (this.columnCount - 1); // gaps between columns
        const availableWidth = gridRect.width - totalGapWidth;
        const columnWidth = availableWidth / this.columnCount;
        
        let col = 1;
        let currentX = 0;
        for (let i = 1; i <= this.columnCount; i++) {
            const columnEnd = currentX + columnWidth;
            if (relativeX >= currentX && relativeX <= columnEnd) {
                col = i;
                break;
            }
            currentX = columnEnd + 12; // Add gap
        }
        
        // Calculate row - account for grid gap (12px)
        const relativeY = clientY - gridRect.top;
        const rowHeight = 97; // Base item height
        const rowGap = 12;
        const totalRowHeight = rowHeight + rowGap;
        const row = Math.max(0, Math.floor(relativeY / totalRowHeight));
        
        return { col, row };
    }

    getGridCellRect(col, row) {
        const gridDisplay = document.getElementById('gridDisplay');
        const gridRect = gridDisplay.getBoundingClientRect();
        
        // Calculate exact position matching CSS Grid layout
        const totalGapWidth = 12 * (this.columnCount - 1);
        const availableWidth = gridRect.width - totalGapWidth;
        const columnWidth = availableWidth / this.columnCount;
        
        // Calculate left position
        let left = gridRect.left;
        for (let i = 1; i < col; i++) {
            left += columnWidth + 12; // Add column width + gap
        }
        
        // Calculate top position
        const rowHeight = 97;
        const rowGap = 12;
        const top = gridRect.top + row * (rowHeight + rowGap);
        
        // Calculate width for the item's colspan
        const itemWidth = columnWidth * this.dragState.draggedItem.colspan + 
                         12 * (this.dragState.draggedItem.colspan - 1); // Add gaps between spanned columns
        
        return {
            left: left,
            top: top,
            width: itemWidth,
            height: rowHeight
        };
    }

    showDropIndicator(rect, isValid) {
        // Remove existing indicator
        const existing = document.querySelector('.drop-indicator');
        if (existing) existing.remove();
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.style.position = 'fixed';
        indicator.style.left = rect.left + 'px';
        indicator.style.top = rect.top + 'px';
        indicator.style.width = rect.width + 'px';
        indicator.style.height = rect.height + 'px';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '999';
        indicator.style.borderRadius = '8px';
        
        if (isValid) {
            indicator.style.background = 'rgba(33, 150, 243, 0.2)';
            indicator.style.border = '2px dashed #2196f3';
        } else {
            indicator.style.background = 'rgba(244, 67, 54, 0.2)';
            indicator.style.border = '2px dashed #f44336';
        }
        
        document.body.appendChild(indicator);
    }

    isValidDrop(position) {
        if (!position) return false;
        
        const { col, row } = position;
        const item = this.dragState.draggedItem;
        
        // Check if item fits within grid boundaries
        if (col < 1 || col + item.colspan - 1 > this.columnCount) {
            return false;
        }
        
        if (row < 0) {
            return false;
        }
        
        return true;
    }

    moveItemToPosition(item, position) {
        item.startcol = position.col;
        item.row = position.row;
        
        // Auto-pack items after moving
        if (!this.packingAlgorithm) {
            this.packingAlgorithm = new PackingAlgorithm(this.columnCount);
        }
        
        // Run packing algorithm
        this.items = this.packingAlgorithm.packItems(this.items);
        
        this.displayGrid();
        this.displayItemData();
    }

    cleanupDrag() {
        // Remove drag preview
        if (this.dragState.dragPreview) {
            document.body.removeChild(this.dragState.dragPreview);
        }
        
        // Remove visual indicators
        document.querySelectorAll('.drop-target, .invalid-drop, .drop-indicator').forEach(el => {
            el.remove();
        });
        
        // Remove dragging class
        if (this.dragState.draggedElement) {
            this.dragState.draggedElement.classList.remove('dragging');
        }
    }

    resetDragState() {
        this.dragState = {
            isDragging: false,
            draggedItem: null,
            draggedElement: null,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0,
            dragPreview: null
        };
    }
}

// Global app instance for onclick handlers
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new GridLayoutApplet();
});