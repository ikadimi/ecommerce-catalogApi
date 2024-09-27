require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Product = require('./models/product.model');
const redisClient = require('./redisClient');

// Create an Express app
const app = express();
const PORT = process.env.PORT;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(cors({
  credentials: true,
  origin: [process.env.CLIENT_URL, process.env.ADMIN_URL]
}));

// server public folder
app.use(express.static('public'));

// MongoDB connection details
const url = process.env.DB_URL;
const dbName = process.env.DB_NAME;
mongoose.connect(`${url}/${dbName}`)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

async function createAndSeedProductsCollection() {
  try {
    // Check if the 'products' collection already has documents
    const productCount = await Product.estimatedDocumentCount();

    if (productCount === 0) {
      console.log('Products collection is empty. Seeding...');

      // Read and parse the JSON file
      const productsJson = fs.readFileSync('source/products_updated.json');
      const productsData = JSON.parse(productsJson);

      // Seed the collection with products data using Mongoose
      await Product.insertMany(productsData);
      console.log('Products collection seeded with data.');
    } else {
      console.log('Products collection already contains documents.');
    }
  } catch (err) {
    console.error('Error checking or seeding products collection:', err);
  }
}

async function startApp() {
  // Check if products collection exists, create and seed if not
  await createAndSeedProductsCollection();

  // Define routes
  app.get('/products', async (req, res) => {
    try {
      console.log('Fetching products...');

      // Extract query parameters
      const { page = 1, searchTerm, category, brand, minPrice, maxPrice } = req.query;
      const limit = 9;
      const skip = (page - 1) * limit;

      // Build the Mongoose query object
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

      // Add brand filter if provided
      if (brand) {
        query.brand = brand;
      }

      // Add price range filter if provided
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice); // greater than or equal to
        if (maxPrice) query.price.$lte = parseFloat(maxPrice); // less than or equal to
      }

      // Fetch filtered products from MongoDB using Mongoose
      const products = await Product.find(query).skip(skip).limit(parseInt(limit));
      const total = await Product.countDocuments(query);

      console.log('Products fetched:', products);
      res.status(200).json({
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        products,
      });
    } catch (err) {
      console.error('Error fetching products:', err);
      res.status(500).send({ message: 'Error fetching products' });
    }
  });

  app.get('/products/:id', async (req, res) => {
    const id = req.params.id;
    const cacheKey = `similar_products_${id}`;

    try {
      // new MongoClient.ObjectId(id)
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log('i got cacheeeed')
        return res.json(JSON.parse(cachedData)); // Return cached data
      }

      const product = await Product.findOne({ _id: id });
  
      if (!product) {
        res.status(404).send({ message: 'Product not found' });
      } else {

        await redisClient.set(cacheKey, JSON.stringify(product), {
          EX: 3600, // Set expiration time in seconds (1 hour)
        });
  
        res.send(product);
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      res.status(500).send({ message: 'Error fetching product' });
    }
  });


  app.get('/filters', async (req, res) => {
    try {
      // Get unique categories
      const categories = await Product.distinct('category');

      // Get unique brands
      const brands = await Product.distinct('brand');

      // Get min and max price
      const priceRange = await Product.aggregate([
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' }
          }
        }
      ]);

      // Return filter options
      res.json({
        categories: categories,
        brands: brands,
        minPrice: priceRange[0]?.minPrice || 0,
        maxPrice: priceRange[0]?.maxPrice || 0
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve filters' });
    }
  });
  // Start the server
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });

}

startApp()