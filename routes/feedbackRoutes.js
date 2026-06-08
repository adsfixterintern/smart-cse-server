const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { verifyJWT, verifyAdmin } = require("../middleware/auth");

// ফিডব্যাক দেখার জন্য (সবাই দেখতে পারবে যারা লগইন করা)
router.get("/", verifyJWT, feedbackController.getAllFeedback);

// ফিডব্যাক পোস্ট করার জন্য (স্টুডেন্ট/ইউজার)
router.post("/", verifyJWT, feedbackController.postFeedback);

// ফিডব্যাক আপডেট করার জন্য
router.patch("/:id", verifyJWT, feedbackController.updateFeedback);

// ফিডব্যাক ডিলিট করার জন্য (শুধুমাত্র অ্যাডমিন)
router.delete("/:id", verifyJWT, verifyAdmin, feedbackController.deleteFeedback);

module.exports = router;