const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");
const { verifyJWT, verifyTeacherOrAdmin } = require("../middleware/auth");

// পাবলিক/জেনারেল রাউট (টিচার/স্টুডেন্ট সবাই দেখতে পারে)
router.get("/all", verifyJWT, scheduleController.getAllAssignments);
router.get("/today", verifyJWT, verifyTeacherOrAdmin, scheduleController.getTeacherTodayClasses);
router.get("/my-classes", verifyJWT, verifyTeacherOrAdmin, scheduleController.getMyAssignedClasses);

// অ্যাডমিন বা টিচারদের জন্য ম্যানেজমেন্ট রাউট
router.post("/assign", verifyJWT, verifyTeacherOrAdmin, scheduleController.assignClass);
router.patch("/update/:id", verifyJWT, verifyTeacherOrAdmin, scheduleController.updateAssignment);
router.delete("/delete/:id", verifyJWT, verifyTeacherOrAdmin, scheduleController.deleteAssignment);

module.exports = router;