const mongoose = require('mongoose');

async function connect(){
    const connectionParams = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
    try {
        await mongoose.connect('mongodb+srv://thanhyarn:123@atlascluster.bfqeyvn.mongodb.net/PriceCheck', connectionParams)
        console.log("database connected");
    } catch (error) {
        console.log(error);
    }
}

module.exports = { connect }