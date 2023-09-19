const express = require("express");
const route = express.Router();
const {syncShopify} = require("../model/shopify");
const{createCustomer}=require('../model/createCustomer');

var bodyParser = require('body-parser')

const app=express();
app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json());
route.use("/api",async (req,res)=>{
    let data = req.body;
    console.log(data);
    console.log("processing data..");
    let response = await syncShopify(data);
    res.send(response);
})
route.post("/create_customer",async(req,res)=>{
    let data = req.body;
    let response = await createCustomer(data);
    res.send(response);
})
module.exports = route;