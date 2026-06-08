const Room = require("../models/Room");

// ১. সব ক্লাসরুম গেট করা
exports.getAllClassrooms = async (req, res) => {
  try {
    const result = await Room.find().sort({ roomNo: 1 });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch classrooms", error: error.message });
  }
};

// ২. নতুন ক্লাসরুম তৈরি করা (Admin Only)
exports.addClassroom = async (req, res) => {
  try {
    const roomData = req.body;

    // মডেল লেভেলে unique: true আছে, তবুও কাস্টম চেক
    const existing = await Room.findOne({ roomNo: roomData.roomNo });
    if (existing) {
      return res.status(409).send({ message: "Room number already exists" });
    }

    const result = await Room.create(roomData);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add classroom", error: error.message });
  }
};

// ৩. ক্লাসরুম আপডেট করা (Admin Only)
exports.updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    delete updatedData._id; // ID আপডেট করা যাবে না

    const result = await Room.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!result) return res.status(404).send({ message: "Room not found" });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed", error: error.message });
  }
};

// ৪. ক্লাসরুম ডিলিট করা (Admin Only)
exports.deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Room.findByIdAndDelete(id);

    if (!result) return res.status(404).send({ message: "Room not found" });
    res.status(200).send({ message: "Classroom deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: "Delete operation failed" });
  }
};