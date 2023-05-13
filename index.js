const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zyyhzcl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyJWT=(req,res,next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: "unAuthorized User"});
  }
  const token = authorization.split(" ")[1];

  // verifying:
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
    if(error){
      return res.status(403).send({error: true , message: "unAuthorized User"});
    }
    req.decoded = decoded;
    next();
  })

}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollections = client.db('carsDoctorDB').collection('services');
    const bookingCollections = client.db('carsDoctorDB').collection('bookings');


    // jwt:
    app.post("/jwt", (req,res)=>{
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "12h"
      });
      
      res.send({token});
    })

    // get/read all services
    app.get("/services", async(req,res)=>{

        const cars = serviceCollections.find();
        const result = await cars.toArray();
        res.send(result);

    });

    // get/read specific service
    app.get("/services/:id", async (req,res)=>{
        const id  = req.params.id;
        const query = { _id: new ObjectId(id)};
        const options = {
          projection: { title: 1, price: 1, service_id: 1, img: 1 },
        };
        const result = await serviceCollections.findOne(query, options);
        res.send(result);
    });


    // for reading some data:
    app.get('/bookings', verifyJWT, async(req, res)=>{

      const decoded = req.decoded;
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message: "Forbidden Access"});
      }

      let query = {};
      if(req.query?.email){
        query = {email: req.query.email};
      }
      const result = await bookingCollections.find(query).toArray();
      res.send(result);

    })

    // add bookings
    app.post("/bookings",async(req,res)=>{
      const booking = req.body;
      const result = await bookingCollections.insertOne(booking);
      res.send(result);      
    })

    // delete specific bookings:
    app.delete("/bookings/:id", async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollections.deleteOne(query);
      res.send(result);
    })

    // update bookings:
    app.patch("/bookings/:id", async(req,res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updatedBooking = req.body;
      const updatedDoc={
        $set:{
          status: updatedBooking.status
        },
      };
      const result = await bookingCollections.updateOne(filter,updatedDoc);
      res.send(result);

    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/" , (req,res)=>{
    res.send("car doctor is running");
});

app.listen(port, ()=>{
    console.log(`car doctor is running on port: ${port}`);
})