const fs = require('fs');
const path = require('path');

// Paths to the input JSON file and the output JSON file
const inputFilePath = path.join(__dirname, 'source/products.json');
const outputFilePath = path.join(__dirname, 'source/products_updated.json');

// Function to transform image field
function transformImageField(imageName) {
  // Replace spaces with dashes and add '.webp' extension
  return imageName.replace(/\s+/g, '-') + '.webp';
}

// Read and modify the JSON data
fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading JSON file:', err);
    return;
  }

  // Parse the JSON data
  let products;
  try {
    products = JSON.parse(data);
  } catch (parseErr) {
    console.error('Error parsing JSON data:', parseErr);
    return;
  }

  // Update the image field for each product
  products.forEach(product => {
    if (product.name) {
      product.image = transformImageField(product.name);
    }
  });

  console.log(products)

  // Write the updated data to a new JSON file
  fs.writeFile(outputFilePath, JSON.stringify(products, null, 2), 'utf8', writeErr => {
    if (writeErr) {
      console.error('Error writing JSON file:', writeErr);
    } else {
      console.log(`Updated JSON file has been saved to ${outputFilePath}`);
    }
  });
});
