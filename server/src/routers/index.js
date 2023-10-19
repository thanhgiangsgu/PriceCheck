const product = require('./Product');

function route(app){

    app.use('/crawl' , product)
    
}

module.exports = route;