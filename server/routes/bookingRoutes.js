import { Router } from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
} from "../controllers/bookingController.js";

const router = Router();

// POST /api/bookings - Create a new booking
router.post("/", createBooking);

// GET /api/bookings - List bookings (requires ?student_id= or ?tutor_id=)
router.get("/", getBookings);

// GET /api/bookings/:id - Retrieve a specific booking by ID
router.get("/:id", getBookingById);

// PATCH /api/bookings/:id/cancel - Cancel a booking
router.patch("/:id/cancel", cancelBooking);

// PATCH /api/bookings/:id/reschedule - Reschedule a booking
router.patch("/:id/reschedule", rescheduleBooking);

export default router;
