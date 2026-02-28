const Schedule = require("../models/Schedule");

// ১. নতুন ক্লাস অ্যাসাইন করা (Conflict Check সহ)
exports.assignClass = async (req, res) => {
  try {
    const classData = req.body;

    // রুম এবং সময়ের কনফ্লিক্ট চেক
    const conflictQuery = {
      day: classData.day,
      startTime: classData.startTime,
      roomNumber: classData.roomNumber,
    };

    const isConflicted = await Schedule.findOne(conflictQuery);
    if (isConflicted) {
      return res.status(400).send({
        message: `Conflict: Room ${classData.roomNumber} is already busy at ${classData.startTime} on ${classData.day}!`,
      });
    }

    const result = await Schedule.create(classData);
    res.status(201).send(result);
  } catch (err) {
    res
      .status(500)
      .send({ message: "Failed to assign class", error: err.message });
  }
};

// ২. সব অ্যাসাইন করা ক্লাস গেট করা (Filter সহ)
exports.getAllAssignments = async (req, res) => {
  try {
    const { teacherEmail, semester, day } = req.query;
    let query = {};

    if (teacherEmail) query.teacherEmail = teacherEmail;
    if (semester) query.semester = semester;
    if (day) query.day = day;

    const result = await Schedule.find(query).sort({ day: 1, startTime: 1 });
    res.status(200).send(result);
  } catch (err) {
    res.status(500).send({ message: "Error fetching class assignments" });
  }
};

// ৩. টিচারের আজকের ক্লাসগুলো দেখা (Server-side date detection)
exports.getTeacherTodayClasses = async (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId)
      return res.status(400).send({ message: "Teacher ID is required" });

    // বর্তমান তারিখ "YYYY-MM-DD" ফরম্যাটে আনা
    const todayDate = new Date().toISOString().split("T")[0];

    const result = await Schedule.find({
      teacherId: teacherId,
      day: todayDate,
    }).sort({ startTime: 1 });

    res.status(200).send({ date: todayDate, classes: result });
  } catch (err) {
    res
      .status(500)
      .send({ message: "Internal server error", error: err.message });
  }
};

// ৪. লগইন করা টিচারের সব ক্লাস দেখা
exports.getMyAssignedClasses = async (req, res) => {
  try {
    const teacherEmail = req.decoded.email;
    const {day, semester } = req.query;

    let query = { teacherEmail: teacherEmail };
    if (day) query.day = day;
    if (semester) query.semester = semester;

    const result = await Schedule.find(query).sort({ day: 1, startTime: 1 });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to load assigned classes" });
  }
};

// ৫. শিডিউল আপডেট করা
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await Schedule.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!result) return res.status(404).send({ message: "Schedule not found" });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Update failed" });
  }
};

// ৬. শিডিউল ডিলিট করা
exports.deleteAssignment = async (req, res) => {
  try {
    const result = await Schedule.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).send({ message: "Schedule not found" });
    res.send({ message: "Schedule deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: "Delete failed" });
  }
};
