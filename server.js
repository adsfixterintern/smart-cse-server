require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// রাউট ইমপোর্ট (এগুলো আমরা পরে তৈরি করব)
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const routineRoutes = require("./routes/routineRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const resultRoutes = require("./routes/resultRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const classroomRoutes = require("./routes/classroomRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

const app = express();
const port = process.env.PORT || 5001;

connectDB();

const allowedOrigins = [
  "http://localhost:3000",
  "https://smart-cse-three.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ৩. API রাউটস
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/faculties", facultyRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/schedules", scheduleRoutes);

// ৪. বেস রাউট
app.get("/", (req, res) => {
  res.send("SmartCSE Mongoose Server is running... 🚀");
});

// ৫. গ্লোবাল এরর হ্যান্ডলার
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!", error: err.message });
});

// ৬. সার্ভার লিসেনিং
app.listen(port, () => {
  console.log(`✨ Server is humming along on port ${port}`);
});