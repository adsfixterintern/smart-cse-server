const Settings = require("../models/Settings");

// ১. সেটিংস গেট করা
exports.getSettings = async (req, res) => {
  try {
    // ডাটাবেজ থেকে প্রথম ডকুমেন্টটি খোঁজা
    let settings = await Settings.findOne({});
    
    // যদি কোনো সেটিংস না থাকে, তবে একটি ডিফল্ট অবজেক্ট পাঠানো
    if (!settings) {
      settings = {
        siteName: "SmartCSE Portal",
        adminEmail: "admin@university.edu",
        currentSemester: "Spring 2026",
        maintenanceMode: false,
        registrationOpen: true,
      };
    }
    
    res.status(200).send(settings);
  } catch (error) {
    res.status(500).send({ message: "Error fetching settings", error: error.message });
  }
};

// ২. সেটিংস আপডেট করা (Upsert লজিক)
exports.updateSettings = async (req, res) => {
  try {
    const updatedData = req.body;
    const { _id, ...dataWithoutId } = updatedData; // ID থাকলে তা আলাদা করে ফেলা

    // {} ফিল্টার মানে প্রথম যে রেকর্ড পাবে সেটিই আপডেট হবে, না থাকলে নতুন তৈরি হবে
    const result = await Settings.findOneAndUpdate(
      {}, 
      {
        $set: {
          ...dataWithoutId,
          updatedBy: req.decoded.email, // কোন অ্যাডমিন আপডেট করল তা ট্র্যাক করা
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.send({ 
      success: true, 
      message: "Settings updated successfully", 
      data: result 
    });
  } catch (error) {
    console.error("Settings Update Error:", error);
    res.status(500).send({ message: "Update failed due to database constraints" });
  }
};