const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    adminEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    currentSemester: {
      type: String,
      required: true,
      default: "Spring 2026",
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    registrationOpen: {
      type: Boolean,
      default: true,
    },
    siteName: {
      type: String,
      required: true,
      default: "SmartCSE Portal",
    },
    logoUrl: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: String, // সর্বশেষ কোন অ্যাডমিন এডিট করেছেন তার ইমেইল
      required: true,
    },
  },
  {
    timestamps: true, // এটি updatedAt এবং createdAt হ্যান্ডেল করবে
  }
);

// এটি নিশ্চিত করবে যে ডাটাবেজে সেটিংসের একাধিক ডকুমেন্ট তৈরি হবে না
const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

module.exports = Settings;