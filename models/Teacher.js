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
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    designation: {
      type: String,
      required: [true, "Designation is required"], // যেমন: Lecturer
    },
    specialization: {
      type: String,
      uppercase: true, // আপনার ডাটা অনুযায়ী "MATHMATETIAN"
    },
    experience: {
      type: String, // "5" (বছর)
    },
    teacherId: {
      type: String,
      unique: true, // প্রতিটি টিচারের আইডি আলাদা হতে হবে
      sparse: true, // শুধুমাত্র টিচারদের ক্ষেত্রে এটি থাকবে, স্টুডেন্টদের জন্য নাল থাকতে পারে
    },
    imageUrl: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
  },
  {
    timestamps: true, // এটি createdAt এবং updatedAt হ্যান্ডেল করবে
  }
);

// দ্রুত ইমেইল সার্চের জন্য ইনডেক্স
userSchema.index({ email: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;