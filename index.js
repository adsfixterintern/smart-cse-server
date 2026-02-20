require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const bcrypt = require('bcryptjs');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const encodedPass = encodeURIComponent(process.env.DB_PASS);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const calculateGrade = (marks) => {
  if (marks >= 80) return { grade: "A+", point: 4.00 };
  if (marks >= 75) return { grade: "A",  point: 3.75 };
  if (marks >= 70) return { grade: "A-", point: 3.50 };
  if (marks >= 65) return { grade: "B+", point: 3.25 };
  if (marks >= 60) return { grade: "B",  point: 3.00 };
  if (marks >= 55) return { grade: "B-", point: 2.75 };
  if (marks >= 50) return { grade: "C+", point: 2.50 };
  if (marks >= 45) return { grade: "C",  point: 2.25 };
  if (marks >= 40) return { grade: "D",  point: 2.00 };
  return { grade: "F", point: 0.00 };
};

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
    const feedbackCollection = db.collection("feedback");
    const facultiesCollection = db.collection("faculties");
    const resultsCollection = db.collection("results");






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

// Teacher or Admin verification middleware
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
  app.post("/upload-image", verifyJWT, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send({ message: "No file uploaded" });
      }

      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
        upload_preset: "smartcseimage", 
      });

      res.json({
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
      });
    } catch (err) {
      console.error("Cloudinary Error:", err);
      res.status(500).send({ message: "Cloudinary upload failed. Check API keys/Presets." });
    }
});

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
    app.get("/users", verifyJWT,verifyAdmin, async (req, res) => {
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


    // get user by email (for profile page)
    app.get("/users/email/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(user);
    }); 








    // course related routes

// get courses by semester (admin and teachers only)
app.get("/courses/:semester", verifyJWT, async (req, res) => {
  try {
    const sem = req.params.semester; 
    console.log(sem)
    const query = { semester: sem }; 
    
    const courses = await coursesCollection.find(query).toArray();
    
    res.status(200).send(Array.isArray(courses) ? courses : []);
  } catch (error) {
    console.error("Course fetch error:", error);
    res.status(500).send([]);
  }
});



    app.get("/courses",verifyJWT, async (req, res) => {
      const courseCode = req.query.code;

      let query = {};
      if (courseCode) {
        query.courseCode = courseCode;
      }
      const courses = await coursesCollection.find(query).toArray();
      res.send(courses);
    });


    app.post("/courses",verifyJWT,verifyTeacherOrAdmin, async (req, res) => {
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


    app.delete("/courses/:id",verifyJWT,verifyTeacherOrAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await coursesCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });


    app.patch("/courses/:id",verifyJWT,verifyTeacherOrAdmin, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const result = await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );

      res.send(result);
    });



    app.get("/courses/:code",verifyJWT, async (req, res) => {
      const code = Number(req.params.code);

      const course = await coursesCollection.findOne({ code });

      if (!course) {
        return res.status(404).send({ message: "Course not found" });
      }

      res.send(course);
    });


    // get courses assigned to logged in teacher
  app.get("/teacher-courses", verifyJWT, async (req, res) => {
  try {
    const email = req.decoded.email; 
    const query = { teacherEmail: email }; 
    const courses = await coursesCollection.find(query).toArray();
    res.send(courses);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch teacher courses" });
  }
});


