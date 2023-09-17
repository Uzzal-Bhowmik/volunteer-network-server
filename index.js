const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());

// mongo db
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5732rtt.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// jwt token verify
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }

  // token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }

    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();

    const eventCollection = client
      .db("volunteerNetworkDB")
      .collection("events");

    const registeredEventCollection = client
      .db("volunteerNetworkDB")
      .collection("registeredEvents");

    // jwt token method
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    // events get method
    app.get("/events", async (req, res) => {
      const result = await eventCollection.find().toArray();
      res.send(result);
    });

    // single event get method
    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // events register get method based on query
    app.get("/registeredEvents", verifyToken, async (req, res) => {
      const userEmail = req.query?.email;

      if (req.decoded.email !== userEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      let query = {};
      if (userEmail) {
        query = { email: userEmail };
      }

      const result = await registeredEventCollection.find(query).toArray();
      res.send(result);
    });

    // events register post method
    app.post("/registeredEvents", async (req, res) => {
      const body = req.body;
      const result = await registeredEventCollection.insertOne(body);
      res.send(result);
    });

    // registered event delete method
    app.delete("/registeredEvents/:id", async (req, res) => {
      const id = req.params.id;
      const result = await registeredEventCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// ----------------------------

app.get("/", (req, res) => {
  res.send("Volunteer Network server is up and running.");
});

app.listen(port, () => {
  console.log("server is running on port: ", port);
});
