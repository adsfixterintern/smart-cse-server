const Review = require("../models/Review"); // মডেলের নাম Review হলেও কালেকশন নাম feedback হতে পারে
const mongoose = require("mongoose");

// ১. সব ফিডব্যাক গেট করা (Course Details সহ)
exports.getAllFeedback = async (req, res) => {
  try {
    const result = await Review.aggregate([
      {
        $lookup: {
          from: "courses",        // আপনার কোর্স কালেকশনের নাম
          localField: "courseId", // রিভিউতে থাকা কোর্স কোড/আইডি
          foreignField: "code",   // কোর্স মডেলের ইউনিক কোড
          as: "courseDetails",
        },
      },
      {
        $unwind: {
          path: "$courseDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).send(result);
  } catch (error) {
    console.error("Feedback aggregation error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

// ২. নতুন ফিডব্যাক পোস্ট করা
exports.postFeedback = async (req, res) => {
  try {
    const { courseId, comment, rating, courseName } = req.body;
    
    // একই স্টুডেন্ট একই কোর্সে রিভিউ দিয়েছে কি না চেক (মডেলে ইউনিক ইনডেক্স থাকলে এরর হ্যান্ডেল করবে)
    const feedback = new Review({
      courseId,
      comment,
      rating,
      courseName,
      studentEmail: req.decoded.email,
    });

    const result = await feedback.save();
    res.status(201).send(result);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).send({ message: "You have already reviewed this course!" });
    }
    res.status(500).send({ message: "Failed to post feedback" });
  }
};

// ৩. ফিডব্যাক ডিলিট করা (Admin Only)
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Review.findByIdAndDelete(id);

    if (result) {
      res.send({ success: true, message: "Feedback deleted" });
    } else {
      res.status(404).send({ message: "No feedback found with this ID" });
    }
  } catch (error) {
    res.status(500).send({ message: "Delete failed" });
  }
};

// ৪. ফিডব্যাক আপডেট করা
exports.updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // শুধুমাত্র কমেন্ট এবং রেটিং আপডেট হবে
    const result = await Review.findByIdAndUpdate(
      id,
      { $set: { rating, comment } },
      { new: true, runValidators: true }
    );

    if (result) {
      res.send({ success: true, message: "Feedback updated", result });
    } else {
      res.status(404).send({ message: "Match not found with ID" });
    }
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
};