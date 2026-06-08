const User = require("../models/User");

// ১. সব ফ্যাকাল্টি মেম্বার গেট করা (নাম অনুযায়ী সর্ট করা)
exports.getAllFaculties = async (req, res) => {
  try {
    const result = await User.find({ role: "teacher" }).sort({ name: 1 });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch faculties" });
  }
};

// ২. নতুন ফ্যাকাল্টি অ্যাড করা (Admin Only)
exports.addFaculty = async (req, res) => {
  try {
    const facultyData = {
      ...req.body,
      role: "teacher" // নিশ্চিত করা হচ্ছে যেন রোল সবসময় টিচার হয়
    };
    
    const result = await User.create(facultyData);
    res.status(201).send(result);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).send({ message: "Email or Teacher ID already exists" });
    }
    res.status(500).send({ message: "Failed to add faculty", error: error.message });
  }
};

// ৩. ফ্যাকাল্টি আপডেট করা (Admin Only)
exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id, email, ...dataToUpdate } = req.body; // ইমেল এবং আইডি ইমিউটেবল রাখা ভালো

    const result = await User.findByIdAndUpdate(
      id,
      { 
        $set: { 
          ...dataToUpdate, 
          lastUpdated: new Date() 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!result) return res.status(404).send({ message: "Faculty not found" });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed", error: error.message });
  }
};

// ৪. ফ্যাকাল্টি ডিলিট করা (Admin Only)
exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await User.findByIdAndDelete(id);
    
    if (!result) return res.status(404).send({ message: "Faculty not found" });
    res.send({ message: "Faculty deleted successfully", result });
  } catch (error) {
    res.status(500).send({ message: "Delete operation failed" });
  }
};