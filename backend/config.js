require('dotenv').config();
const mongoose = require("mongoose");

const connect = mongoose.connect(process.env.MONGODB_URI);

connect
  .then(() => {
    console.log("Connected correctly to server");
  })
  .catch((err) => console.log(err.errmsg));

const loginSchema = new mongoose.Schema({
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
