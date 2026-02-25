require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const bcrypt = require("bcryptjs");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// const allowedOrigins = [
//   "http://localhost:3000",
//   "https://smart-cse-seven.vercel.app"
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.indexOf(origin) === -1) {
//         return callback(new Error("Not allowed by CORS"));
//       }

//       return callback(null, true);
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

const allowedOrigins = [
  "http://localhost:3000", // local development
  "https://smart-cse-three.vercel.app", // frontend (main)
  "https://smart-cse-server-eta.vercel.app", // optional (same-origin / testing)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server / Postman / curl
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// // IMPORTANT: preflight handle
// app.options("*", cors());
// // app.options("*", cors());

app.use(express.json());

const encodedPass = encodeURIComponent(process.env.DB_PASS);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const calculateGrade = (marks) => {
  if (marks >= 80) return { grade: "A+", point: 4.0 };
  if (marks >= 75) return { grade: "A", point: 3.75 };
  if (marks >= 70) return { grade: "A-", point: 3.5 };
  if (marks >= 65) return { grade: "B+", point: 3.25 };
  if (marks >= 60) return { grade: "B", point: 3.0 };
  if (marks >= 55) return { grade: "B-", point: 2.75 };
  if (marks >= 50) return { grade: "C+", point: 2.5 };
  if (marks >= 45) return { grade: "C", point: 2.25 };
  if (marks >= 40) return { grade: "D", point: 2.0 };
  return { grade: "F", point: 0.0 };
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
    const settingsCollection = db.collection("settings");
    const feedbackCollection = db.collection("feedback");
    const facultiesCollection = db.collection("faculties");
    const resultsCollection = db.collection("results");
    const noticesCollection = db.collection("notices");
    const classroomsCollection = db.collection("classrooms");
    const classSchedulesCollection = db.collection("classSchedules");

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
    app.post(
      "/upload-image",
      // verifyJWT,
      upload.single("image"),
      async (req, res) => {
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
          res.status(500).send({
            message: "Cloudinary upload failed. Check API keys/Presets.",
          });
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
    // verifyJWT, verifyTeacherOrAdmin,
    app.get("/users",  async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });
    app.get("/users/status/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send({ user });
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
    // verifyJWT, verifyAdmin,
    app.delete("/users/:id",  async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        delete updateData._id;

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Update process failed" });
      }
    });

    // get user by email (for profile page)
    // verifyJWT,
    app.get("/users/email/:email",verifyJWT,  async (req, res) => {
      const email = req.params.email;

      if (req.decoded?.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(user);
    });
    // pending get for admin dashboard
    app.get("/users/pending", verifyJWT, verifyAdmin, async (req, res) => {
      const pendingUsers = await usersCollection
        .find({ status: "pending" })
        .toArray();
      res.send(pendingUsers);
    });
    app.patch(
      "/users/pending/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "approved" } },
        );
        res.send(result);
      },
    );
    app.get("/admin-stats", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const totalStudents = await usersCollection.countDocuments({
          role: "student",
        });
        const totalTeachers = await usersCollection.countDocuments({
          role: "teacher",
        });
        const pendingUsersCount = await usersCollection.countDocuments({
          status: "pending",
        });

        const pendingUsersList = await usersCollection
          .find({ status: "pending" })
          .limit(5)
          .toArray();
        const totalNotices = await noticesCollection.countDocuments();

        res.send({
          totalStudents,
          totalTeachers,
          pendingUsersCount,
          totalNotices,
          pendingUsersList,
        });
      } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // student dashboard stats route
    // verifyJWT,
   app.get("/student/dashboard-overview",  async (req, res) => {
      try {
        const email = req.decoded.email;
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).send({ message: "User not found" });

        const studentIdStr = user._id.toString();
        const semester = user.semester || "1";

        // ১. এটেনডেন্স ক্যালকুলেশন (আপনার ডাটা স্ট্রাকচার অনুযায়ী)
        const attendanceRecords = await attendanceCollection
          .find({
            semester: semester,
            [`attendance.${studentIdStr}`]: { $exists: true },
          })
          .toArray();

        let presentCount = 0;
        attendanceRecords.forEach((record) => {
          const status = record.attendance[studentIdStr];
          // P = Present, L = Late (Late কেও উপস্থিতি ধরা হয়েছে)
          if (status === "P" || status === "L") presentCount++;
        });

        const attendanceRate =
          attendanceRecords.length > 0
            ? Math.round((presentCount / attendanceRecords.length) * 100)
            : 0;

        const coursesCount = await coursesCollection.countDocuments({
          semester: semester,
        });
        const results = await resultsCollection
          .find({ studentEmail: email })
          .toArray();
        const totalPoints = results.reduce((sum, r) => sum + (r.point || 0), 0);
        const cgpa =
          results.length > 0
            ? (totalPoints / results.length).toFixed(2)
            : "0.00";

        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const today = days[new Date().getDay()];
        const routines = await routinesCollection
          .find({ semester: semester, day: today })
          .toArray();

        const recentNotices = await noticesCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();

        res.send({
          stats: {
            attendanceRate: attendanceRate,
            totalClasses: attendanceRecords.length,
            presentDays: presentCount,
            cgpa: cgpa,
            enrolledCourses: coursesCount,
            pendingTasks: 3,
          },
          todaySchedule: routines.map((r) => ({
            time: r.startTime,
            subject: r.courseName,
            room: r.roomNo,
            instructor: r.teacherName,
            type: r.type || "Lecture",
          })),
          recentNotifications: recentNotices.map((n) => ({
            title: n.title,
            description: n.description.substring(0, 60) + "...",
            time: "Just Now",
          })),
          courseProgress: results.slice(0, 3).map((r) => ({
            name: r.courseName,
            code: r.courseCode,
            progress: 100, // রেজাল্ট আসা মানে কোর্স শেষ
          })),
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // course related routes

    // get courses by semester (admin and teachers only)
    // verifyJWT,
    app.get("/courses/:semester",  async (req, res) => {
      try {
        const sem = req.params.semester;
        console.log(sem);
        const query = { semester: sem };

        const courses = await coursesCollection.find(query).toArray();

        res.status(200).send(Array.isArray(courses) ? courses : []);
      } catch (error) {
        console.error("Course fetch error:", error);
        res.status(500).send([]);
      }
    });
// verifyJWT,
    app.get("/courses",  async (req, res) => {
      const courseCode = req.query.code;

      let query = {};
      if (courseCode) {
        query.courseCode = courseCode;
      }
      const courses = await coursesCollection.find(query).toArray();
      res.send(courses);
    });
//  verifyJWT, verifyTeacherOrAdmin,
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

    app.delete(
      "/courses/:id",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        const id = req.params.id;
        const result = await coursesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      },
    );

    app.patch(
      "/courses/:id",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        const id = req.params.id;
        const updateData = req.body;

        const result = await coursesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData },
        );

        res.send(result);
      },
    );
// verifyJWT,
    app.get("/courses/:code",  async (req, res) => {
      const code = Number(req.params.code);

      const course = await coursesCollection.findOne({ code });

      if (!course) {
        return res.status(404).send({ message: "Course not found" });
      }

      res.send(course);
    });

    // get courses assigned to logged in teacher
    // verifyJWT,
    app.get("/teacher-courses",  async (req, res) => {
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
    // verifyJWT,
    app.get("/students/:semester",  async (req, res) => {
      try {
        const semester = req.params.semester;
        const query = {
          role: "student",
          semester: semester,
        };
        const result = await usersCollection
          .find(query)
          .project({
            name: 1,
            studentId: 1,
            email: 1,
          })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch students" });
      }
    });

    // routines routes

    // get routines with optional semester filter
    // verifyJWT,
    app.get("/routines",  async (req, res) => {
      const semester = req.query.semester;
      const query = semester ? { semester } : {};
      const result = await routinesCollection.find(query).toArray();
      res.send(result);
    });

    // create new routine (admin only)
    // verifyJWT, verifyAdmin,
   // create new routine (admin only)
app.post("/routines", async (req, res) => {
  try {
    const routine = req.body;

    const existingConflict = await routinesCollection.findOne({
      day: routine.day,
      startTime: routine.startTime,
      room: routine.room
    });

    if (existingConflict) {
      return res.status(400).send({ 
        message: `Conflict: This room (${routine.room}) is already busy at ${routine.startTime} on ${routine.day}` 
      });
    }

    // কোনো কনফ্লিক্ট না থাকলে নতুন রুটিন অ্যাড হবে
    const result = await routinesCollection.insertOne(routine);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Server Error", error });
  }
});

    // delete routine (admin only)
    // verifyJWT, verifyTeacherOrAdmin,
    app.delete("/routines/:id",  async (req, res) => {
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
    // verifyJWT,
    app.get("/attendance",  async (req, res) => {
      const { semester, batch, date } = req.query;

      let query = {};
      if (semester) query.semester = semester;
      if (batch) query.batch = batch;
      if (date) query.date = date;

      const result = await attendanceCollection.find(query).toArray();
      res.send(result);
    });

    // Get monthly attendance
    // verifyJWT,
 app.get("/attendance/monthly", async (req, res) => {
      try {
        const { semester, month, course } = req.query;
        const year = new Date().getFullYear();
        
        const formattedMonth = month.padStart(2, "0");
        const datePattern = new RegExp(`^${year}-${formattedMonth}-`);
        
        const query = {
          semester,
          course,
          date: { $regex: datePattern }
        };

        const result = await attendanceCollection.find(query).sort({ date: 1 }).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to load monthly data" });
      }
    });


    // post attendance (teacher or admin)
    app.post(
      "/attendance",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        const data = req.body;
        if (Array.isArray(data)) {
          const result = await attendanceCollection.insertMany(data);
          res.send(result);
        } else {
          const result = await attendanceCollection.insertOne(data);
          res.send(result);
        }
      },
    );

    // get attendance for a specific student with optional course filter
    // verifyJWT,
    app.get("/attendance/user/:studentId", async (req, res) => {
      try {
        const { studentId } = req.params;
        const { course } = req.query;
        let query = { [`attendance.${studentId}`]: { $exists: true } };
        if (course) query.course = course;

        const records = await attendanceCollection.find(query).toArray();
        
        const formattedData = records.map((record) => {
          return {
            date: record.date,
            course: record.course,
            status: record.attendance[studentId] || "A",
            semester: record.semester,
          };
        });

        res.send(formattedData);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to load user attendance" });
      }
    });

    // update attendance
    app.patch(
      "/attendance/:id",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const { students } = req.body;

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

    // delete attendance
// verifyJWT, verifyAdmin,
    app.delete("/attendance/:id",  async (req, res) => {
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
// verifyJWT,

 app.get("/attendance/check", async (req, res) => {
      const { semester, course, date } = req.query;
      const query = { semester, course, date };
      const result = await attendanceCollection.findOne(query);
      res.send(result || {}); 
    });
// verifyJWT, verifyTeacherOrAdmin,
app.post("/attendance/upsert", async (req, res) => {
  try {
    const data = req.body;
    const { semester, course, date, attendance, teacher } = data;

    // ১. ফিল্টার তৈরি (একই দিনে, একই সেমিস্টার এবং একই কোর্সের জন্য একটিই রেকর্ড)
    const filter = { semester, course, date };

    // ২. আপডেট লজিক
    const updateDoc = {
      $set: {
        teacher: teacher,
        attendance: attendance,
        updatedAt: new Date()
      }
    };


    const options = { upsert: true };

    const result = await attendanceCollection.updateOne(filter, updateDoc, options);

  
    if (result.upsertedCount > 0) {
      res.status(201).send({ message: "Attendance added successfully", type: "inserted", result });
    } else {
      res.status(200).send({ message: "Attendance updated successfully", type: "updated", result });
    }
  } catch (err) {
    res.status(500).send({ message: "Failed to sync attendance", error: err.message });
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
            registrationOpen: true,
          });
        }
        res.send(settings);
      } catch (error) {
        res.status(500).send({ message: "Error fetching settings" });
      }
    });

    // update settings (admin only)
    // verifyJWT, verifyAdmin,
    app.patch("/settings",  async (req, res) => {
      try {
        const updatedData = req.body;
        const { _id, ...dataWithoutId } = updatedData;

        const result = await settingsCollection.updateOne(
          {},
          {
            $set: {
              ...dataWithoutId,
              updatedAt: new Date(),
              updatedBy: req.decoded.email,
            },
          },
          { upsert: true },
        );

        res.send({ success: true, message: "Settings updated successfully" });
      } catch (error) {
        console.error("Settings Error:", error);
        res
          .status(500)
          .send({ message: "Update failed due to database constraints" });
      }
    });

    // feedback routes-------------------
    // get feedback with course details
    // verifyJWT, 
    app.get("/feedback", async (req, res) => {
      try {
        const result = await feedbackCollection
          .aggregate([
            {
              $lookup: {
                from: "courses",
                localField: "courseId",
                foreignField: "_id",
                as: "courseDetails",
              },
            },
            {
              $unwind: {
                path: "$courseDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $sort: { createdAt: -1 },
            },
          ])
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Feedback aggregation error:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // post feedback
// verifyJWT,
    app.post("/feedback",  async (req, res) => {
      const { courseId, comment, rating,courseName } = req.body;
      const feedback = {
        courseId,
        comment,
        rating,
        courseName,
        studentEmail: req.decoded.email,
        createdAt: new Date(),
      };
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    // delete feedback
// verifyJWT, verifyAdmin,
    app.delete("/feedback/:id",  async (req, res) => {
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
//  verifyJWT,
    app.patch("/feedback/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { courseCode, ...updatedData } = req.body;

        const filter = {
          _id: new ObjectId(id),
          courseCode: courseCode,
        };

        const updateDoc = {
          $set: updatedData,
        };

        const result = await feedbackCollection.updateOne(filter, updateDoc);

        if (result.matchedCount > 0) {
          res.send({ success: true, message: "Feedback updated" });
        } else {
          res
            .status(404)
            .send({ message: "Match not found with ID and Course Code" });
        }
      } catch (error) {
        res.status(500).send({ message: "Update failed" });
      }
    });

    // faculties routes
    app.get("/faculties", async (req, res) => {
      try {
        const result = await facultiesCollection
          .find()
          .sort({ name: 1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch faculties" });
      }
    });

    // add new faculty (admin only)
    // verifyJWT, verifyAdmin,
    app.post("/faculties",  async (req, res) => {
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
    // verifyJWT, verifyAdmin, 
    app.patch("/faculties/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { _id, ...dataToUpdate } = req.body;

        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            ...dataToUpdate,
            lastUpdated: new Date(),
          },
        };

        const result = await facultiesCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Update failed" });
      }
    });

    // delete faculty (admin only)
    // verifyJWT, verifyAdmin, 
    app.delete("/faculties/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await facultiesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Delete operation failed" });
      }
    });

    // results routes

    // get all results (admin only)
    // verifyJWT, verifyTeacherOrAdmin,
    app.get("/results/all",  async (req, res) => {
      try {
        const results = await resultsCollection.find().toArray();
        res.send(results);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch results" });
      }
    });

    // post result (admin only, calculates grade and point based on marks)
    // verifyJWT, verifyTeacherOrAdmin,
    app.post("/results",  async (req, res) => {
      try {
        const {
          studentEmail,
          studentId,
          courseCode,
          courseName,
          semester,
          ct,
          mid,
          attendance,
          presentation,
          assignment,
          finalMark,
        } = req.body;

        // টোটাল ক্যালকুলেশন
        const totalMarks =
          Number(ct || 0) +
          Number(mid || 0) +
          Number(attendance || 0) +
          Number(presentation || 0) +
          Number(assignment || 0) +
          Number(finalMark || 0);

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
            finalMark: Number(finalMark || 0),
          },
          grade,
          point,
          createdAt: new Date(),
        };

        const result = await resultsCollection.insertOne(resultDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to input result" });
      }
    });

    // get results for logged in student, with optional semester filter
    // verifyJWT,
    app.get("/my-results",  async (req, res) => {
      try {
        const email = req.decoded.email;
        const query = { studentEmail: email };
        const results = await resultsCollection
          .find(query)
          .sort({ semester: -1 })
          .toArray();
        res.send(results);
      } catch (error) {
        res.status(500).send({ message: "Error fetching results" });
      }
    });

    // get results for a specific course
    app.get(
      "/results/course/:courseCode",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        try {
          const code = req.params.courseCode;
          const query = { courseCode: code };
          const results = await resultsCollection.find(query).toArray();
          res.send(results);
        } catch (error) {
          res.status(500).send({ message: "Error fetching course results" });
        }
      },
    );

    // update result (admin or teacher, if marks are updated, grade and point are recalculated)
    app.patch(
      "/results/:id",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const updatedBreakdown = req.body;

          const totalMarks = Object.values(updatedBreakdown).reduce(
            (sum, val) => sum + Number(val || 0),
            0,
          );

          const { grade, point } = calculateGrade(totalMarks);

          const updateDoc = {
            $set: {
              breakdown: updatedBreakdown,
              marks: totalMarks,
              grade,
              point,
              updatedAt: new Date(),
            },
          };

          const result = await resultsCollection.updateOne(
            { _id: new ObjectId(id) },
            updateDoc,
          );

          res.send(result);
        } catch (error) {
          console.error(error);
          res.status(500).send({ message: "Update failed" });
        }
      },
    );

    // delete result
    app.delete(
      "/results/:id",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const result = await resultsCollection.deleteOne({
            _id: new ObjectId(id),
          });
          res.send(result);
        } catch (error) {
          res.status(500).send({ message: "Delete failed" });
        }
      },
    );

    // get transcript for logged in student, with CGPA calculation and total courses count
    // verifyJWT,
    app.get("/my-transcript",  async (req, res) => {
      try {
        const email = req.decoded.email;
        const results = await resultsCollection
          .find({ studentEmail: email })
          .toArray();

        const totalPoints = results.reduce((sum, res) => sum + res.point, 0);
        const cgpa =
          results.length > 0 ? (totalPoints / results.length).toFixed(2) : 0;

        res.send({
          results,
          cgpa: parseFloat(cgpa),
          totalCourses: results.length,
        });
      } catch (error) {
        res.status(500).send({ message: "Transcript error" });
      }
    });

    // gnotices routes

    // get all notices, sorted by creation date
    // verifyJWT,
    app.get("/notices",  async (req, res) => {
      try {
        const result = await noticesCollection
          .find()
          .sort({ priority: -1, createdAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch notices" });
      }
    });

    // post new notice (admin only)
    // verifyJWT, verifyAdmin,
    app.post("/notices",  async (req, res) => {
      try {
        const { title, description, category, priority, imageUrl, publicId } =
          req.body;

        const notice = {
          title,
          description,
          category: category || "General",
          priority: priority || "Normal",
          imageUrl: imageUrl || null,
          imagePublicId: publicId || null,
          postedBy: req.decoded.email,
          createdAt: new Date(),
        };

        const result = await noticesCollection.insertOne(notice);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to post notice" });
      }
    });

    //update notice (admin only, _id is immutable, if priority is updated, it will affect 
    // the order of notices)
    // verifyJWT, verifyAdmin,
    app.patch("/notices/:id",  async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        delete updatedData._id;

        const result = await noticesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...updatedData,
              updatedAt: new Date(),
            },
          },
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Update failed" });
      }
    });

    // delete notice (admin only)
    // verifyJWT, verifyAdmin,
    app.delete("/notices/:id",  async (req, res) => {
      try {
        const id = req.params.id;

        const notice = await noticesCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!notice) {
          return res.status(404).send({ message: "Notice not found" });
        }

        if (notice.imagePublicId) {
          await cloudinary.uploader.destroy(notice.imagePublicId);
        }

        const result = await noticesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Delete failed" });
      }
    });

    app.get(
      "/student-overview",
      verifyJWT,
      verifyTeacherOrAdmin,
      async (req, res) => {
        try {
          const { batch, semester } = req.query;

          // ---------------- FILTER ----------------
          const matchStage = {};
          if (batch) matchStage.batch = batch;
          if (semester) matchStage.semester = semester;

          const result = await usersCollection
            .aggregate([
              // ---------- ONLY STUDENTS ----------
              {
                $match: {
                  role: "student",
                  ...matchStage,
                },
              },

              // ---------- LOOKUP RESULTS ----------
              {
                $lookup: {
                  from: "results",
                  localField: "studentId",
                  foreignField: "studentId",
                  as: "results",
                },
              },

              // ---------- CALCULATE CGPA & ATTENDANCE ----------
              {
                $addFields: {
                  // 🎓 CGPA = avg(point)
                  cgpa: {
                    $cond: [
                      { $gt: [{ $size: "$results" }, 0] },
                      { $avg: "$results.point" },
                      0,
                    ],
                  },

                  // 📊 Total attended classes
                  totalAttended: {
                    $sum: {
                      $map: {
                        input: "$results",
                        as: "r",
                        in: "$$r.breakdown.attendance",
                      },
                    },
                  },

                  // 🧮 Total possible classes (60 per course)
                  totalClasses: {
                    $multiply: [{ $size: "$results" }, 60],
                  },
                },
              },

              // ---------- ATTENDANCE PERCENT ----------
              {
                $addFields: {
                  attendancePercent: {
                    $cond: [
                      { $gt: ["$totalClasses", 0] },
                      {
                        $multiply: [
                          { $divide: ["$totalAttended", "$totalClasses"] },
                          100,
                        ],
                      },
                      0,
                    ],
                  },
                },
              },

              // ---------- FINAL RESPONSE ----------
              {
                $project: {
                  name: 1,
                  email: 1,
                  studentId: 1,
                  batch: 1,
                  semester: 1,

                  cgpa: { $round: ["$cgpa", 2] },

                  attendancePercent: {
                    $round: [
                      { $min: ["$attendancePercent", 100] }, // 🛡 never >100
                      2,
                    ],
                  },
                },
              },

              { $sort: { name: 1 } },
            ])
            .toArray();

          res.send(result);
        } catch (error) {
          console.error("Student overview error:", error);
          res.status(500).send({
            message: "Failed to load student overview",
          });
        }
      },
    );





    // classrooms routes

    app.get("/classrooms", verifyJWT, async (req, res) => {
  const result = await classroomsCollection.find().toArray();
  res.send(result);
});

