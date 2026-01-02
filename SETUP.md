# Setup Instructions

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Prepare Your Data**
   - Create a `data` folder in the project root (if it doesn't exist)
   - Place all 325 CSV files inside the `data` folder

3. **Run the Preprocessing Script**
   ```bash
   npm start
   ```
   or
   ```bash
   node preprocess.js
   ```

4. **Output**
   - The script will generate `demand.json` in the root directory
   - Check the console output for processing statistics

## CSV File Requirements

Each CSV file must have the following columns (case-sensitive):
- `state`
- `category` (must be one of: Vegetables, Fruits, Dairy, Timber)
- `crop_name`
- `scientific_name`
- `district`
- `demand_quantity` (numeric value)
- `suitability` (Low, Medium, or High)

## Folder Structure After Setup

```
Demand/
├── data/              # Your 325 CSV files go here
│   ├── file1.csv
│   ├── file2.csv
│   └── ...
├── preprocess.js      # Main script
├── package.json       # Dependencies
├── demand.json        # Generated output (created after running)
├── README.md
└── SETUP.md
```

## Troubleshooting

- **"Data folder not found"**: Make sure you have a `data` folder in the project root with your CSV files
- **"No CSV files found"**: Ensure your CSV files have the `.csv` extension (case-insensitive)
- **Processing errors**: Check that your CSV files have the required columns and valid data

