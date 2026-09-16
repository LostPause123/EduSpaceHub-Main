import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./supabase.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/tutors", tutorRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "EduSpace API is running",
  });
});

// Supabase test endpoint
app.get("/api/supabase-test", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Supabase connection failed",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Supabase connection successful",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unexpected error",
      error: error.message,
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`EduSpace API running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[Error] Port ${PORT} is already in use by another process.`);
    console.error(`Please terminate the existing process using port ${PORT} or check running Node processes.`);
  } else {
    console.error("[Server Error]", err);
  }
  process.exit(1);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("EduSpace API server gracefully closed.");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("EduSpace API server terminated.");
    process.exit(0);
  });
});