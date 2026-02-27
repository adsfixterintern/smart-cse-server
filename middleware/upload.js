const multer = require("multer");

// ইন-মেমোরি স্টোরেজ ব্যবহার করা হচ্ছে যাতে ফাইল সরাসরি বাফারে থাকে
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // সর্বোচ্চ ৫ মেগাবাইট ফাইল লিমিট
  },
  fileFilter: (req, file, cb) => {
    // শুধুমাত্র ইমেজ ফাইল এলাউ করার জন্য ফিল্টার
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed!"), false);
    }
  }
});

module.exports = upload;