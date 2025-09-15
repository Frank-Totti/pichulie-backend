
const express = require("express");
const cors = require("cors");
const app = express();

const { connectDB } = require("./src/config/db.js")
const routes = require("./src/routes/routes.js") // add .js extension to specify it is the script
const { globalErrorHandler, notFoundHandler } = require("./src/middlewares/errorHandler")

const PORT = 3000;

// Middlewares
app.use(cors()); // Allow requests from the frontend
app.use(express.json());

// Main routes
app.use(routes);

app.get("/", (req, res) => {
  res.send("Express is working!");
});

// 404 handler for unmatched routes (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

connectDB();
