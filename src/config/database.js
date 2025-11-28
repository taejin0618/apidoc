const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB 연결 성공: ${conn.connection.host}`);

    // 연결 이벤트 리스너
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB 연결 에러: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB 연결이 끊어졌습니다.");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB 재연결 성공");
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB 연결 실패: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