// get students by semester (admin and teachers only)
app.get("/students/:semester", verifyJWT, async (req, res) => {
  try {
    const semester = req.params.semester;
    const query = { 
      role: "student", 
      semester: semester 
    };
    const result = await usersCollection.find(query).project({
      name: 1,
      studentId: 1,
      email: 1
    }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch students" });
  }
});







    // routines routes

    // get routines with optional semester filter
    app.get("/routines",verifyJWT, async (req, res) => {
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





    // settings routes
    // get settings (public route, returns default values if not set)
   app.get("/settings", async (req, res) => {
  try {
    const settings = await settingsCollection.findOne({});
    if (!settings) {
      return res.send({
        siteName: "SmartCSE Portal",
        adminEmail: "admin@university.edu",
        currentSemester: "Spring 2026",
        maintenanceMode: false,
        registrationOpen: true
      });
    }
    res.send(settings);
  } catch (error) {
    res.status(500).send({ message: "Error fetching settings" });
  }
});


// update settings (admin only)
  app.patch("/settings", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const updatedData = req.body;
    const { _id, ...dataWithoutId } = updatedData;

    const result = await settingsCollection.updateOne(
      {}, 
      { 
        $set: {
          ...dataWithoutId, 
          updatedAt: new Date(),
          updatedBy: req.decoded.email
        } 
      },
      { upsert: true }
    );
    
    res.send({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Settings Error:", error);
    res.status(500).send({ message: "Update failed due to database constraints" });
  }
});












    // feedback routes-------------------
    // get feedback with course details
app.get("/feedback", verifyJWT, async (req, res) => {
  try {
    const result = await feedbackCollection.aggregate([
      {
        $lookup: {
          from: "courses", 
          localField: "courseId",
          foreignField: "_id", 
          as: "courseDetails"
        }
      },
      {
      
        $unwind: {
          path: "$courseDetails",
          preserveNullAndEmptyArrays: true 
        }
      },
      {
      
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    res.send(result);
  } catch (error) {
    console.error("Feedback aggregation error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});



// post feedback

 app.post("/feedback", verifyJWT, async (req, res) => {
  const { courseId, comment, rating } = req.body;
  const feedback = {
    courseId: new ObjectId(courseId),
    comment,
    rating,
    studentEmail: req.decoded.email,
    createdAt: new Date()
  };
  const result = await feedbackCollection.insertOne(feedback);
  res.send(result);
});



// delete feedback

app.delete("/feedback/:id", verifyJWT,verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await feedbackCollection.deleteOne({
      _id: new ObjectId(id),
    });
    
    if (result.deletedCount === 1) {
      res.send({ success: true, message: "Feedback deleted" });
    } else {
      res.status(404).send({ message: "No feedback found with this ID" });
    }
  } catch (error) {
    res.status(500).send({ message: "Delete failed" });
  }
});


// update feedback (only comment and rating, courseId is immutable)

app.patch("/feedback/:id", verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const { courseCode, ...updatedData } = req.body; 

    const filter = { 
      _id: new ObjectId(id),
      courseCode: courseCode 
    };

    const updateDoc = {
      $set: updatedData 
    };

    const result = await feedbackCollection.updateOne(filter, updateDoc);

    if (result.matchedCount > 0) {
      res.send({ success: true, message: "Feedback updated" });
    } else {
      res.status(404).send({ message: "Match not found with ID and Course Code" });
    }
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
});






// faculties routes
app.get("/faculties", async (req, res) => {
  try {
    const result = await facultiesCollection.find().sort({ name: 1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch faculties" });
  }
});



// add new faculty (admin only)
app.post("/faculties", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const faculty = {
      ...req.body,
      createdAt: new Date(),
    };
    const result = await facultiesCollection.insertOne(faculty);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add faculty" });
  }
});



// update faculty (admin only, _id is immutable)
app.patch("/faculties/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { _id, ...dataToUpdate } = req.body;

    const query = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        ...dataToUpdate,
        lastUpdated: new Date()
      }
    };

    const result = await facultiesCollection.updateOne(query, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
});


// delete faculty (admin only)
app.delete("/faculties/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await facultiesCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Delete operation failed" });
  }
});





// results routes



// post result (admin only, calculates grade and point based on marks)
app.post("/results", verifyJWT, verifyTeacherOrAdmin, async (req, res) => {
  try {
    const { 
      studentEmail, studentId, courseCode, courseName, semester, 
      ct, mid, attendance, presentation, assignment, finalMark 
    } = req.body;

    // টোটাল ক্যালকুলেশন
    const totalMarks = 
      Number(ct || 0) + Number(mid || 0) + Number(attendance || 0) + 
      Number(presentation || 0) + Number(assignment || 0) + Number(finalMark || 0);

    const { grade, point } = calculateGrade(totalMarks);

    const resultDoc = {
      studentEmail,
      studentId,
      courseCode,
      courseName,
      semester: semester.toString(),
      marks: totalMarks, // Total sum
      breakdown: {
        ct: Number(ct || 0),
        mid: Number(mid || 0),
        attendance: Number(attendance || 0),
        presentation: Number(presentation || 0),
        assignment: Number(assignment || 0),
        finalMark: Number(finalMark || 0)
      },
      grade,
      point,
      createdAt: new Date()
    };

    const result = await resultsCollection.insertOne(resultDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to input result" });
  }
});


// get results for logged in student, with optional semester filter
app.get("/my-results", verifyJWT, async (req, res) => {
  try {
    const email = req.decoded.email; 
    const query = { studentEmail: email };
    const results = await resultsCollection.find(query).sort({ semester: -1 }).toArray();
    res.send(results);
  } catch (error) {
    res.status(500).send({ message: "Error fetching results" });
  }
});

// get results for a specific course 
app.get("/results/course/:courseCode", verifyJWT, verifyTeacherOrAdmin, async (req, res) => {
  try {
    const code = req.params.courseCode;
    const query = { courseCode: code };
    const results = await resultsCollection.find(query).toArray();
    res.send(results);
  } catch (error) {
    res.status(500).send({ message: "Error fetching course results" });
  }
});

// update result (admin or teacher, if marks are updated, grade and point are recalculated)
app.patch("/results/:id", verifyJWT, verifyTeacherOrAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedBreakdown = req.body; 

    const totalMarks = Object.values(updatedBreakdown).reduce((sum, val) => sum + Number(val || 0), 0);
    
    const { grade, point } = calculateGrade(totalMarks);

    const updateDoc = {
      $set: {
        breakdown: updatedBreakdown,
        marks: totalMarks,
        grade,
        point,
        updatedAt: new Date()
      }
    };

    const result = await resultsCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Update failed" });
  }
});



// delete result 
app.delete("/results/:id", verifyJWT, verifyTeacherOrAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await resultsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Delete failed" });
  }
});


// get transcript for logged in student, with CGPA calculation and total courses count
app.get("/my-transcript", verifyJWT, async (req, res) => {
  try {
    const email = req.decoded.email;
    const results = await resultsCollection.find({ studentEmail: email }).toArray();

    const totalPoints = results.reduce((sum, res) => sum + res.point, 0);
    const cgpa = results.length > 0 ? (totalPoints / results.length).toFixed(2) : 0;

    res.send({ 
      results, 
      cgpa: parseFloat(cgpa), 
      totalCourses: results.length 
    });
  } catch (error) {
    res.status(500).send({ message: "Transcript error" });
  }
});



// get all results (admin only, sorted by creation date)
app.get("/results/all", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const results = await resultsCollection.find().sort({ createdAt: -1 }).toArray();
    res.send(results);
  } catch (error) {
    res.status(500).send({ message: "Error fetching data" });
  }
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

    module.exports = app; 

    if (process.env.NODE_ENV !== 'production') {
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

run();
