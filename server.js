const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DEMAND_FILE = path.join(__dirname, 'demand.json');

// Middleware
app.use(cors());
app.use(express.json());

// Load demand data
let demandData = null;

function loadDemandData() {
  try {
    if (fs.existsSync(DEMAND_FILE)) {
      const fileContent = fs.readFileSync(DEMAND_FILE, 'utf8');
      demandData = JSON.parse(fileContent);
      console.log('✅ Demand data loaded successfully');
    } else {
      console.error('❌ demand.json not found. Please run preprocess.js first.');
      demandData = [];
    }
  } catch (error) {
    console.error('Error loading demand data:', error);
    demandData = [];
  }
}

// Load data on startup
loadDemandData();

/**
 * GET /api/demand/city/:cityName
 * Get crop demand data filtered by city/district name
 * 
 * Query parameters:
 * - state (optional): Filter by state name
 * - category (optional): Filter by category (Vegetables, Fruits, Dairy, Timber)
 */
app.get('/api/demand/city/:cityName', (req, res) => {
  const cityName = req.params.cityName.trim();
  const stateFilter = req.query.state ? req.query.state.trim() : null;
  const categoryFilter = req.query.category ? req.query.category.trim() : null;

  if (!cityName) {
    return res.status(400).json({
      error: 'City name is required',
      message: 'Please provide a valid city/district name'
    });
  }

  if (!demandData || demandData.length === 0) {
    return res.status(503).json({
      error: 'Data not available',
      message: 'Demand data has not been loaded. Please run preprocess.js first.'
    });
  }

  try {
    const result = {
      city: cityName,
      filters: {
        state: stateFilter || 'all',
        category: categoryFilter || 'all'
      },
      note: "demandQuantity represents the total demand for this crop across all districts in the state, not just this city",
      data: []
    };

    // Iterate through all states
    demandData.forEach(stateData => {
      // Apply state filter if provided
      if (stateFilter && stateData.state.toLowerCase() !== stateFilter.toLowerCase()) {
        return;
      }

      const stateResult = {
        state: stateData.state,
        categories: []
      };

      // Iterate through categories
      stateData.categories.forEach(category => {
        // Apply category filter if provided
        if (categoryFilter && category.name.toLowerCase() !== categoryFilter.toLowerCase()) {
          return;
        }

        // Filter crops that have this city in their regionalSuitability AND belong to this state
        const matchingCrops = category.crops.filter(crop => {
          return crop.regionalSuitability.some(region => 
            region.district.toLowerCase() === cityName.toLowerCase() &&
            region.state.toLowerCase() === stateData.state.toLowerCase()
          );
        });

        if (matchingCrops.length > 0) {
          // For each matching crop, extract only the relevant district data for this state
          const cityCrops = matchingCrops.map(crop => {
            // Find the specific regional suitability entry for this city in this state
            const cityRegion = crop.regionalSuitability.find(region => 
              region.district.toLowerCase() === cityName.toLowerCase() &&
              region.state.toLowerCase() === stateData.state.toLowerCase()
            );

            return {
              cropId: crop.cropId,
              cropName: crop.cropName,
              scientificName: crop.scientificName,
              categoryId: crop.categoryId,
              demandQuantity: crop.demandQuantity,
              regionalSuitability: cityRegion ? [cityRegion] : []
            };
          });

          stateResult.categories.push({
            name: category.name,
            count: cityCrops.length,
            crops: cityCrops
          });
        }
      });

      // Only add state if it has matching categories
      if (stateResult.categories.length > 0) {
        // Calculate summary for this state
        const totalCrops = stateResult.categories.reduce((sum, cat) => sum + cat.count, 0);
        const totalDemand = stateResult.categories.reduce((sum, cat) => 
          sum + cat.crops.reduce((cropSum, crop) => cropSum + crop.demandQuantity, 0), 0
        );

        stateResult.summary = {
          totalCategories: stateResult.categories.length,
          totalCrops: totalCrops,
          totalDemand: totalDemand,
          unit: 'tons per week'
        };

        result.data.push(stateResult);
      }
    });

    // Calculate overall summary
    const overallTotalCrops = result.data.reduce((sum, state) => 
      sum + (state.summary?.totalCrops || 0), 0
    );
    const overallTotalDemand = result.data.reduce((sum, state) => 
      sum + (state.summary?.totalDemand || 0), 0
    );

    result.summary = {
      totalStates: result.data.length,
      totalCategories: result.data.reduce((sum, state) => 
        sum + (state.summary?.totalCategories || 0), 0
      ),
      totalCrops: overallTotalCrops,
      totalDemand: overallTotalDemand,
      unit: 'tons per week'
    };

    if (result.data.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No crop demand data found for city/district: ${cityName}`,
        city: cityName,
        suggestions: 'Try checking the spelling or use a different city name'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * GET /api/demand/cities
 * Get list of all available cities/districts
 */
app.get('/api/demand/cities', (req, res) => {
  if (!demandData || demandData.length === 0) {
    return res.status(503).json({
      error: 'Data not available',
      message: 'Demand data has not been loaded. Please run preprocess.js first.'
    });
  }

  try {
    const citiesSet = new Set();
    
    demandData.forEach(stateData => {
      stateData.categories.forEach(category => {
        category.crops.forEach(crop => {
          crop.regionalSuitability.forEach(region => {
            if (region.district) {
              citiesSet.add(region.district);
            }
          });
        });
      });
    });

    const cities = Array.from(citiesSet).sort();
    
    res.json({
      totalCities: cities.length,
      cities: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching cities list'
    });
  }
});

/**
 * GET /api/demand/all-cities
 * Get all cities with their crops, categories, and demand data
 */
app.get('/api/demand/all-cities', (req, res) => {
  if (!demandData || demandData.length === 0) {
    return res.status(503).json({
      error: 'Data not available',
      message: 'Demand data has not been loaded. Please run preprocess.js first.'
    });
  }

  try {
    // Create a map to organize data by city
    const citiesMap = new Map();

    // Iterate through all states
    demandData.forEach(stateData => {
      // Iterate through all categories
      stateData.categories.forEach(category => {
        // Iterate through all crops
        category.crops.forEach(crop => {
          // Iterate through regional suitability to find all cities for this crop
          crop.regionalSuitability.forEach(region => {
            const cityName = region.district;
            const stateName = region.state;

            if (!cityName) return;

            // Get or create city entry
            if (!citiesMap.has(cityName)) {
              citiesMap.set(cityName, {
                city: cityName,
                states: new Map()
              });
            }

            const cityData = citiesMap.get(cityName);

            // Get or create state entry for this city
            if (!cityData.states.has(stateName)) {
              cityData.states.set(stateName, {
                state: stateName,
                categories: new Map()
              });
            }

            const stateDataForCity = cityData.states.get(stateName);

            // Get or create category entry
            if (!stateDataForCity.categories.has(category.name)) {
              stateDataForCity.categories.set(category.name, {
                name: category.name,
                crops: []
              });
            }

            const categoryData = stateDataForCity.categories.get(category.name);

            // Check if crop already exists in this city/state/category
            const existingCrop = categoryData.crops.find(c => c.cropId === crop.cropId);

            // Only add crops with demand quantity greater than 0
            if (crop.demandQuantity > 0) {
              if (!existingCrop) {
                // Add crop with its data
                categoryData.crops.push({
                  cropId: crop.cropId,
                  cropName: crop.cropName,
                  scientificName: crop.scientificName,
                  categoryId: crop.categoryId,
                  demandQuantity: crop.demandQuantity,
                  regionalSuitability: [region]
                });
              } else {
                // Add this region to existing crop if not already present
                const regionExists = existingCrop.regionalSuitability.some(
                  r => r.district === region.district && r.state === region.state
                );
                if (!regionExists) {
                  existingCrop.regionalSuitability.push(region);
                }
              }
            }
          });
        });
      });
    });

    // Convert Map structures to arrays
    const result = {
      totalCities: citiesMap.size,
      cities: []
    };

    citiesMap.forEach((cityData, cityName) => {
      const cityEntry = {
        city: cityName,
        states: []
      };

      cityData.states.forEach((stateData, stateName) => {
        const stateEntry = {
          state: stateName,
          categories: []
        };

        stateData.categories.forEach((categoryData, categoryName) => {
          // Filter out crops with 0 demand (should already be filtered, but double-check)
          const validCrops = categoryData.crops.filter(crop => crop.demandQuantity > 0);
          
          // Only add category if it has crops with demand > 0
          if (validCrops.length > 0) {
            // Calculate category summary
            const categorySummary = {
              name: categoryName,
              count: validCrops.length,
              totalDemand: validCrops.reduce(
                (sum, crop) => sum + crop.demandQuantity,
                0
              ),
              crops: validCrops
            };

            stateEntry.categories.push(categorySummary);
          }
        });

        // Only add state if it has categories with crops
        if (stateEntry.categories.length > 0) {
          // Calculate state summary
          const totalCrops = stateEntry.categories.reduce(
            (sum, cat) => sum + cat.count,
            0
          );
          const totalDemand = stateEntry.categories.reduce(
            (sum, cat) => sum + cat.totalDemand,
            0
          );

          stateEntry.summary = {
            totalCategories: stateEntry.categories.length,
            totalCrops: totalCrops,
            totalDemand: totalDemand,
            unit: 'tons per week'
          };

          cityEntry.states.push(stateEntry);
        }
      });

      // Only add city if it has states with crops
      if (cityEntry.states.length > 0) {
        // Calculate city summary
        const cityTotalCrops = cityEntry.states.reduce(
          (sum, state) => sum + (state.summary?.totalCrops || 0),
          0
        );
        const cityTotalDemand = cityEntry.states.reduce(
          (sum, state) => sum + (state.summary?.totalDemand || 0),
          0
        );
        const cityTotalCategories = new Set();
        cityEntry.states.forEach(state => {
          state.categories.forEach(cat => {
            cityTotalCategories.add(cat.name);
          });
        });

        cityEntry.summary = {
          totalStates: cityEntry.states.length,
          totalCategories: cityTotalCategories.size,
          totalCrops: cityTotalCrops,
          totalDemand: cityTotalDemand,
          unit: 'tons per week'
        };

        result.cities.push(cityEntry);
      }
    });

    // Sort cities alphabetically
    result.cities.sort((a, b) => a.city.localeCompare(b.city));

    res.json(result);
  } catch (error) {
    console.error('Error fetching all cities data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching all cities data'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    dataLoaded: demandData !== null && demandData.length > 0,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Endpoints available:`);
  console.log(`   GET /api/demand/city/:cityName - Get crop demand by city`);
  console.log(`   GET /api/demand/cities - Get list of all cities`);
  console.log(`   GET /api/demand/all-cities - Get all cities with crops, categories, and demand`);
  console.log(`   GET /health - Health check`);
});

