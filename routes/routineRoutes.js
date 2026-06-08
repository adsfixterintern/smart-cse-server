const express = require("express");
const router = express.Router();
const routineController = require("../controllers/routineController");
const { verifyJWT, verifyAdmin, verifyTeacherOrAdmin } = require("../middleware/auth");

// ১. রুটিন দেখা (লগইন করা ইউজারদের জন্য)
router.get("/", verifyJWT, routineController.getRoutines);

// ২. রুটিন তৈরি (শুধুমাত্র অ্যাডমিন)
router.post("/", verifyJWT, verifyAdmin, routineController.createRoutine);

// ৩. রুটিন আপডেট (টিচার বা অ্যাডমিন)
router.patch("/:id", verifyJWT, verifyTeacherOrAdmin, routineController.updateRoutine);

// ৪. রুটিন ডিলিট (টিচার বা অ্যাডমিন)
router.delete("/:id", verifyJWT, verifyTeacherOrAdmin, routineController.deleteRoutine);

module.exports = router;