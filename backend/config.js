require('dotenv').config();
const mongoose = require("mongoose");

const connect = mongoose.connect(process.env.MONGODB_URI);

// Log the connection URI (but mask sensitive data)
const maskedUri = process.env.MONGODB_URI 
  ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@')
  : 'No URI provided';
console.log('Attempting to connect to MongoDB with URI:', maskedUri);

connect
  .then(() => {
    console.log("MongoDB Connected Successfully");
    console.log("Database Name:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.error("Error Details:", {
      name: err.name,
      message: err.message,
      code: err.code
    });
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
