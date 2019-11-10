console.log("hello")
const publicKey = "AKIAZTJ5VBOC2B2H424E"
const privateKey = "3XrTvd3fggMdTg29/Pi1yke3l1hFCXkFC+b5g7CD"
var aws = require("aws-sdk");
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const morgan = require('morgan')
//const axios = require('axios')

const app =express()
app.use(morgan('combined'))
app.use(bodyParser.json())
app.use(cors())
app.listen(process.env.PORT || 8081)

var allMovies;
var dynamodb;
aws.config.update({
  accessKeyId: publicKey,
  secretAccessKey: privateKey,
  region:'eu-west-1'
})
const s3 = new aws.S3();
var bucketParams = {
 Bucket: "csu44000assignment2",
 Key: "moviedata.json"
}
var s3obj = '';
s3.getObject(bucketParams, function(err, data) {
  if (err) {
      console.log(err, err.stack); // an error occurred
  } else {
      console.log(data.Body);           // successful response
      s3obj = JSON.parse(data.Body.toString('utf-8'));
  }
});


//deletes the table
app.get('/deleteDB', (req, res) => {
  dynamodb = new aws.DynamoDB();
  var paramsForDelete = {
    TableName : "Movies"
  };
  dynamodb.deleteTable(paramsForDelete, function(err, data) {
      if (err) {
          console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
      }
  });
  res.send(JSON.parse('{"status":"done"}'));
})




//queries the table based on the year and name user input
app.get('/QueryDB/:year/:title', (req, res) => {
  var docClient = new aws.DynamoDB.DocumentClient();
  //var table = "Movies";
  var year = parseInt(req.params.year);
  var title = req.params.title;

  var searchResults = {"movies":[]};


  console.log("Querying for movies from " + year + " with title begginning with " + title );

  var params = {
      TableName : "Movies",
      ProjectionExpression:"#yr, title, plot, director, #r, release_date",
      KeyConditionExpression: "#yr = :yyyy and begins_with (title, :substr)",
      ExpressionAttributeNames:{
          "#yr": "year",
          "#r": "rank"
      },
      ExpressionAttributeValues: {
          ":yyyy": year,
          ":substr": title
      }
  };

  docClient.query(params, function(err, data) {
      if (err) {
          console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
          console.log("Query succeeded.");
          data.Items.forEach(function(item) {
              console.log(item.title);
              searchResults.movies.push(item);
              console.log(searchResults)
          });
      }
  });
  console.log(searchResults)

  setTimeout(function(){
   res.send(searchResults)
 }, 2000);
});




//creates the table and stores info from the s3 object in it
app.get('/createDB', (req, res) => {
  dynamodb = new aws.DynamoDB();
  var params = {
      TableName : "Movies",
      KeySchema: [
          { AttributeName: "year", KeyType: "HASH"},  //Partition key
          { AttributeName: "title", KeyType: "RANGE" }  //Sort key
      ],
      AttributeDefinitions: [
          { AttributeName: "year", AttributeType: "N" },
          { AttributeName: "title", AttributeType: "S" }
      ],
      ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
      }
  };
  dynamodb.createTable(params, function(err, data) {
      if (err) {
          console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
      }
  });
  var docClient = new aws.DynamoDB.DocumentClient();
  allMovies = s3obj;   //JSON.parse(s3obj);
  allMovies.forEach(function(movie) {
    var params = {
        TableName: "Movies",
        Item: {
            "year":  movie.year,
            "title": movie.title,
            "plot":  movie.info.plot,
            "director": movie.info.directors[0],
            "rank": movie.info.rank,
            "release_date": movie.info.release_date
        }
    };
    setTimeout(function(){
      docClient.put(params, function(err) {
         if (err) {
             console.error("Unable to add movie", movie.title);
         } else {
             console.log("PutItem succeeded:", movie.title);
         }
      });
    }, 2000);

});

res.send(JSON.parse('{"status":"done"}'));

})
