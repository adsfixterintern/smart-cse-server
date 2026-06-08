const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");
const { verifyJWT, verifyTeacherOrAdmin } = require("../middleware/auth");

// পাবলিক/স্টুডেন্ট রাউটস
router.get("/my-results", verifyJWT, resultController.getMyResults);
router.get("/my-transcript", verifyJWT, resultController.getMyTranscript);

// টিচার এবং অ্যাডমিন রাউটস
router.get("/all", verifyJWT, verifyTeacherOrAdmin, resultController.getAllResults);
router.post("/", verifyJWT, verifyTeacherOrAdmin, resultController.postResult);
router.patch("/:id", verifyJWT, verifyTeacherOrAdmin, resultController.updateResult);
router.delete("/:id", verifyJWT, verifyTeacherOrAdmin, resultController.deleteResult);

module.exports = router;