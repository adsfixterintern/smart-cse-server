const Notice = require("../models/Notice");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;

// ১. সব নোটিশ দেখা (Priority এবং Date অনুযায়ী সর্ট করা)
exports.getNotices = async (req, res) => {
  try {
    // Priority: High > Normal > Low (যদি স্ট্রিং হিসেবে থাকে তবে লজিক আলাদা হবে, 
    // তবে এখানে আমরা সিম্পল সর্টিং দেখাচ্ছি)
    const result = await Notice.find().sort({ createdAt: -1 });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch notices" });
  }
};

// ২. নতুন নোটিশ পোস্ট করা
exports.postNotice = async (req, res) => {
  try {
    const { title, description, category, priority, imageUrl, publicId } = req.body;

    const notice = new Notice({
      title,
      description,
      category: category || "General",
      priority: priority || "Normal",
      imageUrl: imageUrl || null,
      imagePublicId: publicId || null,
      postedBy: req.decoded.email,
    });

    const result = await notice.save();
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to post notice" });
  }
};

// ৩. নোটিশ আপডেট করা
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    delete updatedData._id;

    const result = await Notice.findByIdAndUpdate(
      id,
      { $set: { ...updatedData } },
      { new: true }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
};

// ৪. নোটিশ ডিলিট করা (Cloudinary ইমেজ সহ)
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await Notice.findById(id);

    if (!notice) return res.status(404).send({ message: "Notice not found" });

    // Cloudinary থেকে ইমেজ ডিলিট
    if (notice.imagePublicId) {
      await cloudinary.uploader.destroy(notice.imagePublicId);
    }

    await Notice.findByIdAndDelete(id);
    res.send({ success: true, message: "Notice and Image deleted" });
  } catch (error) {
    res.status(500).send({ message: "Delete failed" });
  }
};

