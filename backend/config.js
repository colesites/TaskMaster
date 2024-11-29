require('dotenv').config();
const mongoose = require("mongoose");

const connect = mongoose.connect(process.env.MONGODB_URI);

connect
  .then(() => {
    console.log("Connected correctly to server");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if cannot connect to database
  });

const loginSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const collection = new mongoose.model("users", loginSchema);

module.exports = collection;
