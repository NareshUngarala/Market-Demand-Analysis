# Output Format Specification

The `demand.json` file follows this exact structure:

## Root Level
Array of state objects, one for each unique state found in the CSV files.

## State Object Structure

```json
{
  "state": "StateName",
  "categories": [ /* Array of category objects */ ],
  "summary": { /* Summary statistics object */ }
}
```

## Category Object Structure

```json
{
  "name": "Vegetables" | "Fruits" | "Dairy" | "Timber",
  "count": 10,
  "crops": [ /* Array of crop objects */ ]
}
```

## Crop Object Structure

```json
{
  "cropId": "uuid-v4-string",
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
      "suitability": "Low" | "Medium" | "High"
    }
  ]
}
```

## Summary Object Structure

```json
{
  "totalCategories": 4,
  "totalCrops": 50,
  "totalDemand": 1500.75,
  "unit": "tons per week",
  "lastUpdated": "2024-01-01T12:00:00.000Z"
}
```

## Example Complete Output

```json
[
  {
    "state": "Karnataka",
    "categories": [
      {
        "name": "Vegetables",
        "count": 5,
        "crops": [
          {
            "cropId": "550e8400-e29b-41d4-a716-446655440000",
            "cropName": "Tomato",
            "scientificName": "Solanum lycopersicum",
            "categoryId": {
              "_id": "vegetables",
              "name": "Vegetables"
            },
            "demandQuantity": 250.5,
            "regionalSuitability": [
              {
                "geography": "India",
                "district": "Bangalore",
                "state": "Karnataka",
                "suitability": "High"
              },
              {
                "geography": "India",
                "district": "Mysore",
                "state": "Karnataka",
                "suitability": "Medium"
              }
            ]
          }
        ]
      }
    ],
    "summary": {
      "totalCategories": 1,
      "totalCrops": 5,
      "totalDemand": 1250.75,
      "unit": "tons per week",
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  }
]
```

## Key Notes

- **cropId**: Unique UUID v4 generated for each unique crop (same crop name + scientific name combination)
- **demandQuantity**: Sum of all demand quantities for that crop across all districts
- **regionalSuitability**: Array of all district/suitability combinations for that crop
- **categoryId._id**: Lowercase category name with spaces replaced by underscores
- **lastUpdated**: ISO 8601 timestamp in UTC
- **unit**: Always "tons per week"

