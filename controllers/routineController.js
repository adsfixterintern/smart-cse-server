const Routine = require("../models/Routine");

// ১. রুটিন গেট করা (অপশনাল সেমিস্টার ফিল্টার সহ)
exports.getRoutines = async (req, res) => {
  try {
    const { semester } = req.query;
    const query = semester ? { semester } : {};
    
    // সময়ের ক্রমানুসারে সর্ট করা হয়েছে (অপশনাল)
    const result = await Routine.find(query).sort({ startTime: 1 });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch routines", error: error.message });
  }
};

// ২. নতুন রুটিন তৈরি (রুম কনফ্লিক্ট চেক সহ)
exports.createRoutine = async (req, res) => {
  try {
    const routineData = req.body;

    // একই দিনে, একই সময়ে, একই রুমে ক্লাস আছে কি না চেক
    const existingConflict = await Routine.findOne({
      day: routineData.day,
      startTime: routineData.startTime,
      room: routineData.room
    });

    if (existingConflict) {
      return res.status(400).send({ 
        message: `Conflict: This room (${routineData.room}) is already busy at ${routineData.startTime} on ${routineData.day}` 
      });
    }

    const newRoutine = await Routine.create(routineData);
    res.status(201).send(newRoutine);
  } catch (error) {
    res.status(500).send({ message: "Server Error", error: error.message });
  }
};

// ৩. রুটিন ডিলিট করা
exports.deleteRoutine = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Routine.findByIdAndDelete(id);
    
    if (!result) return res.status(404).send({ message: "Routine not found" });
    res.status(200).send({ message: "Routine deleted successfully", result });
  } catch (error) {
    res.status(500).send({ message: "Delete failed", error: error.message });
  }
};

// ৪. রুটিন আপডেট করা
exports.updateRoutine = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    delete updatedData._id; // আইডি আপডেট করা যাবে না

    const result = await Routine.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).send({ message: "Routine not found" });
    }
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed", error: error.message });
  }
};