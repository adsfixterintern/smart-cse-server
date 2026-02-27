const express = require("express");
const router = express.Router();
const classroomController = require("../controllers/classroomController");
const { verifyJWT, verifyAdmin } = require("../middleware/auth");

// ক্লাসরুম লিস্ট দেখা (লগইন করা যে কেউ পারবে)
router.get("/", verifyJWT, classroomController.getAllClassrooms);

// অ্যাডমিন অপারেশনস
router.post("/", verifyJWT, verifyAdmin, classroomController.addClassroom);
router.patch("/:id", verifyJWT, verifyAdmin, classroomController.updateClassroom);
router.delete("/:id", verifyJWT, verifyAdmin, classroomController.deleteClassroom);

module.exports = router;