const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
var nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");
const app = express();
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wmr6eug.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_ENC_KEY, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const auth = {
  auth: {
    api_key: process.env.EMAIL_API_KEY,
    domain:process.env.DOMAIN,
  },
};

const nodemailerMailgun = nodemailer.createTransport(mg(auth));



function sendConfirmOrderEmail(order) {
  const {_id,productName,pricePerUnit,customer,orderQ} = order

  var email = {
    from: "srabonema4@gmail.com",
    to: "srabonemam@gmail.com",
    subject: `You Have ordered  ${productName} - ${orderQ} unit ${pricePerUnit} is Confirmed`,
    text: `You Have ordered  ${productName} - ${orderQ} unit ${pricePerUnit} is Confirmed`,
    html: `
      <div>
        <p> Hello dear, </p>
        <h3>Your order is confirmed</h3>
        <p>You Have ordered  ${productName} - ${orderQ} unit ${pricePerUnit} is Confirmed.</p>
        <p>Please , Pay as soon as possible. order is ${_id} please store that id for future use. </p>

        <h3>Our Address</h3>
        <p>SomeWhere in Dhaka</p>
        <p>Bangladesh</p>
      </div>
    `,
  };

  nodemailerMailgun.sendMail(email, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}


async function run() {
  try {
    await client.connect();
    const database = client.db("entropyLab");
    const itemCollection = database.collection("labItems");
    const userCollection = database.collection("users");
    const orderCollection = database.collection("orders");
    const reviewCollection = database.collection("review");
    console.log("EntropyLab server connected");

    //verify as a admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
     
      const reqAcc = await userCollection.findOne({ email: requester });
      if (reqAcc.role === 'Admin') {
       
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }


    /**
     *
     * Get all item
     * Add item to the database
     *
     */
    app.get("/labitems", async (req, res) => {
      const query = {};
      const cursor = itemCollection.find(query);
      const items = await cursor.toArray();
      res.send(items);
    });

    /**
   * verify admin middleware to secure the api
   * we can use multiple middleware in express we can use it in array and comma 
  */
  
    //additem
    app.post("/additem",verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await itemCollection.insertOne(item);
      res.send(result);
    });

    //get a single item

    app.get("/item/:id", async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: ObjectId(itemId) };
      const result = await itemCollection.findOne(query);
      res.send(result);
    });

    //delete a singple product
    //delete an item
    app.delete("/removeitem/:id", verifyAdmin, async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: ObjectId(itemId) };
      const result = await itemCollection.deleteOne(query);
      res.send(result);
     
    });

    //delete an order
    app.delete("/item/:id",verifyJWT, async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: ObjectId(itemId) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
     
    });
    /**
     * Get orders
     * Add orders
     * order filter by email
     *
     */
    app.get("/order/:email", async (req, res) => {
      const email = req.params.email;
      const query = { customer: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/order",verifyJWT , async (req, res) => {
      const order = req.body;
      sendConfirmOrderEmail(order);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //get all user
    app.get("/users", verifyJWT,verifyAdmin, async (req, res) => {
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    //craeatea a new user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_ENC_KEY,
        { expiresIn: "1d" }
      );
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result, token });
    });

    ///get a user

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    //update a user
    app.put("/update/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const userinfo = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: userinfo.name,
          img: userinfo.img,
          contact: userinfo.contact,
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);

      res.send(result);
    });

    //delte a user

    app.delete('/deluser/:id',verifyJWT,verifyAdmin, async(req,res)=>{
      const userId = req.params.id

      const query = { _id: ObjectId(userId) };
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })

    //make user admin

    app.put("/secretAdmin/:email" , async (req, res) => {
      const wannabeAdminEmail = req.params.email;
      const options = { upsert: true };
      const filter = { email: wannabeAdminEmail };
      const updateDoc = {
        $set: { role: "Admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result });
    })
      

      //check a user is admin or not
      // if he is an admin 
    app.get('/isThePersonAdmin/:email',async(req,res)=>{
      const email= req.params.email;
      const user = await userCollection.findOne({email:email})
      const isAdmin = user.role === 'Admin';
      res.send({admin: isAdmin})
    })


    //all orders manage

    app.get("/orders", async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    
    //payment with txnid
    app.put("/order/pay/:id",async(req,res)=>{
      const orderId=req.params.id
      const query = {_id:ObjectId(orderId)}
      const result = await orderCollection.findOne(query)
      if(!result.transactionId){

        const updateDoc = {
          $set: { transactionId: req.body }
        }
        
        const result = await orderCollection.updateOne(query, updateDoc);
        res.send(result)
      }

    })

    //shipped or deliverd

    app.put("/order/delivered/:id",async(req,res)=>{
      const orderId=req.params.id
      const query = {_id:ObjectId(orderId)}
      const result = await orderCollection.findOne(query)
      if(!result.shipped){

        const updateDoc = {
          $set: { shipped: "Deliverd"}
        }
    
        const result = await orderCollection.updateOne(query, updateDoc);
        res.send(result)
      }

    })
    
    //all review

    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    //add a review
    app.post("/addreview", verifyJWT, async (req, res) => {
      const item = req.body;
     
      const result = await reviewCollection.insertOne(item);
      res.send(result);
    });
  } finally {
    //
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("EntropyLab Server connected");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
