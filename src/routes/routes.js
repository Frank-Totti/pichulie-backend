const express = require("express");
const userRoutes = require("./userRoutes");
const taskRoutes = require("./taskRoutes");

const router = express.Router();

// User routes (includes login, register, password reset)
router.use("/api/users", userRoutes);

// Task routes (create and get tasks)
router.use("/api/task", taskRoutes);

module.exports = router;