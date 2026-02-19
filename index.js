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
    const coursesCollection = db.collection("courses");
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
          message: "Forbidden access (Teachers or Admins only)",
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
    app.post(
      "/upload-image",
      verifyJWT,
      verifyAdmin,
      upload.single("image"),
      async (req, res) => {
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
            public_id: uploadResponse.public_id,
          });
        } catch (err) {
          console.error(err);
          res.status(500).send({ message: "Image upload failed" });
        }
      },
    );

    app.delete(
      "/delete-image/:publicId",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const publicId = req.params.publicId;
        try {
          await cloudinary.uploader.destroy(publicId);
          res.send({ message: "Image deleted from Cloudinary" });
        } catch (err) {
          res.status(500).send({ message: "Delete failed" });
        }
      },
    );

    // User related routes

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      try {
        const user = await client
          .db("smartCse")
          .collection("users")
          .findOne({ email });

        if (!user) {
          return res.status(401).send({ message: "Invalid email or password" });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (isPasswordMatch) {
          const token = jwt.sign(
            { email: user.email, role: user.role, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" },
          );

          return res.send({
            token,
            user: {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
              name: user.name,
            },
          });
        } else {
          return res.status(401).send({ message: "Invalid email or password" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // get all users (admin only)
    app.get("/users", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // post new user (registration)

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        if (!user.email || !user.password) {
          return res
            .status(400)
            .send({ message: "Email and password are required" });
        }

        const existingUser = await usersCollection.findOne({
          email: user.email,
        });
        if (existingUser) {
          return res.status(409).send({ message: "User already exists" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);

        const newUser = {
          ...user,
          password: hashedPassword,
          createdAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Registration failed" });
      }
    });

    // delete user (admin only)
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
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
      const code = Number(req.params.code);

      const course = await coursesCollection.findOne({ code });

      if (!course) {
        return res.status(404).send({ message: "Course not found" });
      }

      res.send(course);
    });

    // routines routes

    // get routines with optional semester filter
    app.get("/routines", async (req, res) => {
      const semester = req.query.semester;
      const query = semester ? { semester } : {};
      const result = await routinesCollection.find(query).toArray();
      res.send(result);
    });

    // create new routine (admin only)
    app.post("/routines", verifyJWT, verifyAdmin, async (req, res) => {
      const routine = req.body;
      const result = await routinesCollection.insertOne(routine);
      res.send(result);
    });

    // delete routine (admin only)
    app.delete("/routines/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await routinesCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // update routine (admin or teacher)
    app.patch(
      "/routines/:id",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        const id = req.params.id;
        const updatedData = req.body;
        delete updatedData._id;

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            ...updatedData,
            updatedAt: new Date(),
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
      },
    );

    // ÷ Attendance routes

    // get attendance with optional batch and date filters
    app.get("/attendance", verifyJWT, async (req, res) => {
      const { batch, date } = req.query;
      const query = { batch, date };
      const result = await attendanceCollection.find(query).toArray();
      res.send(result);
    });

    // post attendance (admin only)
    app.post("/attendance", verifyJWT, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await attendanceCollection.insertMany(data);
      res.send(result);
    });

    // get attendance for a specific student with optional course filter
    app.get("/attendance/user/:studentId", verifyJWT, async (req, res) => {
      try {
        const { studentId } = req.params;
        const { courseCode } = req.query;
        চায়;

        let query = { "students.id": studentId };
        if (courseCode) query.courseCode = courseCode;

        const records = await attendanceCollection.find(query).toArray();
        const formattedData = records.map((record) => {
          const studentInfo = record.students.find((s) => s.id === studentId);
          return {
            date: record.date,
            courseCode: record.courseCode,
            status: studentInfo?.status || "absent",
            batch: record.batch,
          };
        });

        res.send(formattedData);
      } catch (err) {
        res.status(500).send({ message: "Failed to load attendance" });
      }
    });

    // update attendance (admin or teacher)
    app.patch(
      "/attendance/:id",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const { students } = req.body; // নতুন স্টুডেন্ট লিস্ট (Status সহ)

          const result = await attendanceCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { students: students, updatedAt: new Date() } },
          );

          if (result.modifiedCount > 0) {
            res.send({ message: "Attendance updated successfully" });
          } else {
            res.status(404).send({ message: "Attendance record not found" });
          }
        } catch (err) {
          res.status(500).send({ message: "Update failed" });
        }
      },
    );

    // delete attendance (admin only)

    app.delete("/attendance/:id", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await attendanceCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Delete failed" });
      }
    });

    // financial routes
    // get payments with optional studentId and status filters
    app.get("/payments", verifyJWT, verifyAdmin, async (req, res) => {
      const { studentId, status } = req.query;
      let query = {};
      if (studentId) query.studentId = studentId;
      if (status) query.status = status;

      const result = await paymentsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // get payments for a specific student (student can only access their own payments)
    app.get("/my-payments/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await paymentsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // create new payment (admin only)
    app.post("/payments", verifyJWT, verifyAdmin, async (req, res) => {
      const payment = {
        ...req.body,
        date: new Date(),
        status: req.body.status || "pending",
      };
      const result = await paymentsCollection.insertOne(payment);
      res.send(result);
    });

    // update payment status (admin only)
    app.patch("/payments/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { status, transactionId } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
          transactionId: transactionId,
          updatedAt: new Date(),
        },
      };
      const result = await paymentsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete payment (admin only)
    app.delete("/payments/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await paymentsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // settings routes
    app.patch("/update-profile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const updatedData = req.body;

      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const filter = { email: email };
      const updateDoc = {
        $set: updatedData,
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/change-password/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const { oldPassword, newPassword } = req.body;

      const user = await usersCollection.findOne({ email: email });
      if (!user) return res.status(404).send({ message: "User not found" });

      // পুরানো পাসওয়ার্ড চেক
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).send({ message: "Old password does not match" });
      }

      // নতুন পাসওয়ার্ড হ্যাশ করা
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      const result = await usersCollection.updateOne(
        { email: email },
        { $set: { password: hashedPassword } },
      );

      res.send(result);
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
