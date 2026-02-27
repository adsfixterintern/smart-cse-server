const express = require("express");
const router = express.Router();
const facultyController = require("../controllers/facultyController");
const { verifyJWT, verifyAdmin } = require("../middleware/auth");

// ফ্যাকাল্টি লিস্ট দেখা (লগইন করা যে কেউ দেখতে পারবে)
router.get("/", verifyJWT, facultyController.getAllFaculties);

// নিচের সব অপারেশন শুধুমাত্র অ্যাডমিন করতে পারবে
router.post("/", verifyJWT, verifyAdmin, facultyController.addFaculty);
router.patch("/:id", verifyJWT, verifyAdmin, facultyController.updateFaculty);
router.delete("/:id", verifyJWT, verifyAdmin, facultyController.deleteFaculty);

module.exports = router;