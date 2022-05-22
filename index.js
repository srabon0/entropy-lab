const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wmr6eug.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("entropyLab");
    const itemCollection = database.collection("labItems");
    const userCollection = database.collection("users");
    console.log("EntropyLab server connected");

    app.get("/labitems", async (req, res) => {
      const query = {};
      const cursor = itemCollection.find(query);
      const items = await cursor.toArray();
      res.send(items);
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
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_ENC_KEY, { expiresIn: '1d' })
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.send({ result, token });
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
