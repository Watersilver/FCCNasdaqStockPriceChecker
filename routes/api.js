/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const https = require('https');

var expect = require('chai').expect;

module.exports = function (app, db) {
  
  // Test Api
  app.route('/test')
    .get(function (req, res) {
    
    // Change "symbol" to get quote for another stock
    https.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=MSFT&apikey=' + process.env.ALPHA_VANTAGE_API_KEY, (apiRes) => {
      let data = '';

      // A chunk of data has been recieved.
      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      apiRes.on('end', () => {
        res.json(JSON.parse(data));
      });

    }).on("error", (err) => {
      res.send(err.message);
    });
  });

  // Would use library for https requests. Won't, to stick to default packages for project
  app.route('/api/stock-prices')
    .get(function (req, res){
    let stock = req.query.stock;
    const like = req.query.like == "true" ? req.ip : null;
    
    if (!stock) return res.send("Please enter a stock.");
    else if (Array.isArray(stock)) {
      // Handle two stocks
      // Look for first stock
      https.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+stock[0].toUpperCase()+'&apikey=' + process.env.ALPHA_VANTAGE_API_KEY, (apiRes1) => {
        let data1 = '';

        // A chunk of data has been recieved.
        apiRes1.on('data', (chunk) => {
          data1 += chunk;
        });

        // The whole response has been received.
        apiRes1.on('end', () => {
          const gq1 = JSON.parse(data1)["Global Quote"];
          const stock1 = gq1["01. symbol"];
          if (!stock1) return res.send("Please enter valid stocks.");
          const price1 = gq1["05. price"];
          const likeField = like ? {$addToSet: {likes: like}} : {};
          
          db.collection("stocks").findOneAndUpdate(
            {stock: stock1},
            {
              $setOnInsert: {
                stock: stock1
              },
              ...likeField
            },
            {returnOriginal: false, upsert: true}
          )
          .then(result1 => {
            
            // Look for second stock
            https.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+stock[1].toUpperCase()+'&apikey=' + process.env.ALPHA_VANTAGE_API_KEY, (apiRes2) => {
              let data2 = '';

              // A chunk of data has been recieved.
              apiRes2.on('data', (chunk) => {
                data2 += chunk;
              });

              apiRes2.on('end', () => {
                const gq2 = JSON.parse(data2)["Global Quote"];
                const stock2 = gq2["01. symbol"];
                if (!stock2) return res.send("Please enter valid stocks.");
                const price2 = gq2["05. price"];
          
                db.collection("stocks").findOneAndUpdate(
                  {stock: stock2},
                  {
                    $setOnInsert: {
                      stock: stock2
                    },
                    ...likeField
                  },
                  {returnOriginal: false, upsert: true}
                )
                .then(result2 => {
                  const likes1 = result1.value.likes ? result1.value.likes.length : 0;
                  const likes2 = result2.value.likes ? result2.value.likes.length : 0;
                  
                  res.json({
                    stockData: [
                      {stock: result1.value.stock, price: price1, rel_likes: likes1 - likes2},
                      {stock: result2.value.stock, price: price2, rel_likes: likes2 - likes1}
                    ]
                  });
                })
                .catch(error => {
                  console.error(error);
                  res.send("error. Check server console.");
                });
              });

            }).on("error", (err) => {
              console.error("Error during second alphavantage request.")
              console.error(err.message);
              res.send("Error. Check server console.");
            });
            
          })
          .catch(error => {
            console.error(error);
            res.send("error. Check server console.");
          });

        });
        
      }).on("error", (err) => {
        console.error("Error during first alphavantage request.")
        console.error(err.message);
        res.send("Error. Check server console.");
      });
    }
    else {
      // Handle one stock
      https.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+stock.toUpperCase()+'&apikey=' + process.env.ALPHA_VANTAGE_API_KEY, (apiRes) => {
        let data = '';

        // A chunk of data has been recieved.
        apiRes.on('data', (chunk) => {
          data += chunk;
        });

        // The whole response has been received.
        apiRes.on('end', () => {
          const gq = JSON.parse(data)["Global Quote"];
          stock = gq["01. symbol"];
          if (!stock) return res.send("Please enter valid stock.");
          const price = gq["05. price"];
          const likeField = like ? {$addToSet: {likes: like}} : {};
          
          db.collection("stocks").findOneAndUpdate(
            {stock: stock},
            {
              $setOnInsert: {
                stock: stock
              },
              ...likeField
            },
            {returnOriginal: false, upsert: true}
          )
          .then(result => {
            res.json({stockData: {stock: result.value.stock, price: price, likes: result.value.likes ? result.value.likes.length : 0}})
          })
          .catch(error => {
            console.error(error);
            res.send("error. Check server console.");
          });
        });

      }).on("error", (err) => {
        console.error(err.message);
        res.send("Error. Check server console.");
      });
    }
  });
    
};
