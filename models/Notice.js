const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notice title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Notice description is required"],
    },
    category: {
      type: String,
      enum: ["General", "Academic", "Exam", "Holiday", "Urgent"],
      default: "General",
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High"],
      default: "Normal",
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },
    postedBy: {
      type: String, // ইমেইল বা ইউজারের নাম
      required: true,
    },
  },
  {
    timestamps: true, // createdAt এবং updatedAt অটোমেটিক জেনারেট হবে
  }
);

// লেটেস্ট নোটিশ দ্রুত খোঁজার জন্য ইনডেক্স
noticeSchema.index({ createdAt: -1 });

const Notice = mongoose.models.Notice || mongoose.model("Notice", noticeSchema);

module.exports = Notice;