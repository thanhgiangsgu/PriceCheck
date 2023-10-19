var express = require('express')
const router = express.Router()

const user = require('../App/controllers/Product.js')


router.post('/data', user.crawlData)
router.get('/getAllData' , user.getAllData)
router.get('/get-data/:productID', user.getData)
router.get('/get-data-with-null-des', user.getDataWithNullDescription)
router.get('/process-data-file-and-syncdata', user.processDataFileAndSyncData)
router.get('/crawl-all-product-detail' , user.crawlAllProductDetail)
router.get('/clean-data' , user.cleanData)
router.get('/delete-data-not-found', user.deleteDataNotFound)
router.get('/convert-product-detail', user.convertProductDetailToSql)
router.get('/convert-product', user.convertProductToSql)


module.exports = router