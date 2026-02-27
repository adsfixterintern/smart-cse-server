const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Attendance = require("../models/Attendance");
const Result = require("../models/Result");
const Notice = require("../models/Notice");
// Note: Assuming you have Course and Routine models
const Course = require("../models/Course"); 
const Routine = require("../models/Routine");

// ১. ইউজার রেজিস্ট্রেশন
exports.registerUser = async (req, res) => {
  try {
    const { email, password, ...rest } = req.body;
    if (!email || !password) return res.status(400).send({ message: "Email and password required" });

    // const existingUser = await User.findOne({ email });
    // if (existingUser) return res.status(409).send({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ ...rest, email, password: hashedPassword });
    const result = await newUser.save();
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Registration failed", error: error.message });
  }
};

// ২. ইউজার লগইন
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).send({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send({ message: "Invalid email or password" });

    const token = jwt.sign(
      { email: user.email, role: user.role, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.send({
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name }
    });
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ৩. পাসওয়ার্ড ভুলে গেলে (Forget Password)
exports.forgetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    await User.updateOne({ email }, { $set: { resetToken, resetTokenExpiry } });

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}&email=${email}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"SmartCSE Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
    });

    res.send({ message: "Reset link sent to email!" });
  } catch (error) {
    res.status(500).send({ message: "Failed to process request" });
  }
};

// ৪. অ্যাডমিন স্ট্যাটাস (Admin Stats)
exports.getAdminStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalTeachers = await User.countDocuments({ role: "teacher" });
    const pendingUsersCount = await User.countDocuments({ status: "pending" });
    const pendingUsersList = await User.find({ status: "pending" }).limit(5);

    res.send({ totalStudents, totalTeachers, pendingUsersCount, pendingUsersList });
  } catch (error) {
    res.status(500).send({ message: "Internal server error" });
  }
};

// ৫. ইউজার আপডেট (Profile Update)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData._id;

    const result = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!result) return res.status(404).send({ message: "User not found" });

    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
};

exports.getStudentDashboardOverview = async (req, res) => {
  try {
    const email = req.decoded.email;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });

    const studentIdStr = user.studentId; 
    const semester = user.semester || "1";

    const attendanceRecords = await Attendance.find({
      semester: semester,
      [`attendance.${studentIdStr}`]: { $exists: true },
    });

    let presentCount = 0;
    attendanceRecords.forEach((record) => {
      // সেফলি ডাটা এক্সেস করার জন্য:
      const status = record.attendance instanceof Map 
        ? record.attendance.get(studentIdStr) 
        : record.attendance[studentIdStr];
        
      if (status === "P" || status === "L") presentCount++;
    });

    const attendanceRate = attendanceRecords.length > 0
        ? Math.round((presentCount / attendanceRecords.length) * 100)
        : 0;

    const coursesCount = await Course.countDocuments({ semester: semester });
    const results = await Result.find({ studentEmail: email });
    
    const totalPoints = results.reduce((sum, r) => sum + (Number(r.point) || 0), 0);
    const cgpa = results.length > 0 ? (totalPoints / results.length).toFixed(2) : "0.00";

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];
    const routines = await Routine.find({ semester: semester, day: today });

    const recentNotices = await Notice.find().sort({ createdAt: -1 }).limit(3);

    res.status(200).send({
      stats: {
        attendanceRate,
        totalClasses: attendanceRecords.length,
        presentDays: presentCount,
        cgpa: parseFloat(cgpa),
        enrolledCourses: coursesCount,
        pendingTasks: 3,
      },
      todaySchedule: routines.map((r) => ({
        time: r.startTime,
        subject: r.courseName,
        room: r.roomNo || r.roomNumber,
        instructor: r.teacherName,
        type: r.type || "Lecture",
      })),
      recentNotifications: recentNotices.map((n) => ({
        id: n._id,
        title: n.title,
        description: n.description,
        time: n.createdAt,
      })),
      courseProgress: results.slice(0, 3).map((r) => ({
        name: r.courseName,
        code: r.courseCode,
        progress: 100,
      })),
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};