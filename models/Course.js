const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Course code is required"],
      unique: true, // CSE-4201 যেন ডুপ্লিকেট না হয়
      trim: true,
      uppercase: true,
    },
    teacherName: {
      type: String,
      required: [true, "Teacher name is required"],
    },
    teacherId: {
      type: String,
      required: [true, "Teacher ID is required"],
    },
    credit: {
      type: Number,
      required: true,
      default: 3,
    },
    semester: {
      type: String, // আপনার ডাটা অনুযায়ী "8" স্ট্রিং হিসেবে আছে
      required: true,
    },
    resources: [
      {
        title: String,
        link: String,
        type: { type: String, enum: ["pdf", "link", "video"], default: "link" },
      },
    ],
  },
  {
    timestamps: true, // অটোমেটিক createdAt এবং updatedAt হ্যান্ডেল করবে
  }
);


const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

module.exports = Course;