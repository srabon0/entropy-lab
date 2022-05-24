const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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

async function run() {
  try {
    await client.connect();
    const database = client.db("entropyLab");
    const itemCollection = database.collection("labItems");
    const userCollection = database.collection("users");
    const orderCollection = database.collection("orders");
    const reviewCollection = database.collection("review");
    console.log("EntropyLab server connected");

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

    //additem
    app.post("/additem", async (req, res) => {
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

    //delete an item
    app.delete("/item/:id", async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: ObjectId(itemId) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
      console.log(itemId);
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

    app.post("/order", async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //get all user
    app.get("/users", verifyJWT, async (req, res) => {
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

    app.delete('/deluser/:id',verifyJWT, async(req,res)=>{
      const userId = req.params.id
      console.log(userId)
      const query = { _id: ObjectId(userId) };
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })

    //make user admin

    app.put("/makeadmin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
        const updateDoc = {
          $set: { role: "Admin" }
        }
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send( result );
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
      console.log(item);
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
