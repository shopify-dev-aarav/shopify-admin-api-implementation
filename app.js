const express = require("express");
const shopify = require("./routes/shopify");
const config = require("dotenv/config");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 6000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}))
app.use("/shopify",shopify)
app.listen(port,()=>{
    console.log(`Listening to port ${port}`);
})