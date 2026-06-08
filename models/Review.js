const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    courseId: {
      type: String, // আপনার ডাটা অনুযায়ী এটি "CSE-4201" কোড স্টোর করছে
      required: [true, "Course ID is required"],
    },
    courseName: {
      type: String,
      required: [true, "Course Name is required"],
    },
    studentEmail: {
      type: String,
      required: [true, "Student Email is required"],
      lowercase: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5, // ১ থেকে ৫ এর মধ্যে রেটিং সীমাবদ্ধ থাকবে
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
    },
  },
  {
    timestamps: true, // এটি অটোমেটিক createdAt এবং updatedAt হ্যান্ডেল করবে
  }
);

// একজন স্টুডেন্ট একটি কোর্সে যেন একবারই রিভিউ দিতে পারে তার জন্য ইউনিক ইনডেক্স
reviewSchema.index({ courseId: 1, studentEmail: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

module.exports = Review;