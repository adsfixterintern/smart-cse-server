const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    courseCode: {
      type: String,
      required: [true, "Course code is required"],
      uppercase: true,
      trim: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    date: {
      type: String, // "2026-02-28"
      required: true,
    },
    startTime: {
      type: String, // "13:12"
      required: true,
    },
    duration: {
      type: String, // "1" hour or as needed
      required: true,
    },
    teacherId: {
      type: String,
      required: true,
    },
    teacherName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// একই রুমে একই দিনে একই সময়ে ডুপ্লিকেট শিডিউল ঠেকানোর জন্য ইনডেক্স
scheduleSchema.index({ date: 1, startTime: 1, roomNumber: 1 }, { unique: true });

const Schedule = mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;