# API Documentation

## City-wise Crop Demand API

This API provides endpoints to retrieve crop demand data filtered by city/district.

### Base URL
```
http://localhost:3000
```

---

## Endpoints

### 1. Get Crop Demand by City/District

**Endpoint:** `GET /api/demand/city/:cityName`

**Description:** Retrieves all crop demand data for a specific city/district.

**Path Parameters:**
- `cityName` (required): Name of the city/district (case-insensitive)

**Query Parameters:**
- `state` (optional): Filter results by state name (case-insensitive)
- `category` (optional): Filter results by category - one of: `Vegetables`, `Fruits`, `Dairy`, `Timber` (case-insensitive)

**Example Requests:**

#### Basic Request (Get all crops for a city)
```bash
curl -X GET "http://localhost:3000/api/demand/city/Hyderabad"
```

#### With State Filter
```bash
curl -X GET "http://localhost:3000/api/demand/city/Hyderabad?state=Telangana"
```

#### With Category Filter
```bash
curl -X GET "http://localhost:3000/api/demand/city/Hyderabad?category=Vegetables"
```

#### With Both Filters
```bash
curl -X GET "http://localhost:3000/api/demand/city/Hyderabad?state=Telangana&category=Fruits"
```

**Example Response:**

```json
{
  "city": "Hyderabad",
  "filters": {
    "state": "all",
    "category": "all"
  },
  "summary": {
    "totalStates": 1,
    "totalCategories": 2,
    "totalCrops": 45,
    "totalDemand": 12345.67,
    "unit": "tons per week"
  },
  "data": [
    {
      "state": "Telangana",
      "summary": {
        "totalCategories": 2,
        "totalCrops": 45,
        "totalDemand": 12345.67,
        "unit": "tons per week"
      },
      "categories": [
        {
          "name": "Vegetables",
          "count": 30,
          "crops": [
            {
              "cropId": "6058f8fc-3f83-4f83-8d0e-7dfa9f17d1ab",
              "cropName": "Ashgourd",
              "scientificName": "",
              "categoryId": {
                "_id": "vegetables",
                "name": "Vegetables"
              },
              "demandQuantity": 321.3,
              "regionalSuitability": [
                {
                  "geography": "India",
                  "district": "Hyderabad",
                  "state": "Telangana",
                  "suitability": "Medium"
                }
              ],
              "allRegions": [
                {
                  "geography": "India",
                  "district": "Hyderabad",
                  "state": "Telangana",
                  "suitability": "Medium"
                },
                {
                  "geography": "India",
                  "district": "Medak",
                  "state": "Telangana",
                  "suitability": "Medium"
                },
                {
                  "geography": "India",
                  "district": "Warangal",
                  "state": "Telangana",
                  "suitability": "Medium"
                }
              ]
            }
          ]
        },
        {
          "name": "Fruits",
          "count": 15,
          "crops": [
            {
              "cropId": "ba55ffa8-60f4-4ad7-9e92-7dcc8d82e644",
              "cropName": "Mango",
              "scientificName": "Mangifera indica",
              "categoryId": {
                "_id": "fruits",
                "name": "Fruits"
              },
              "demandQuantity": 500.25,
              "regionalSuitability": [
                {
                  "geography": "India",
                  "district": "Hyderabad",
                  "state": "Telangana",
                  "suitability": "High"
                }
              ],
              "allRegions": [
                {
                  "geography": "India",
                  "district": "Hyderabad",
                  "state": "Telangana",
                  "suitability": "High"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Error Responses:**

#### 400 Bad Request - Missing City Name
```json
{
  "error": "City name is required",
  "message": "Please provide a valid city/district name"
}
```

#### 404 Not Found - No Data for City
```json
{
  "error": "No data found",
  "message": "No crop demand data found for city/district: InvalidCity",
  "city": "InvalidCity",
  "suggestions": "Try checking the spelling or use a different city name"
}
```

#### 503 Service Unavailable - Data Not Loaded
```json
{
  "error": "Data not available",
  "message": "Demand data has not been loaded. Please run preprocess.js first."
}
```

---

### 2. Get List of All Cities/Districts

**Endpoint:** `GET /api/demand/cities`

**Description:** Returns a list of all available cities/districts in the dataset.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/demand/cities"
```

**Example Response:**
```json
{
  "totalCities": 150,
  "cities": [
    "Adilabad",
    "Bangalore",
    "Chennai",
    "Delhi",
    "Hyderabad",
    "Mumbai",
    ...
  ]
}
```

---

### 3. Health Check

**Endpoint:** `GET /health`

**Description:** Check if the server is running and data is loaded.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/health"
```

**Example Response:**
```json
{
  "status": "ok",
  "dataLoaded": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Response Structure

### Main Response Object
- `city`: The requested city/district name
- `filters`: Applied filters (state, category)
- `summary`: Overall statistics across all states
- `data`: Array of state objects containing filtered crop data

### State Object
- `state`: State name
- `summary`: Statistics for this state
- `categories`: Array of category objects

### Category Object
- `name`: Category name (Vegetables, Fruits, Dairy, Timber)
- `count`: Number of crops in this category
- `crops`: Array of crop objects

### Crop Object
- `cropId`: Unique identifier (UUID)
- `cropName`: Name of the crop
- `scientificName`: Scientific name (if available)
- `categoryId`: Category information
- `demandQuantity`: Total demand quantity in tons per week
- `regionalSuitability`: Array containing only the matching city/district entry
- `allRegions`: Array containing all regional suitability entries for this crop

---

## Usage Examples

### Get all vegetables for Hyderabad
```bash
curl -X GET "http://localhost:3000/api/demand/city/Hyderabad?category=Vegetables"
```

### Get all fruits for Bangalore in Karnataka
```bash
curl -X GET "http://localhost:3000/api/demand/city/Bangalore?state=Karnataka&category=Fruits"
```

### Get all crops for a city (no filters)
```bash
curl -X GET "http://localhost:3000/api/demand/city/Mumbai"
```

### Using PowerShell (Windows)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/demand/city/Hyderabad" -Method Get
```

### Using JavaScript (fetch)
```javascript
fetch('http://localhost:3000/api/demand/city/Hyderabad')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

---

## Starting the Server

1. Install dependencies:
```bash
npm install
```

2. Generate demand.json (if not already done):
```bash
npm run preprocess
```

3. Start the server:
```bash
npm run server
```

The server will start on `http://localhost:3000` by default.

