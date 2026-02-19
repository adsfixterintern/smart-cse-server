require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const storage = multer.memoryStorage(); 
const upload = multer({ storage });

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const encodedPass = encodeURIComponent(process.env.DB_PASS);

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    const routinesCollection = db.collection("routines");
    const attendanceCollection = db.collection("attendance");
    const paymentsCollection = db.collection("payments");
    const settingsCollection = db.collection("settings");


   

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

    const verifyTeacher = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await usersCollection.findOne({ email });

  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return res.status(403).send({ 
      message: "Forbidden access (Teachers or Admins only)" 
    });
  }
  next();
};

    const verifyTeacherOrAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      
      const user = await usersCollection.findOne({ email });
      if (!user || (user.role !== "admin" && user.role !== "teacher")) {
        return res
          .status(403)
          .send({ message: "Forbidden access (Teacher or Admin only)" });
      }
      next();
    };



    // clodinary upload route
  app.post("/upload-image", verifyJWT, verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded" });
    }
    const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
      upload_preset: "smart_cse_preset",
      folder: "smart_cse_uploads", 
    });

    res.json({ 
      url: uploadResponse.secure_url, 
      public_id: uploadResponse.public_id 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Image upload failed" });
  }
});

    app.delete("/delete-image/:publicId", verifyJWT, verifyAdmin, async (req, res) => {
      const publicId = req.params.publicId;
      try {
        await cloudinary.uploader.destroy(publicId);
        res.send({ message: "Image deleted from Cloudinary" });
      } catch (err) {
        res.status(500).send({ message: "Delete failed" });
      }
    });




    // User related routes

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await client.db("smartCse").collection("users").findOne({ email });

    if (user && user.password === password) {
      const token = jwt.sign(
        { email: user.email, role: user.role, id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.send({ 
        token, 
        user: { id: user._id, email: user.email, role: user.role, name: user.name } 
      });
    } else {
      return res.status(401).send({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
});


    app.get("/users", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
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
    app.delete("/users/:id",verifyJWT,verifyAdmin, async (req, res) => {
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


     // routines routes
    app.get("/routines", async (req, res) => {
      const semester = req.query.semester;
      const query = semester ? { semester } : {};
      const result = await routinesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/routines", verifyJWT, verifyAdmin, async (req, res) => {
      const routine = req.body;
      const result = await routinesCollection.insertOne(routine);
      res.send(result);
    });

    app.delete("/routines/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await routinesCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

app.patch("/routines/:id", verifyJWT, verifyTeacherOrAdmin, async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body; 
  delete updatedData._id;

  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      ...updatedData,
      updatedAt: new Date() 
    },
  };

  try {
    const result = await routinesCollection.updateOne(filter, updateDoc);
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Routine not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed", error });
  }
});


    // ÷ Attendance routes
    app.get("/attendance", verifyJWT, async (req, res) => {
      const { batch, date } = req.query;
      const query = { batch, date };
      const result = await attendanceCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/attendance", verifyJWT, verifyAdmin, async (req, res) => {
      const data = req.body; 
      const result = await attendanceCollection.insertMany(data);
      res.send(result);
    });


    // financial routes
    app.get("/payments", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await paymentsCollection.find().toArray();
      res.send(result);
    });

    app.post("/payments", verifyJWT, verifyAdmin, async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      res.send(result);
    });


    // settings routes






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
