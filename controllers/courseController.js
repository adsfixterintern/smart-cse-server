const Course = require("../models/Course");
const User = require("../models/User");

// ১. সেমিস্টার অনুযায়ী কোর্স লিস্ট
exports.getCoursesBySemester = async (req, res) => {
  try {
    const { semester } = req.params;
    const courses = await Course.find({ semester });
    res.status(200).send(courses || []);
  } catch (error) {
    res.status(500).send({ message: "Error fetching courses" });
  }
};

// ২. সব কোর্স অথবা কোড দিয়ে সার্চ
exports.getAllCourses = async (req, res) => {
  try {
    const { code } = req.query;
    let query = {};
    if (code) query.code = code; // আপনার মডেলে 'code' ফিল্ডটি থাকলে
    
    const courses = await Course.find(query);
    res.send(courses);
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ৩. নতুন কোর্স তৈরি (Create)
exports.createCourse = async (req, res) => {
  try {
    const courseData = req.body;
    const existingCourse = await Course.findOne({ code: courseData.code });

    if (existingCourse) {
      return res.status(409).send({ message: "Course already exists" });
    }

    const result = await Course.create(courseData);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to create course" });
  }
};

// ৪. কোর্স ডিলিট (Delete)
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Course.findByIdAndDelete(id);
    if (!result) return res.status(404).send({ message: "Course not found" });
    res.send({ message: "Course deleted", result });
  } catch (error) {
    res.status(500).send({ message: "Delete failed" });
  }
};

// ৫. কোর্স আপডেট (Update/Patch)
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Course.findByIdAndUpdate(
      id, 
      { $set: req.body }, 
      { new: true } // এটি আপডেট হওয়া নতুন ডাটা রিটার্ন করবে
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Update process failed" });
  }
};

// ৬. টিচারের এসাইন করা কোর্সসমূহ
exports.getTeacherCourses = async (req, res) => {
  try {
    const email = req.decoded.email;
    const courses = await Course.find({ teacherEmail: email });
    res.send(courses);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch teacher courses" });
  }
};

// ৭. সেমিস্টার অনুযায়ী স্টুডেন্ট লিস্ট (Teacher/Admin access)
exports.getStudentsBySemester = async (req, res) => {
  try {
    const { semester } = req.params;
    const students = await User.find({ role: "student", semester: semester })
      .select("name studentId email"); // নির্দিষ্ট ফিল্ড প্রজেক্ট করা হলো
    res.send(students);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch students" });
  }
};