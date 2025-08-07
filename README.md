# Column Constrained Skyline Packing

A visual demonstration of a skyline packing algorithm for grid layouts with column constraints.

## 🚀 [Live Demo](https://josvanegmond.github.io/ColumnConstrainedSkylinePacking)

## Features

- **Interactive Grid Generation**: Customize column count (2-12) and item count (1-20)
- **Skyline Packing Algorithm**: Efficiently packs items to minimize empty space
- **Real-time Statistics**: Shows density improvements and packing results
- **Responsive Design**: Works on desktop and mobile devices

## How It Works

1. **Generate Grid**: Creates random grid items with various column spans
2. **Pack Items**: Applies the skyline packing algorithm:
   - Moves items to earlier rows when space is available
   - Swaps items to optimize placement
   - Sorts rows by density (with left-fill preference)
3. **View Results**: See packing statistics and final layout

## Algorithm Details

The packing algorithm uses a queue-based approach:
- Processes each item to find optimal placement
- Prioritizes moving items to earlier rows
- Performs swaps when beneficial
- Final density-based sorting with left-alignment preference

## Technologies Used

- Vanilla JavaScript (ES6+)
- CSS Grid Layout
- Lodash for utility functions
- Material Design styling

## Usage

Simply open `index.html` in a browser or visit the live demo above.