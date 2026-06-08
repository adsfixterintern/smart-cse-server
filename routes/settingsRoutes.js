const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { verifyJWT, verifyAdmin } = require("../middleware/auth");

// সেটিংস দেখার জন্য (পাবলিকলি বা প্রোটেক্টেডলি ব্যবহার করা যায়)
router.get("/", settingsController.getSettings);

// সেটিংস আপডেট করার জন্য (শুধুমাত্র অ্যাডমিন)
router.patch("/", verifyJWT, verifyAdmin, settingsController.updateSettings);

module.exports = router;