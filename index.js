require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const encodedPass = encodeURIComponent(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${encodedPass}@cluster0.mdmdo0u.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
app.post("/jwt", async (req, res) => {
  const user = req.body;

  const token = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.send({ token });
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }

    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const db = client.db("smartCse");
    const usersCollection = db.collection("users");
    const coursesCollection = db.collection("courses");
    // Admin verification middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;

      const user = await usersCollection.findOne({ email });

      if (!user || user.role !== "admin") {
        return res
          .status(403)
          .send({ message: "Forbidden access (admin only)" });
      }

      next();
    };
    // User related routes
    app.get("/users", async (req, res) => {
      try {
        const email = req.query.email;
        const role = req.query.role;

        let query = {}; // Default empty object (shob user dekhabe)

        // Jodi query-te email thake, query object-e add hobe
        if (email) {
          query.email = email;
        }

        // Jodi query-te role thake (admin/user), query object-e add hobe
        if (role) {
          query.role = role;
        }

        // Dynamic query diye database search
        const users = await usersCollection.find(query).toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });
    app.post("/users", async (req, res) => {
      const user = req.body;

      if (!user.email) {
        return res.status(400).send({ message: "Email is required" });
      }

      const existingUser = await usersCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.status(409).send({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );

      res.send(result);
    });
    // course related routes
    app.get("/courses", async (req, res) => {
      const courseCode = req.query.code;

      let query = {};

      if (courseCode) {
        query.courseCode = courseCode;
      }
      const courses = await coursesCollection.find(query).toArray();
      res.send(courses);
    });
    app.post("/courses", async (req, res) => {
      const course = req.body;
      const existingCourse = await coursesCollection.findOne({
        courseCode: course.code,
      });

      if (existingCourse) {
        return res.status(409).send({ message: "Course already exists" });
      }
      const result = await coursesCollection.insertOne(course);
      res.send(result);
    });
    app.delete("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const result = await coursesCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    app.patch("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const result = await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );

      res.send(result);
    });
    app.get("/courses/code/:code", async (req, res) => {
      const code = Number(req.params.code); // string → number

      const course = await coursesCollection.findOne({ code });

      if (!course) {
        return res.status(404).send({ message: "Course not found" });
      }

      res.send(course);
    });

    await client.connect();
    console.log("Connected to MongoDB");

    await client.db("admin").command({ ping: 1 });
    console.log("Ping successful");

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();
