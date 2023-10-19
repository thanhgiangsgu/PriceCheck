

const ProductModel = require('../models/Product')
const fs = require('fs');

const axios = require('axios');
const cheerio = require('cheerio')


class Product {
    async crawlData(req, res) {
        function insertDataIntoProductInfo(item, categoryId) {
            console.log(item.id);
            const sql = require("mssql/msnodesqlv8")
            var request = new sql.Request();

            request.query(
                `INSERT INTO product_tmp (ProductID, Name, Description, ImageURL, OriginalURL, CategoryID)
                 VALUES (${item.id}, N'${item.name}', '', '${item.thumbnail_url}', '${item.url_path}', '${categoryId}');`,
                function (err, result) {
                    if (err) console.error(err);
                    else console.log(`Thêm dữ liệu thành công: ${item.name}`);
                }
            );
        }

        try {
            // Lấy các thông tin từ Query Params
            const { limit, include, aggregations, version, trackity_id, category, page, urlKey } = req.body;

            // Khởi tạo một mảng để lưu trữ dữ liệu từ các trang
            const data = [];

            // Lặp qua từ trang 1 đến trang 'page'
            for (let index = 1; index <= page; index++) {
                const apiUrl = `https://tiki.vn/api/personalish/v1/blocks/listings?limit=${limit}&include=${include}&aggregations=${aggregations}&version=${version}&trackity_id=${trackity_id}&category=${category}&page=${index}&urlKey=${urlKey}`;

                // Gọi API để lấy dữ liệu từ trang hiện tại
                const response = await axios.get(apiUrl);
                const fullData = response.data.data;

                // Duyệt qua tất cả các mục trong fullData và thêm vào bảng productInfo
                fullData.forEach(async (item) => {
                    await insertDataIntoProductInfo(item, urlKey);
                });

            }
        } catch (error) {
            // Xử lý lỗi khi yêu cầu thất bại
            if (error.response) {
                // Lỗi trả về từ máy chủ với mã trạng thái
                console.error('Lỗi máy chủ:', error.response.status, error.response.statusText);
            } else if (error.request) {
                // Lỗi không có phản hồi từ máy chủ
                console.error('Lỗi yêu cầu:', error.request);
            } else {
                // Lỗi xảy ra trong quá trình xử lý yêu cầu
                console.error('Lỗi xử lý yêu cầu:', error.message);
            }
        }
    }

    async getAllData(req, res) {
        const sql = require('mssql/msnodesqlv8')
        try {
            // Truy vấn dữ liệu từ bảng product
            const result = await sql.query`SELECT * FROM product_detail`;
            // Ghi dữ liệu vào tệp
            const dataToWrite = JSON.stringify(result.recordset, null, 2);
            fs.writeFileSync('product_detail_data.json', dataToWrite, 'utf8');

            console.log('Dữ liệu đã được ghi vào tệp product_detail_data.json');
        } catch (error) {
            console.log("Lỗi khi truy vấn dữ liệu hoặc ghi dữ liệu vào tệp");
        }
    }

    async getData(req, res) {
        const productID = req.params.productID;
        const apiUrl = `https://tiki.vn/api/v2/products/${productID}`;
        try {
            const response = await axios.get(apiUrl);
            console.log(response.data.id);
            if (response.data !== null && response.data.hasOwnProperty('short_description')) {
                const description = response.data.short_description;
                if (description !== null && description.trim() !== '') {
                    res.json({ data: description });
                } else {
                    res.status(404).json({ error: 'Không có dữ liệu hoặc dữ liệu rỗng.' });
                }
            } else {
                res.status(404).json({ error: 'Không có trường "short_description".' });
            }
        } catch (apiError) {
            res.status(500).json({ error: `Lỗi khi gọi API cho ProductID ${productID}: ${apiError.message}` });
        }
    }

