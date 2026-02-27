const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");

// মিডলওয়্যার ইমপোর্ট
const { verifyJWT, verifyTeacherOrAdmin } = require("../middleware/auth");

/** * --- পাবলিক বা সাধারণ ইউজার রাউটস (লগইন করা থাকতে হবে) ---
 */

// সব কোর্স দেখা বা ফিল্টার করা
router.get("/", verifyJWT, courseController.getAllCourses);

// নির্দিষ্ট সেমিস্টারের কোর্স দেখা
router.get("/semester/:semester", verifyJWT, courseController.getCoursesBySemester);

/** * --- টিচার এবং অ্যাডমিনদের জন্য রাউটস ---
 */

// লগইন করা টিচারের নির্দিষ্ট কোর্সগুলো দেখা
router.get("/teacher-courses", verifyJWT, verifyTeacherOrAdmin, courseController.getTeacherCourses);

// সেমিস্টার অনুযায়ী স্টুডেন্ট লিস্ট দেখা (এটেনডেন্সের জন্য প্রয়োজনীয়)
router.get("/students/:semester", verifyJWT, verifyTeacherOrAdmin, courseController.getStudentsBySemester);

// নতুন কোর্স তৈরি করা
router.post("/", verifyJWT, verifyTeacherOrAdmin, courseController.createCourse);

// কোর্স আপডেট করা (ID দিয়ে)
router.patch("/:id", verifyJWT, verifyTeacherOrAdmin, courseController.updateCourse);

// কোর্স ডিলিট করা
router.delete("/:id", verifyJWT, verifyTeacherOrAdmin, courseController.deleteCourse);

module.exports = router;