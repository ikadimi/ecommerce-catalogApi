const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

// Create an Express app
const app = express();
const PORT = 3000;

// Enable CORS
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
  });
app.use(cors({
  credentials: true,
  origin: 'http://localhost:4200'
}));

// server public folder
app.use(express.static('public'));

// MongoDB connection details
const url = 'mongodb://localhost:27017';
const dbName = 'ecommerce';
const client = new MongoClient(url);

async function createAndSeedProductsCollection(db) {
  try {
    // Check if 'products' collection exists
    const collections = await db.listCollections({ name: 'products' }).toArray();
    
    if (collections.length === 0) {
      console.log('Products collection does not exist. Creating and seeding...');

      // Create the 'products' collection
      await db.createCollection('products');
      console.log('Products collection created.');

      // Read and parse the JSON file
      const productsJson = fs.readFileSync('source/products_updated.json');
      const productsData = JSON.parse(productsJson);

      // Seed the collection with products data
      const productsCollection = db.collection('products');
      await productsCollection.insertMany(productsData);
      console.log('Products collection seeded with data.');
    } else {
      console.log('Products collection already exists.');
    }
  } catch (err) {
    console.error('Error checking or seeding products collection:', err);
  }
}

async function startApp() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Check if products collection exists, create and seed if not
    await createAndSeedProductsCollection(db);

    // Define routes
    app.get('/products', async (req, res) => {
      try {
        console.log('Fetching products...');
    
        // Extract query parameters
        const { searchTerm, category, minPrice, maxPrice } = req.query;
    
        // Build the MongoDB query object
        let query = {};
    
        // Add search term filter if provided (search in product name or description)
        if (searchTerm) {
          query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } }, // case-insensitive search
            { description: { $regex: searchTerm, $options: 'i' } }
          ];
        }
    
        // Add category filter if provided
        if (category) {
          query.category = category;
        }
    
        // Add price range filter if provided
        if (minPrice || maxPrice) {
          query.price = {};
          if (minPrice) query.price.$gte = parseFloat(minPrice); // greater than or equal to
          if (maxPrice) query.price.$lte = parseFloat(maxPrice); // less than or equal to
        }
    
        // Fetch filtered products from MongoDB
        const products = await db.collection('products').find(query).toArray();
    
        console.log('Products fetched:', products);
        res.send(products);
      } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).send({ message: 'Error fetching products' });
      }
    });    

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      try {
		// new MongoClient.ObjectId(id)
        const product = await db.collection('products').findOne({ _id: id });
        if (!product) {
          res.status(404).send({ message: 'Product not found' });
        } else {
          res.send(product);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).send({ message: 'Error fetching product' });
      }
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });

  } catch (err) {
    console.error('Error starting the app:', err);
  }
}

startApp();
