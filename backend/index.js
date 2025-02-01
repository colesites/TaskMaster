const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const collection = require("./config");
const Task = require("./models/task");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Convert data into JSON format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  cors({
    origin: [
      "https://task-master-rose-three.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// API routes prefix
app.use("/api", (req, res, next) => {
  // Add API route handling
  next();
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Middleware to check if user is NOT authenticated
const checkNotAuthenticated = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

  if (!token) {
    return next();
  }

  try {
    jwt.verify(token, JWT_SECRET);
    // If token is valid, redirect to home page
    return res.redirect("/");
  } catch (err) {
    // If token is invalid, proceed to login/signup
    return next();
  }
};

// Route to serve the HTML file
app.get("/", verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/sign-in", checkNotAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/sign-in/sign-in.html"));
});

app.get("/sign-up", checkNotAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/sign-up/sign-up.html"));
});

// Register user
app.post("/sign-up", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validate required fields
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Check if user already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await collection.create({
      username,
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      redirect: "/",
      message: "Registration successful",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// Login user
app.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await collection.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User does not exist" });
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      redirect: "/",
      message: "Login successful",
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Server error during signin" });
  }
});

// Protected route example
app.get("/api/user-data", verifyToken, async (req, res) => {
  try {
    const user = await collection.findOne({ email: req.user.email });
    res.json({ username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Task Routes
app.post("/api/tasks", verifyToken, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      user: req.user.userId,
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/tasks", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/tasks/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      req.body,
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
