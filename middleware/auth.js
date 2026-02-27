const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ১. JWT Verify Middleware
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }

    req.decoded = decoded;
    next();
  });
};

// ২. Admin Verification Middleware
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;

  try {
    const user = await User.findOne({ email });

    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .send({ message: "Forbidden access (admin only)" });
    }

    next();
  } catch (error) {
    res.status(500).send({ message: "Internal server error" });
  }
};

// ৩. Teacher or Admin Verification Middleware
const verifyTeacherOrAdmin = async (req, res, next) => {
  const email = req.decoded.email;

  try {
    const user = await User.findOne({ email });
    
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return res
        .status(403)
        .send({ message: "Forbidden access (Teacher or Admin only)" });
    }
    
    next();
  } catch (error) {
    res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = {
  verifyJWT,
  verifyAdmin,
  verifyTeacherOrAdmin,
};