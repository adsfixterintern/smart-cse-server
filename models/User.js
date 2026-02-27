const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    studentId: {
      type: String,
      unique: true, // স্টুডেন্ট আইডি ইউনিক হতে হবে
      required: function() { return this.role === 'student'; } 
    },
    batch: {
      type: String,
      default: null,
    },
    semester: {
      type: String,
      default: "1",
    },
    cgpa: {
      type: Number,
      default: 0.0,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    bloodGroup: {
      type: String,
      default: "",
    },
    guardianPhone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "blocked"],
      default: "pending", // নতুন রেজিস্ট্রেশন করলে আগে পেন্ডিং থাকবে
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // এটি অটোমেটিক createdAt এবং updatedAt জেনারেট করবে
  }
);

// পাসওয়ার্ড ছাড়াই যেন ডাটা কুয়েরি করা যায় তার জন্য একটি মেথড (অপশনাল)
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;