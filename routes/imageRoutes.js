const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");
const { verifyJWT, verifyAdmin } = require("../middleware/auth");

// ইমেজ আপলোড রাউট
router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded" });
    }

    // বাফার থেকে Base64 এ রূপান্তর
    const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
      upload_preset: "smartcseimage",
    });

    res.json({
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (err) {
    console.error("Cloudinary Error:", err);
    res.status(500).send({ message: "Upload failed" });
  }
});

// ইমেজ ডিলিট রাউট
router.delete("/delete-image/:publicId", verifyJWT, verifyAdmin, async (req, res) => {
  const { publicId } = req.params;
  try {
    await cloudinary.uploader.destroy(publicId);
    res.send({ message: "Image deleted from Cloudinary" });
  } catch (err) {
    res.status(500).send({ message: "Delete failed" });
  }
});

module.exports = router;