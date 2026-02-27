const Result = require("../models/Result");

// হেল্পার ফাংশন: গ্রেড এবং পয়েন্ট ক্যালকুলেশন
const calculateGrade = (total) => {
  if (total >= 80) return { grade: "A+", point: 4.0 };
  if (total >= 75) return { grade: "A", point: 3.75 };
  if (total >= 70) return { grade: "A-", point: 3.5 };
  if (total >= 65) return { grade: "B+", point: 3.25 };
  if (total >= 60) return { grade: "B", point: 3.0 };
  if (total >= 55) return { grade: "B-", point: 2.75 };
  if (total >= 50) return { grade: "C+", point: 2.5 };
  if (total >= 45) return { grade: "C", point: 2.25 };
  if (total >= 40) return { grade: "D", point: 2.0 };
  return { grade: "F", point: 0.0 };
};

// ১. সব রেজাল্ট দেখা (Admin/Teacher)
exports.getAllResults = async (req, res) => {
  try {
    const results = await Result.find();
    res.status(200).send(results);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch results" });
  }
};

// ২. রেজাল্ট ইনপুট দেওয়া
exports.postResult = async (req, res) => {
  try {
    const { ct, mid, attendance, presentation, assignment, finalMark, ...rest } = req.body;

    const totalMarks = [ct, mid, attendance, presentation, assignment, finalMark].reduce(
      (acc, val) => acc + Number(val || 0), 0
    );

    const { grade, point } = calculateGrade(totalMarks);

    const resultDoc = new Result({
      ...rest,
      marks: totalMarks,
      breakdown: { ct, mid, attendance, presentation, assignment, finalMark },
      grade,
      point
    });

    const result = await resultDoc.save();
    res.status(201).send(result);
  } catch (error) {
    if (error.code === 11000) return res.status(409).send({ message: "Result already exists for this course" });
    res.status(500).send({ message: "Failed to input result" });
  }
};

// ৩. স্টুডেন্টের নিজের রেজাল্ট দেখা
exports.getMyResults = async (req, res) => {
  try {
    const email = req.decoded.email;
    const results = await Result.find({ studentEmail: email }).sort({ semester: -1 });
    res.send(results);
  } catch (error) {
    res.status(500).send({ message: "Error fetching results" });
  }
};

// ৪. ট্রান্সক্রিপ্ট এবং CGPA ক্যালকুলেশন
exports.getMyTranscript = async (req, res) => {
  try {
    const email = req.decoded.email;
    const results = await Result.find({ studentEmail: email });

    const totalPoints = results.reduce((sum, res) => sum + res.point, 0);
    const cgpa = results.length > 0 ? (totalPoints / results.length).toFixed(2) : 0;

    res.send({
      results,
      cgpa: parseFloat(cgpa),
      totalCourses: results.length,
    });
  } catch (error) {
    res.status(500).send({ message: "Transcript error" });
  }
};

// ৫. রেজাল্ট আপডেট (Recalculate logic সহ)
exports.updateResult = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBreakdown = req.body;

    const totalMarks = Object.values(updatedBreakdown).reduce(
      (sum, val) => sum + Number(val || 0), 0
    );

    const { grade, point } = calculateGrade(totalMarks);

    const result = await Result.findByIdAndUpdate(
      id,
      { $set: { breakdown: updatedBreakdown, marks: totalMarks, grade, point } },
      { new: true }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
};

// ৬. রেজাল্ট ডিলিট
exports.deleteResult = async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    res.send({ message: "Result deleted" });
  } catch (error) {
    res.status(500).send({ message: "Delete failed" });
  }
};