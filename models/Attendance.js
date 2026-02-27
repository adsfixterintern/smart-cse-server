const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    course: {
      type: String,
      required: [true, "Course name or ID is required"],
      trim: true,
    },
    date: {
      type: String, // "2026-02-25"
      required: [true, "Date is required"],
    },
    semester: {
      type: String,
      required: [true, "Semester is required"],
    },
    teacher: {
      type: String,
      required: [true, "Teacher name is required"],
    },
    // ইউজারের ID কি (Key) হিসেবে এবং স্ট্যাটাস ভ্যালু হিসেবে থাকবে
    attendance: {
      type: Map,
      of: String, // যেমন: "699ea64e...": "A"
      required: true,
    },
  },
  {
    timestamps: true, // এটি অটোমেটিক updatedAt এবং createdAt হ্যান্ডেল করবে
  }
);

// একই কোর্সের একই সেমিস্টারে একই দিনে যেন ডুপ্লিকেট এটেনডেন্স শিট না হয়
attendanceSchema.index({ course: 1, date: 1, semester: 1 }, { unique: true });

const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;