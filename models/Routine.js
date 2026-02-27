const mongoose = require("mongoose");

const routineSchema = new mongoose.Schema(
  {
    semester: {
      type: String,
      required: [true, "Semester is required"],
    },
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    courseCode: {
      type: String, // আপনার অবজেক্টে নেই, কিন্তু ভবিষ্যতে সার্চের জন্য এটি রাখা ভালো
      trim: true,
    },
    teacherName: {
      type: String,
      required: [true, "Teacher name is required"],
    },
    teacherId: {
      type: String,
      required: [true, "Teacher ID is required"],
    },
    startTime: {
      type: String, // "10:35 AM"
      required: true,
    },
    endTime: {
      type: String, // সাধারণত রুটিনে ক্লাস শেষ হওয়ার সময়ও থাকে
    },
    day: {
      type: String,
      enum: [
        "Saturday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ],
      required: true,
    },
    room: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // এটি createdAt এবং updatedAt হ্যান্ডেল করবে
  }
);

// একই রুমে একই সময়ে যেন দুটি ক্লাস না পড়ে তার জন্য ইডেক্স (Conflict Prevention)
routineSchema.index({ day: 1, startTime: 1, room: 1 }, { unique: true });

const Routine = mongoose.models.Routine || mongoose.model("Routine", routineSchema);

module.exports = Routine;