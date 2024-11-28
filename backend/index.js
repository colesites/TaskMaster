const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const collection = require("./config");
const Task = require("./models/task");
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://task-master-c-tech.vercel.app' 
        : 'http://localhost:3000'
}));

// Convert data into JSON format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    return res.redirect('/');
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
  const data = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  };

  // Check if user already exists
  const existingUser = await collection.findOne({
    email: data.email,
  });

  if (existingUser) {
    res.status(400).json({ error: "User already exists" });
    return;
  }

  // Hash password using bcrypt
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(data.password, saltRounds);
  data.password = hashedPassword;

  const userdata = await collection.insertMany(data);
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: userdata[0]._id, email: data.email },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({ token });
});

// Login user
app.post("/sign-in", async (req, res) => {
    try {
        const check = await collection.findOne({
            email: req.body.email,
        });

        if(!check) {
            return res.status(400).json({ error: "User does not exist" });
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);

        if(isPasswordMatch) {
            // Generate JWT token
            const token = jwt.sign(
                { userId: check._id, email: check.email },
                JWT_SECRET,
                { expiresIn: "24h" }
            );
            res.json({ token });
        } else {
            res.status(400).json({ error: "Incorrect password" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
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
            user: req.user.userId
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
            user: req.user.userId
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
