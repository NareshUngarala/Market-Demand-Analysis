# CSV Preprocessor

A Node.js script to preprocess and merge multiple CSV files into a single JSON file with aggregated crop demand data.

## Requirements

- Node.js (v12 or higher recommended)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

## Project Structure

```
Demand/
├── data/              # Place your CSV files here (325 CSV files)
├── preprocess.js      # Main preprocessing script
├── package.json       # Node.js dependencies
├── demand.json        # Generated output file (created after running)
└── README.md          # This file
```

## CSV File Format

Each CSV file should have the following columns:
- `state` - State name
- `category` - Category name (Vegetables, Fruits, Dairy, or Timber)
- `crop_name` - Name of the crop
- `scientific_name` - Scientific name of the crop
- `district` - District name
- `demand_quantity` - Demand quantity (numeric)
- `suitability` - Suitability level (Low, Medium, or High)

## Usage

1. Place all your CSV files (325 files) in the `data` folder
2. Run the preprocessing script:

```bash
npm start
```

Or:

```bash
node preprocess.js
```

3. The script will generate `demand.json` in the root directory

## Output Format

The script generates a JSON file with the following structure:

```json
[
  {
    "state": "StateName",
    "categories": [
      {
        "name": "Vegetables",
        "count": 10,
        "crops": [
          {
            "cropId": "uuid",
            "cropName": "Crop Name",
            "scientificName": "Scientific Name",
            "categoryId": {
              "_id": "vegetables",
              "name": "Vegetables"
            },
            "demandQuantity": 100.5,
            "regionalSuitability": [
              {
                "geography": "India",
                "district": "District Name",
                "state": "State Name",
                "suitability": "High"
              }
            ]
          }
        ]
      }
    ],
    "summary": {
      "totalCategories": 4,
      "totalCrops": 50,
      "totalDemand": 1500.75,
      "unit": "tons per week",
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    }
  }
]
```

## Features

- **Streaming CSV Parsing**: Uses `csv-parser` for efficient memory usage with large files
- **State-wise Aggregation**: Groups data by state
- **Category-wise Aggregation**: Groups crops by category within each state
- **Unique Crop IDs**: Generates UUID for each unique crop
- **Regional Suitability**: Tracks suitability data for each district
- **Summary Statistics**: Calculates total categories, crops, and demand per state

## Performance

The script is optimized to handle 300+ CSV files efficiently:
- Uses streaming to avoid loading entire files into memory
- Processes files in parallel using Promise.all
- Uses Maps for efficient data lookups and aggregations

## Notes

- Only CSV files in the `data` folder will be processed
- Category names must match exactly: "Vegetables", "Fruits", "Dairy", or "Timber"
- Rows with missing essential data (state, category, crop_name) will be skipped
- Duplicate crops (same name and scientific name) within the same state/category are merged
- Demand quantities for duplicate crops are summed
- Regional suitability entries are combined for merged crops

