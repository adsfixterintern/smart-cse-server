const express = require("express");
const router = express.Router();
const noticeController = require("../controllers/noticeController");
const { verifyJWT, verifyAdmin, verifyTeacherOrAdmin } = require("../middleware/auth");

// নোটিশ রাউটস
router.get("/", verifyJWT, noticeController.getNotices);
router.post("/", verifyJWT, verifyAdmin, noticeController.postNotice);
router.patch("/:id", verifyJWT, verifyAdmin, noticeController.updateNotice);
router.delete("/:id", verifyJWT, verifyAdmin, noticeController.deleteNotice);

// ওভারভিউ রাউট (অ্যাডমিন বা টিচারের জন্য)
router.get("/overview", verifyJWT, verifyTeacherOrAdmin, noticeController.getStudentOverview);

module.exports = router;