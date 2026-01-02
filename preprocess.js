const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

const DATA_FOLDER = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(__dirname, 'demand.json');

/**
 * Valid category names
 */
const VALID_CATEGORIES = ['Vegetables', 'Fruits', 'Spices', 'Cereals', 'Pulses', 'Oil Seeds', 'Oils and Fats', 'Fibre Crops', 'Forest Products', 'Flowers', 'Dry Fruits', 'Beverages', 'Live Stock', 'Drug and Narcotics', 'Other'];

/**
 * Map CSV Group categories to valid categories
 * @param {string} csvGroup - The Group value from CSV
 * @param {string} cropName - The crop name (from filename) to help determine category
 * @returns {string|null} Mapped category name or null if no mapping
 */
function mapCategoryToValid(csvGroup, cropName) {
  if (!csvGroup) return null;
  
  const normalizedGroup = csvGroup.trim();
  const cropNameLower = (cropName || '').toLowerCase().trim();
  
  // Direct matches for exact category names
  const directMatch = VALID_CATEGORIES.find(cat => 
    normalizedGroup.toLowerCase() === cat.toLowerCase()
  );
  if (directMatch) {
    return directMatch;
  }
  
  // Normalize group name for comparison (handle variations)
  const normalizedGroupLower = normalizedGroup.toLowerCase();
  
  // Map Spices
  if (normalizedGroupLower === 'spices') {
    return 'Spices';
  }
  
  // Map Cereals
  if (normalizedGroupLower === 'cereals') {
    return 'Cereals';
  }
  
  // Map Pulses
  if (normalizedGroupLower === 'pulses') {
    return 'Pulses';
  }
  
  // Map Oil Seeds (handle variations)
  if (normalizedGroupLower === 'oil seeds' || normalizedGroupLower === 'oilseeds') {
    return 'Oil Seeds';
  }
  
  // Map Oils and Fats
  if (normalizedGroupLower === 'oils and fats' || normalizedGroupLower === 'oil and fats') {
    return 'Oils and Fats';
  }
  
  // Map Fibre Crops (handle variations)
  if (normalizedGroupLower === 'fibre crops' || normalizedGroupLower === 'fiber crops') {
    return 'Fibre Crops';
  }
  
  // Map Forest Products
  if (normalizedGroupLower === 'forest products') {
    return 'Forest Products';
  }
  
  // Map Flowers
  if (normalizedGroupLower === 'flowers') {
    return 'Flowers';
  }
  
  // Map Dry Fruits
  if (normalizedGroupLower === 'dry fruits') {
    return 'Dry Fruits';
  }
  
  // Map Beverages
  if (normalizedGroupLower === 'beverages') {
    return 'Beverages';
  }
  
  // Map Live Stock (handle variations like "Live Stock,Poultry,Fisheries")
  if (normalizedGroupLower.includes('live stock') || normalizedGroupLower.includes('livestock')) {
    return 'Live Stock';
  }
  
  // Map Drug and Narcotics
  if (normalizedGroupLower === 'drug and narcotics' || normalizedGroupLower === 'drug & narcotics') {
    return 'Drug and Narcotics';
  }
  
  // Map Other category
  if (normalizedGroupLower === 'other') {
    return 'Other';
  }
  
  return null;
}

/**
 * Main data structure: state -> category -> crops
 * Using Maps for efficient lookups
 */
const stateDataMap = new Map();

/**
 * Extract crop name from filename (remove .csv extension)
 * @param {string} filePath - Path to the CSV file
 * @returns {string} Crop name
 */
function getCropNameFromFile(filePath) {
  const fileName = path.basename(filePath, '.csv');
  return fileName.trim();
}

/**
 * Process a single CSV file using streaming
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<void>}
 */
function processCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const cropNameFromFile = getCropNameFromFile(filePath);
    const stream = fs.createReadStream(filePath);
    
    stream
      .pipe(csv())
      .on('data', (row) => {
        try {
          processRow(row, cropNameFromFile);
        } catch (error) {
          console.error(`Error processing row in ${filePath}:`, error.message);
        }
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Process a single CSV row
 * @param {Object} row - CSV row object
 * @param {string} cropNameFromFile - Crop name extracted from filename
 */
function processRow(row, cropNameFromFile) {
  // Map actual CSV column names to expected field names
  const state = (row.state || row['State Name'] || '').trim();
  const category = (row.category || row.Group || '').trim();
  const district = (row.district || row['District Name'] || '').trim();
  
  // Use crop name from filename (more reliable than Variety which is often "Other")
  const cropName = cropNameFromFile || (row.crop_name || row.Variety || '').trim();
  
  // Scientific name - not available in CSV, use empty string or same as crop name
  const scientificName = (row.scientific_name || row['Scientific Name'] || '').trim();
  
  // Handle demand_quantity - could be "Arrivals (Tonnes)" or "Arrivals" or "demand_quantity"
  const demandQuantityStr = row.demand_quantity || row['Arrivals (Tonnes)'] || row.Arrivals || '0';
  const demandQuantity = parseFloat(demandQuantityStr) || 0;
  
  // Suitability - not in CSV, default to "Medium"
  const suitability = (row.suitability || row.Suitability || 'Medium').trim();

  // Skip rows with missing essential data
  if (!state || !category || !cropName) {
    return;
  }
  
  // Skip if demand quantity is 0 or invalid
  if (demandQuantity <= 0) {
    return;
  }

  // Map CSV category to valid category
  let validCategory = null;
  
  // First try case-insensitive direct match
  const categoryLower = category.toLowerCase().trim();
  const directMatch = VALID_CATEGORIES.find(cat => cat.toLowerCase() === categoryLower);
  if (directMatch) {
    validCategory = directMatch;
  } else {
    // Try mapping function for variations
    validCategory = mapCategoryToValid(category, cropName);
  }
  
  // If still no valid category, skip this row
  if (!validCategory || !VALID_CATEGORIES.includes(validCategory)) {
    return; // Skip rows that don't map to valid categories
  }

  // Get or create state data
  if (!stateDataMap.has(state)) {
    stateDataMap.set(state, {
      state: state,
      categoriesMap: new Map(),
      summary: {
        totalCategories: 0,
        totalCrops: 0,
        totalDemand: 0,
        unit: 'tons per week',
        lastUpdated: ''
      }
    });
  }

  const stateData = stateDataMap.get(state);

  // Get or create category data (use normalized category)
  if (!stateData.categoriesMap.has(validCategory)) {
    stateData.categoriesMap.set(validCategory, {
      name: validCategory,
      count: 0,
      cropsMap: new Map() // cropName -> crop object
    });
  }

  const categoryData = stateData.categoriesMap.get(validCategory);
  
  // Get or create crop data
  // Use crop name for key (since scientific name might be empty)
  // Normalize for key comparison
  const cropKey = cropName.toLowerCase().trim();
  
  if (!categoryData.cropsMap.has(cropKey)) {
    // Create new crop entry
    const cropId = uuidv4();
    categoryData.cropsMap.set(cropKey, {
      cropId: cropId,
      cropName: cropName,
      scientificName: scientificName, // Empty string if not in CSV
      categoryId: {
        _id: validCategory.toLowerCase().replace(/\s+/g, '_'),
        name: validCategory
      },
      demandQuantity: 0,
      regionalSuitability: []
    });
  }

  const crop = categoryData.cropsMap.get(cropKey);
  
  // Add regional suitability entry
  const suitabilityEntry = {
    geography: 'India',
    district: district,
    state: state,
    suitability: suitability || 'Medium'
  };

  // Check if this district/suitability combination already exists
  const existingSuitability = crop.regionalSuitability.find(
    s => s.district === district && s.suitability === suitabilityEntry.suitability
  );

  if (!existingSuitability) {
    crop.regionalSuitability.push(suitabilityEntry);
  }

  // Sum demand quantity (handle duplicates by summing)
  crop.demandQuantity += demandQuantity;
}

/**
 * Convert Maps to arrays and calculate final summaries
 * @returns {Array} Final output array
 */
function finalizeData() {
  const finalOutput = [];

  stateDataMap.forEach((stateData, state) => {
    const categories = [];

    // Reset summary counters
    stateData.summary.totalCategories = 0;
    stateData.summary.totalCrops = 0;
    stateData.summary.totalDemand = 0;

    // Ensure ALL valid categories are included (even if empty)
    VALID_CATEGORIES.forEach(categoryName => {
      let categoryData = stateData.categoriesMap.get(categoryName);
      
      // If category doesn't exist, create empty category
      if (!categoryData) {
        categoryData = {
          name: categoryName,
          count: 0,
          crops: []
        };
      } else {
        // Convert cropsMap to array for existing categories
        const crops = [];
        categoryData.cropsMap.forEach((crop, cropKey) => {
          crops.push(crop);
        });

        // Update category count
        categoryData.count = crops.length;
        categoryData.crops = crops;

        // Update state summary
        stateData.summary.totalCrops += crops.length;
        crops.forEach(crop => {
          stateData.summary.totalDemand += crop.demandQuantity;
        });
      }

      categories.push({
        name: categoryData.name,
        count: categoryData.count,
        crops: categoryData.crops || []
      });
    });

    // Update total categories (always 4)
    stateData.summary.totalCategories = VALID_CATEGORIES.length;

    // Set last updated timestamp
    stateData.summary.lastUpdated = new Date().toISOString();

    finalOutput.push({
      state: stateData.state,
      categories: categories,
      summary: stateData.summary
    });
  });

  return finalOutput;
}

/**
 * Main processing function
 */
async function main() {
  console.log('Starting CSV preprocessing...');
  console.log(`Reading CSV files from: ${DATA_FOLDER}`);

  // Check if data folder exists
  if (!fs.existsSync(DATA_FOLDER)) {
    console.error(`Error: Data folder not found at ${DATA_FOLDER}`);
    console.log('Please create a "data" folder and place your CSV files there.');
    process.exit(1);
  }

  // Read all CSV files from data folder
  const files = fs.readdirSync(DATA_FOLDER);
  const csvFiles = files.filter(file => file.toLowerCase().endsWith('.csv'));

  if (csvFiles.length === 0) {
    console.error(`Error: No CSV files found in ${DATA_FOLDER}`);
    process.exit(1);
  }

  console.log(`Found ${csvFiles.length} CSV file(s) to process`);

  // Process all CSV files
  const filePromises = csvFiles.map(file => {
    const filePath = path.join(DATA_FOLDER, file);
    console.log(`Processing: ${file}`);
    return processCSVFile(filePath);
  });

  try {
    await Promise.all(filePromises);
    console.log('All CSV files processed successfully');
  } catch (error) {
    console.error('Error processing CSV files:', error);
    process.exit(1);
  }

  // Finalize data structure
  console.log('Finalizing data structure...');
  const finalOutput = finalizeData();

  // Write output JSON file
  console.log(`Writing output to: ${OUTPUT_FILE}`);
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(finalOutput, null, 2),
    'utf8'
  );

  console.log('✅ demand.json created successfully!');
  console.log(`\nSummary:`);
  console.log(`- Total states: ${finalOutput.length}`);
  console.log(`- Total categories processed: ${VALID_CATEGORIES.join(', ')}`);
  
  const totalCrops = finalOutput.reduce((sum, state) => sum + state.summary.totalCrops, 0);
  const totalDemand = finalOutput.reduce((sum, state) => sum + state.summary.totalDemand, 0);
  console.log(`- Total crops: ${totalCrops}`);
  console.log(`- Total demand: ${totalDemand.toFixed(2)} tons per week`);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

