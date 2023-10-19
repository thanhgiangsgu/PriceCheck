const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3003;

const route = require('./src/routers');
app.use(bodyParser.json());
const cors = require('cors'); // Import thư viện CORS

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const sql = require("mssql/msnodesqlv8")
var config = {
    user: 'sa',
    password: '123123',
    server: 'DESKTOP-DB2AF5H\\SQLEXPRESS',
    database: 'PriceCheck',
    driver: 'msnodesqlv8',
    option: {
        trustedConnection: true
    }
}

sql.connect(config, function(err) {
    if (err) console.error(err);
    var request = new sql.Request();
    request.query("select * from Category" , function(err, records) {
        if (err) console.error(err);
        else console.log(records);
    })
})


app.use(cors());


route(app);

app.listen(port, () => console.log('Example app listening at localhost port'));
