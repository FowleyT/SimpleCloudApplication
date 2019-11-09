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
  var dynamodb = new aws.DynamoDB();
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
app.get('/QueryDB', (req, res) => {
  var docClient = new aws.DynamoDB.DocumentClient();
  var table = "Movies";

//do a for loop of each movie and
//if movie.title begins with the input title and movie.year == input year
// then add it to (an array?) a JSON object

  var year = 1973;
  var title = "Enter the Dragon";

  var params = {
    TableName: table,
    Key:{
        "year": year,
        "title": title
    }
  };
  docClient.get(params, function(err, data) {
    if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
        res.send(data)
      }
    });
});




//creates the table and stores info from the s3 object in it
app.get('/createDB', (req, res) => {
  var dynamodb = new aws.DynamoDB();
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
  var allMovies = s3obj;   //JSON.parse(s3obj);
  allMovies.forEach(function(movie) {
    var params = {
        TableName: "Movies",
        Item: {
            "year":  movie.year,
            "title": movie.title,
            "plot":  movie.info.plot,
            "director": movie.info.director,
            "image_url":movie.info.image_url
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