    async getDataWithNullDescription(req, res) {
        try {
            const sql = require("mssql/msnodesqlv8");
            // Truy vấn SQL để lấy tất cả các bản ghi có trường 'description' là NULL
            const result = await sql.query`SELECT * FROM product WHERE description IS NULL or description = ''`;

            // Lấy dữ liệu từ kết quả truy vấn
            const dataWithNullDescription = result.recordset;

            // Ghi dữ liệu vào một tệp JSON
            fs.writeFileSync('data_with_null_description.json', JSON.stringify(dataWithNullDescription, null, 2));

            // Trả về dữ liệu với trạng thái 200 OK
            res.status(200).json({ message: 'Dữ liệu đã được lưu vào tệp JSON.' });
        } catch (error) {
            console.error('Lỗi khi truy vấn hoặc ghi tệp JSON:', error);
            res.status(500).json({ error: 'Đã xảy ra lỗi.' });
        }
    }

    async processDataFileAndSyncData(req, res) {
        const dataFromFile = fs.readFileSync('data_with_null_description.json', 'utf8');
        const listData = JSON.parse(dataFromFile);
        const sql = require("mssql/msnodesqlv8")

        const productIDs = [];
        listData.forEach((data) => {
            productIDs.push(data.ProductID);
        });
        try {
            for (const productID of productIDs) {
                const apiUrl = `https://tiki.vn/api/v2/products/${productID}`;

                console.log(apiUrl);

                try {
                    const response = await axios.get(apiUrl);
                    if (response.data !== null && response.data.hasOwnProperty('short_description')) {
                        const description = response.data.short_description;

                        if (description !== null && description.trim() !== '') {
                            // Tạo truy vấn SQL để cập nhật description
                            const updateQuery = `
                                UPDATE product
                                SET Description = @description
                                WHERE ProductID = @productID`;

                            const request = new sql.Request();
                            request.input('description', sql.NVarChar, description);
                            request.input('productID', sql.Int, productID);

                            // Thực hiện truy vấn SQL để cập nhật Description
                            await request.query(updateQuery);

                            console.log(`Cập nhật Description cho ProductID ${productID}`);
                        } else {
                            console.log(`Không cập nhật Description cho ProductID ${productID} vì nó bằng NULL hoặc rỗng.`);
                        }
                    } else {
                        console.log(`Không có trường 'short_description' cho ProductID ${productID}`);
                    }
                } catch (apiError) {
                    console.error(`Lỗi khi gọi API cho ProductID ${productID}:`, apiError);
                }
            }
        } catch (error) {
            console.log("Lối kết nối với cơ sở dữ liệu");
        }
    }

    async crawlAllProductDetail(req, res) {
        const dataFromFile = fs.readFileSync('data_cleaned.json', 'utf8');
        const productData = JSON.parse(dataFromFile);
        const sql = require("mssql/msnodesqlv8")
        var request = new sql.Request();
        async function insertProductDetail(productID) {
            try {
                const apiUrl = `https://tiki.vn/api/v2/products/${productID}`;
                const response = await axios.get(apiUrl);
                if (response.data.status !== 404) {
                    const productInfo = response.data;
                    var quantity_sold = 0;
                    var categoriesName = "";

                    if (productInfo.quantity_sold) {
                        quantity_sold = productInfo.quantity_sold.value;
                    }

                    if (productInfo.categories) {
                        categoriesName = productInfo.categories.name;
                    }

                    try {
                        request.query(
                            `INSERT INTO product_detail (ProductID, Price, original_price, rating_average, review_count, categories, quantity_sold)
                        VALUES ('${productID}', '${productInfo.price}', '${productInfo.original_price}', '${productInfo.rating_average}', '${productInfo.review_count}', N'${categoriesName}', '${quantity_sold}') `,
                            function (err, result) {
                                if (err) {
                                    console.error(err);
                                } else {
                                    console.log(`Thêm dữ liệu thành công: ${productID}`);
                                }
                            }
                        );
                    } catch (error) {
                        console.log("Lỗi khi thêm dữ liệu ", productID);
                    }
                } else {
                    console.log(`productID ${productID} không tồn tại hoặc có lỗi (status 404). Không thực hiện thêm dữ liệu.`);
                }
            } catch (error) {
                console.log("Api bị lỗi");
            }
        }

        for (const product of productData) {
            const productID = product.ProductID;
            // Thực hiện các tác vụ liên quan đến productID ở đây
            // Ví dụ: Gọi hàm để lấy thông tin chi tiết của sản phẩm và cập nhật vào cơ sở dữ liệu
            await insertProductDetail(productID);
        }
    }

