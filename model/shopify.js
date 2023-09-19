const shopify = require("shopify-admin-api");
const {request,gql} = require("graphql-request");
const config = require("dotenv/config");

const customerService = new shopify.Customers(process.env.ShopifyStoreName,process.env.ShopifyAccessToken);
const orderService = new shopify.Orders(process.env.storeUrl,process.env.ShopifyAccessToken);
const productService = new shopify.Products(process.env.ShopifyStoreName,process.env.ShopifyAccessToken);
const getShopifyProductByHandle =  async function(productHandle){
    console.log(productHandle)
    try{
        let res = await productService.list({handle:productHandle});
        return res;
    }catch(err){
        console.log(err);
    }
}

const createShopifyOrder = async function(productData,customerData,planData){
    let selectedVariant = productData.variants.find(el => el.price == planData.fixedPricing.price)
    try{
        let res = await orderService.create({
            billing_address:{
                address1:'',
                first_name:customerData[0].firstName,
                last_name:customerData[0].lastName
            },
            line_items:[
                {
                    product_id:productData.id,
                    quantity:1,
                    variant_id:selectedVariant.id,
                },
            ],
            financial_status:"paid",
            total_price:planData.fixedPricing.price,
            email:customerData[0].emailAddress,
            note:"Order from subsbase"
        })
        return res;
    }catch(err){
        console.log(err);
    }
}

const getShopifyCustomer = async function(customerEmail){
    try{
        let res = await customerService.list({email:customerEmail});
        return res;
    }catch(err){
        console.log(err);
    }
}

const getServerTokenSubsbase = async function(){
   let tokenData = await request({
        url: "https://api.subsbase.io/auth",
        document: `query GetApiToken {
            getApiToken(siteId: "${process.env.StoreId}", apiSecret: "${process.env.SubsbaseAPISecret}") {
              isSuccess
              value
              message
            }
          }`,
        requestHeaders: {},
      });
      console.log(tokenData,process.env.StoreId,process.env.SubsbaseAPISecret)
      return tokenData;
} ;

const getCustomerIdEmailSubsbase = async function(token,customerEmail,cb){
        try{
            let res = await request({
                url:"https://api.subsbase.io/core/graphql",
                document:`query GetCustomers{
                    customers(siteId: "${process.env.StoreId}", filter: { field : "emailAddress", operator:Equal, value:"${customerEmail}"}) {
                        isSuccess
                        message
                        data {
                            customerId
                            emailAddress
                            firstName
                            lastName
                        }
                    }
                }`,
                variables:{
                    siteId:process.env.StoreId,

                },
                requestHeaders: {
                    "Authorization":`Bearer ${token.getApiToken.value}`,
                    "X-SITE-ID":`${process.env.StoreId}`
                }
            })
            return res.customers.data;
        }catch(err){
            console.log(err);
        }
}

const getCustomerById = async function(tokenData,id){
    let token = tokenData.getApiToken.value;
        try{
            let res = await request({
                url:"https://api.subsbase.io/core/graphql",
                document:`query GetCustomer{
                    customer(siteId: "${process.env.StoreId}", customerId: "${id}") {
                        customerId
                        firstName
                        lastName
                        emailAddress
                        subscriptions{
                            startedOn
                            quantity
                            plan{
                                planCode
                                productName
                                fixedPricing{
                                    price
                                }
                                status
                            }
                        }
                    }
                }`,
                variables:{
                    siteId:process.env.StoreId,
                    customerId:id
                },
                requestHeaders: {
                    "Authorization":`Bearer ${token}`,
                    "X-SITE-ID":`${process.env.StoreId}`
                }
            })
            return res.customer;
        }catch(err){
            console.log(err);
        }
}

const createCustomerShopify = async function(data){
    try{
        let customer = await customerService.create({
            email:data.emailAddress,
            firstName:data.firstName,
            lastName:data.lastName
        })
        return customer;
    }catch(err){
        console.log(err)
    }
}

const syncShopify = async function(data){
    let {customer} = data;
    console.log(customer)
    try{
        //////////////Subsbase token data to access data from subsbase
        let tokenData = await getServerTokenSubsbase();
        console.log("token created ...")
        ////////////Subsbase customer data getting by email provided by webhook we need this to get customer data
        let customerData = await getCustomerIdEmailSubsbase(tokenData,customer.emailAddress);
        console.log("customer data recieved ...",customerData)
        ///////////Subsbase customer data with plandata
        let customerPlanData = await getCustomerById(tokenData,customerData[0].customerId);
        let handle = customerPlanData.subscriptions[0].plan.productName
        console.log("customer plan data recieved ...",customerPlanData.subscriptions[0].plan)
        ///////////Getting the customer data from shopify
        let shopifyCustomer = await getShopifyCustomer(customerData[0].emailAddress);

        //////////if customer does not exist create a new customer
        shopifyCustomer = shopifyCustomer[0] ? shopifyCustomer[0] : await createCustomerShopify(customerData[0]);
        console.log("shopify customer data recieved ...",shopifyCustomer)
        //////////getting product from shopify with the same as plancode handle
        let shopifyProduct = await getShopifyProductByHandle(handle);
        console.log("shopify product data recieved ...");
        console.log(shopifyProduct)
        ///////// creating shopify order in the above corresponding account
        let shopifyOrder = await createShopifyOrder(shopifyProduct[0],customerData,customerPlanData.subscriptions[0].plan);
        console.log("order created ...");
        return shopifyOrder;
        // return shopifyOrder;
    }catch(err){
        console.log(err)
        return err;
    }
}

module.exports.syncShopify = syncShopify;