app.post("/classrooms", verifyJWT, verifyAdmin, async (req, res) => {
  const room = req.body;
  const existing = await classroomsCollection.findOne({ roomNo: room.roomNo });
  if (existing) {
    return res.status(409).send({ message: "Room already exists" });
  }
  const result = await classroomsCollection.insertOne(room);
  res.send(result);
});


app.patch("/classrooms/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  delete updatedData._id;
  const result = await classroomsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );
  res.send(result);
});


app.delete("/classrooms/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const result = await classroomsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});



// class assignment route with conflict check
app.post("/class-assign",verifyTeacherOrAdmin,verifyJWT, async (req, res) => {
  try {
    const classData = req.body;

    const conflictQuery = {
      day: classData.day,
      startTime: classData.startTime,
      roomNumber: classData.roomNumber
    };
    
    const isConflicted = await classSchedulesCollection.findOne(conflictQuery);
    if (isConflicted) {
      return res.status(400).send({ message: "Schedule Conflict: This room is busy at this time!" });
    }

    const result = await classSchedulesCollection.insertOne(classData);
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to assign class" });
  }
});

// get all assigned class
app.get("/class-assign",verifyJWT, async (req, res) => {
  const { semester, day } = req.query;
  let query = {};
  
  if (teacherEmail) query.teacherEmail = teacherEmail;
  if (semester) query.semester = semester;
  if (day) query.day = day;

  const result = await classSchedulesCollection.find(query).sort({ startTime: 1 }).toArray();
  res.send(result);
});

// update class assignment (admin or teacher, with conflict check)
app.patch("/class-assign/:id", verifyTeacherOrAdmin,verifyJWT,async (req, res) => {
  try {
    const id = req.params.id;
    const update = req.body;
    const filter = { _id: new ObjectId(id) };
    
    const result = await classSchedulesCollection.updateOne(filter, { $set: update });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Update failed" });
  }
});


app.get("/my-assigned-classes", verifyJWT, async (req, res) => {
  try {
    const teacherEmail = req.decoded.email; 
    const { day, semester } = req.query;

    let query = { teacherEmail: teacherEmail };

    if (day) query.day = day;
    if (semester) query.semester = semester;

    const result = await classSchedulesCollection
      .find(query)
      .sort({ day: 1, startTime: 1 })
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to load assigned classes", error: err.message });
  }
});


// delete class assignment (admin or teacher)
app.delete("/class-assign/:id", verifyJWT,verifyTeacherOrAdmin,async (req, res) => {
  try {
    const id = req.params.id;
    const result = await classSchedulesCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Delete failed" });
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
  } catch (err) {
    console.error(err);
  }
}

run();
