const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name or title is required"],
      trim: true,
    },
    roomNo: {
      type: String,
      required: [true, "Room number is required"],
      unique: true, // একই রুম নম্বর দুবার থাকতে পারবে না
      trim: true,
    },
    type: {
      type: String,
      enum: ["Theory", "Lab", "Seminar", "Office"],
      default: "Theory",
    },
    building: {
      type: String,
      required: [true, "Building name is required"],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity cannot be less than 1"],
    },
  },
  {
    timestamps: true, // এটি createdAt এবং updatedAt হ্যান্ডেল করবে
  }
);

// বিল্ডিং এবং রুম নম্বর দিয়ে দ্রুত সার্চ করার জন্য ইনডেক্স
roomSchema.index({ building: 1, roomNo: 1 });

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

module.exports = Room;