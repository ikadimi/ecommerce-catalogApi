const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  _id: {
    type: String, // Assuming the ID is a string
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0 // Ensures price is a positive number
  },
  brand: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5 // Assuming rating is between 0 and 5
  },
  reviews: {
    type: Number,
    required: true,
    min: 0 // Ensures reviews is a non-negative number
  },
  image: {
    type: String, // Image filename or URL
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0 // Ensures stock is a non-negative number
  },
  features: [
    {
      type: String, // Array of feature strings
      required: true
    }
  ]
});

module.exports = mongoose.model('Product', productSchema);
