const Attendance = require("../models/Attendance");

// ১. এটেনডেন্স আপসার্ট (একসাথে সেভ বা আপডেট)
exports.upsertAttendance = async (req, res) => {
  try {
    const { semester, course, date, attendance, teacher } = req.body;
    const filter = { semester, course, date };

    const updateDoc = {
      $set: {
        teacher,
        attendance, // { "studentId": "P/A/L" }
        updatedAt: new Date()
      }
    };

    // upsert: true মানে রেকর্ড না থাকলে তৈরি হবে
    const result = await Attendance.findOneAndUpdate(filter, updateDoc, {
      upsert: true,
      new: true
    });

    res.status(200).send({ message: "Attendance synced successfully", result });
  } catch (err) {
    res.status(500).send({ message: "Failed to sync attendance", error: err.message });
  }
};

// ২. সাধারণ ফিল্টার দিয়ে এটেনডেন্স গেট করা
exports.getAttendance = async (req, res) => {
  try {
    const { semester, batch, date } = req.query;
    let query = {};
    if (semester) query.semester = semester;
    if (batch) query.batch = batch;
    if (date) query.date = date;

    const result = await Attendance.find(query);
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to load data" });
  }
};

// ৩. মাসিক রিপোর্ট গেট করা (Regex ব্যবহার করে)
exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { semester, month, course } = req.query;
    const year = new Date().getFullYear();
    const formattedMonth = month.padStart(2, "0");
    const datePattern = new RegExp(`^${year}-${formattedMonth}-`);

    const query = {
      semester,
      course,
      date: { $regex: datePattern }
    };

    const result = await Attendance.find(query).sort({ date: 1 });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to load monthly data" });
  }
};

// ৪. নির্দিষ্ট স্টুডেন্টের এটেনডেন্স হিস্ট্রি
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { course } = req.query;

    // Map এর ভেতরে নির্দিষ্ট কী (Key) আছে কিনা চেক করা
    let query = { [`attendance.${studentId}`]: { $exists: true } };
    if (course) query.course = course;

    const records = await Attendance.find(query);

    const formattedData = records.map((record) => ({
      date: record.date,
      course: record.course,
      status: record.attendance.get(studentId) || "A",
      semester: record.semester,
    }));

    res.send(formattedData);
  } catch (err) {
    res.status(500).send({ message: "Failed to load user attendance" });
  }
};

// ৫. এটেনডেন্স চেক (অলরেডি শিট তৈরি হয়েছে কি না)
exports.checkAttendance = async (req, res) => {
  try {
    const { semester, course, date } = req.query;
    const result = await Attendance.findOne({ semester, course, date });
    res.send(result || {});
  } catch (err) {
    res.status(500).send({ message: "Error checking records" });
  }
};

// ৬. ডিলিট এটেনডেন্স
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    await Attendance.findByIdAndDelete(id);
    res.send({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: "Delete failed" });
  }
};