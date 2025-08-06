class PackingAlgorithm {
    constructor(columnCount) {
        this.columnCount = columnCount;
    }

    packItems(items) {
        const packedItems = items.map((item, index) => ({ ...item, row: index }));
        
        const queue = [...packedItems];
        
        while (queue.length > 0) {
            const currentItem = queue.shift();
            
            let itemMoved = false;
            for (let targetRow = 0; targetRow < currentItem.row; targetRow++) {
                if (this.hasMatchingEmptySpace(currentItem, packedItems, targetRow)) {
                    currentItem.row = targetRow;
                    itemMoved = true;
                    break;
                }
                
                const swapCandidate = this.findSmallerItemToSwap(currentItem, packedItems, targetRow);
                if (swapCandidate) {
                    [currentItem.row, swapCandidate.row] = [swapCandidate.row, currentItem.row];
                    queue.push(swapCandidate);
                    itemMoved = true;
                    break;
                }
            }
        }
        
        return this.sortItemsByRowDensity(packedItems);
    }

    hasMatchingEmptySpace(item, allItems, targetRow) {
        const itemColumns = this.getItemColumns(item);
        const itemsInRow = _.filter(allItems, o => o.row === targetRow && o.id !== item.id);
        return !_.some(itemsInRow, o => this.columnsOverlap(itemColumns, this.getItemColumns(o)));
    }

    findSmallerItemToSwap(currentItem, allItems, targetRow) {
        const currentColumns = this.getItemColumns(currentItem);
        const itemsInRow = _.filter(allItems, o => o.row === targetRow && o.id !== currentItem.id);
        
        return _.find(itemsInRow, candidate => {
            if (candidate.colspan >= currentItem.colspan) return false;
            
            const candidateColumns = this.getItemColumns(candidate);
            if (!_.every(candidateColumns, col => currentColumns.includes(col))) return false;
            
            const otherItems = _.filter(itemsInRow, o => o.id !== candidate.id);
            return !_.some(otherItems, o => this.columnsOverlap(currentColumns, this.getItemColumns(o)));
        });
    }

    canItemFitInRow(item, allItems, targetRow) {
        const itemColumns = this.getItemColumns(item);
        const itemsInRow = _.filter(allItems, o => o.row === targetRow && o.id !== item.id);
        return !_.some(itemsInRow, o => this.columnsOverlap(itemColumns, this.getItemColumns(o)));
    }

    sortItemsByRowDensity(items) {
        const rowData = _.mapValues(_.groupBy(items, 'row'), rowItems => ({
            items: rowItems,
            occupiedColumns: new Set(_.flatten(_.map(rowItems, item => this.getItemColumns(item))))
        }));

        const sortedRows = _.sortBy(_.keys(rowData), rowKey => {
            const occupiedColumns = rowData[rowKey].occupiedColumns;
            const emptySpaces = this.columnCount - occupiedColumns.size;
            
            // Secondary sort: calculate leftmost fill score (lower is better = more left-filled)
            const leftmostFillScore = _.min([...occupiedColumns]) || this.columnCount;
            
            return [emptySpaces, leftmostFillScore];
        });

        return _.flatten(_.map(sortedRows, (oldRow, newRowIndex) => 
            _.map(rowData[oldRow].items, item => ({ ...item, row: newRowIndex }))
        ));
    }

    getItemColumns(item) {
        return _.range(item.startcol, item.startcol + item.colspan);
    }

    columnsOverlap(columnsA, columnsB) {
        return _.some(columnsA, col => columnsB.includes(col));
    }

    analyzePackingResults(originalItems, packedItems) {
        const originalRows = _.max(originalItems.map((_, index) => index)) + 1;
        const packedRows = _.max(_.map(packedItems, 'row')) + 1;
        const originalDensity = this.calculateOverallDensity(originalItems);
        const packedDensity = this.calculateOverallDensity(packedItems);
        
        return {
            originalRows,
            packedRows,
            rowsReduced: originalRows - packedRows,
            originalDensity: Math.round(originalDensity * 100),
            packedDensity: Math.round(packedDensity * 100),
            densityImprovement: Math.round((packedDensity - originalDensity) * 100),
            swapsPerformed: _.sumBy(originalItems, (originalItem, index) => {
                const packedItem = _.find(packedItems, { id: originalItem.id });
                return packedItem && (packedItem.startcol !== originalItem.startcol || packedItem.colspan !== originalItem.colspan) ? 1 : 0;
            }) / 2
        };
    }

    calculateOverallDensity(items) {
        const rowCount = _.max(_.map(items, item => item.row || items.indexOf(item))) + 1;
        const occupiedCells = _.sumBy(items, 'colspan');
        return occupiedCells / (rowCount * this.columnCount);
    }
}