const shopify = require("shopify-admin-api");
const { request, gql } = require("graphql-request");
const config = require("dotenv/config");

const customerService = new shopify.Customers(process.env.storeUrl,process.env.ShopifyAccessToken);
const createCustomer = async function (data) {
    console.log('creating customer')
    try {
        let customer = await customerService.create({
            email:data.emailAddress,
            firstName:data.firstName,
            lastName:data.lastName
        })
        console.log("customer created",customer)
        return customer;
    } catch (err) {
        return err;
    }
}
module.exports.createCustomer = createCustomer;