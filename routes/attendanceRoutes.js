const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { verifyJWT, verifyTeacherOrAdmin, verifyAdmin } = require("../middleware/auth");

// টিচার এবং অ্যাডমিন রাউটস
router.post("/upsert", verifyJWT, verifyTeacherOrAdmin, attendanceController.upsertAttendance);
router.delete("/:id", verifyJWT, verifyAdmin, attendanceController.deleteAttendance);

// জেনারেল রাউটস (লগইন করা ইউজারদের জন্য)
router.get("/", verifyJWT, attendanceController.getAttendance);
router.get("/monthly", verifyJWT, attendanceController.getMonthlyAttendance);
router.get("/check", verifyJWT, attendanceController.checkAttendance);
router.get("/user/:studentId", verifyJWT, attendanceController.getStudentAttendance);

module.exports = router;