    async cleanData(req, res) {
        try {
            const sql = require("mssql/msnodesqlv8");
            // Truy vấn SQL để lấy tất cả các bản ghi có trường 'description' là NULL
            const result = await sql.query`SELECT p.*
            FROM product p
            LEFT JOIN product_detail pd ON p.ProductID = pd.ProductID
            WHERE pd.ProductID IS NULL;
            `;

            // Lấy dữ liệu từ kết quả truy vấn
            const dataWithNullDescription = result.recordset;

            // Ghi dữ liệu vào một tệp JSON
            fs.writeFileSync('data_cleaned.json', JSON.stringify(dataWithNullDescription, null, 2));

            // Trả về dữ liệu với trạng thái 200 OK
            res.status(200).json({ message: 'Dữ liệu đã được lưu vào tệp JSON.' });
        } catch (error) {
            console.error('Lỗi khi truy vấn hoặc ghi tệp JSON:', error);
            res.status(500).json({ error: 'Đã xảy ra lỗi.' });
        }
    }

    async deleteDataNotFound(req, res) {
        try {
            const sql = require("mssql/msnodesqlv8")
            // Đọc dữ liệu từ tệp JSON "data_cleaned.json"
            const rawData = fs.readFileSync('data_cleaned.json', 'utf8');
            const jsonData = JSON.parse(rawData);

            // Lặp qua từng mục trong dữ liệu JSON và xóa dữ liệu từ bảng "product" dựa trên "ProductID"
            for (const item of jsonData) {
                const productID = item.ProductID;

                // Thực hiện xóa dữ liệu từ bảng "product" sử dụng câu lệnh SQL
                const request = new sql.Request();
                await request.input('productID', sql.Int, productID);
                await request.query('DELETE FROM product WHERE ProductID = @productID');
            }

            console.log('Dữ liệu đã được xóa thành công.');

        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu:', error);
        }
    }

    async convertProductDetailToSql(req, res) {
        try {
            // Đọc dữ liệu từ tệp JSON
            const data = fs.readFileSync('product_detail_data.json');
            const jsonData = JSON.parse(data);

            // Khởi tạo mảng để lưu các câu lệnh INSERT
            const insertQueries = [];

            // Lặp qua từng mục dữ liệu và tạo câu lệnh INSERT
            jsonData.forEach((item) => {
                const insertQuery = `INSERT INTO final_product_detail (ProductID, Price, original_price, rating_average, review_count, categories, quantity_sold, SearchDate) VALUES 
                        (${item.ProductID}, ${item.Price}, ${item.original_price}, ${item.rating_average}, ${item.review_count}, '${item.categories}', ${item.quantity_sold}, CAST('${item.SearchDate}' AS DATE))`;
                insertQueries.push(insertQuery);
            });

            // Ghi các câu lệnh INSERT vào tệp
            fs.writeFileSync('insert_queries.sql', insertQueries.join('\n'));

            res.send('Câu lệnh INSERT đã được ghi vào tệp insert_queries.sql.');
        } catch (error) {
            console.log("Lỗi");
        }
    }

    async convertProductToSql(req, res) {
        try {
            // Đọc dữ liệu từ tệp JSON
           const data = fs.readFileSync('product_data.json')
           const jsonData = JSON.parse(data)
    
            // Khởi tạo mảng để lưu các câu lệnh INSERT
            const insertQueries = []
            // Lặp qua từng mục dữ liệu và tạo câu lệnh INSERT
            jsonData.forEach((item) => {
                const insertQuery = `INSERT INTO product (ProductID, Name, Description, ImageURL, OriginalURL, CategoryID) VALUES 
                    (${item.ProductID}, '${item.Name}', '${item.Description}', '${item.ImageURL}', '${item.OriginalURL}', '${item.CategoryID}')`;
                insertQueries.push(insertQuery);
            });
    
            // Ghi các câu lệnh INSERT vào tệp
            fs.writeFileSync('insert_product_queries.sql', insertQueries.join('\n'))
            res.send('Caau leenhj INSERT ddax dduwowcj ghi vafo teepj insert_querues.sql')
        } catch (error) {
            console.log('Lỗi: ' + error);
            res.status(500).send('Lỗi xử lý dữ liệu.');
        }
    }



}

module.exports = new Product

