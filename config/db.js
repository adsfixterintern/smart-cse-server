const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // পাসওয়ার্ড এনকোড করার লজিক (যদি সরাসরি URI-তে না থাকে)
    const encodedPass = encodeURIComponent(process.env.DB_PASS);
    
    // আপনার আগের URI ফরম্যাট অনুযায়ী Mongoose URI
    const uri = `mongodb+srv://${process.env.DB_USER}:${encodedPass}@cluster0.mdmdo0u.mongodb.net/smartCse?retryWrites=true&w=majority`;

    const conn = await mongoose.connect(uri, {
    });

    console.log(`✅ MongoDB Connected via Mongoose: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); 
  }
};

module.exports = connectDB;