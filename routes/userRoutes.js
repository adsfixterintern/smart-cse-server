const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyJWT, verifyAdmin } = require("../middleware/auth");

// Public Routes
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.post("/forget-password", userController.forgetPassword);

// Private Routes (Logged in users)
router.get("/email/:email", verifyJWT, async (req, res) => {
    // Controller এ আলাদা ফাংশন না করে এখানে শর্টকাটে দেওয়া হলো
    if (req.decoded.email !== req.params.email) return res.status(403).send({ message: "Forbidden" });
    const user = await require("../models/User").findOne({ email: req.params.email });
    res.send(user);
});

// Admin Routes
router.get("/pending", verifyJWT, verifyAdmin, async (req, res) => {
    const users = await require("../models/User").find({ status: "pending" });
    res.send(users);
});

router.get("/admin-stats", verifyJWT, verifyAdmin, userController.getAdminStats);

router.patch("/:id", verifyJWT, userController.updateUser);

router.get("/overview", verifyJWT, userController.getStudentDashboardOverview);

module.exports = router;