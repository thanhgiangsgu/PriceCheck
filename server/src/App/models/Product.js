const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    imageURL: {
        type: String,
    },
    price: {    
        type: Number,
    },
    originalURL: {
        type: String,
    },
    searchDate: {
        type: Date,
        default: Date.now, // Mặc định là ngày hiện tại
    },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;