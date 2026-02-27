const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    studentEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    studentId: {
      type: String,
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    breakdown: {
      ct: { type: Number, default: 0 },
      mid: { type: Number, default: 0 },
      attendance: { type: Number, default: 0 },
      presentation: { type: Number, default: 0 },
      assignment: { type: Number, default: 0 },
      finalMark: { type: Number, default: 0 },
    },
    grade: {
      type: String, // "A+", "B", etc.
      required: true,
    },
    point: {
      type: Number, // 4.00, 3.00, etc.
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// একই কোর্সে একই স্টুডেন্টের যেন ডুপ্লিকেট রেজাল্ট না থাকে
resultSchema.index({ studentId: 1, courseCode: 1, semester: 1 }, { unique: true });

const Result = mongoose.models.Result || mongoose.model("Result", resultSchema);

module.exports = Result;