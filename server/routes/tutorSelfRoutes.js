import { Router } from "express";
import {
  getTutorStats,
  getTutorBookings,
  updateTutorBookingStatus,
  getTutorStudents,
  getTutorSchedules,
  getTutorProfile,
  updateTutorProfile,
} from "../controllers/tutorSelfController.js";
import {
  uploadTutorMaterial,
  getTutorMaterials,
  getTutorMaterialById,
  updateTutorMaterial,
  deleteTutorMaterial,
} from "../controllers/materialController.js";
import { requireTutorAuth } from "../middleware/authMiddleware.js";
import { uploadDocument } from "../middleware/uploadMiddleware.js";

const router = Router();

// Apply requireTutorAuth middleware to all tutor self-management routes
router.use(requireTutorAuth);

// GET /api/tutor/stats - Tutor Dashboard Statistics & Recent/Upcoming Sessions
router.get("/stats", getTutorStats);

// GET /api/tutor/bookings - Tutor Bookings list
router.get("/bookings", getTutorBookings);

// PATCH /api/tutor/bookings/:id/status - Update session status (confirmed, completed, cancelled)
router.patch("/bookings/:id/status", updateTutorBookingStatus);

// GET /api/tutor/students - List of students who booked with this tutor
router.get("/students", getTutorStudents);

// GET /api/tutor/schedules - Tutor schedule calendar data
router.get("/schedules", getTutorSchedules);

// GET /api/tutor/profile - Get tutor profile info
router.get("/profile", getTutorProfile);

// PATCH /api/tutor/profile - Update tutor profile info
router.patch("/profile", updateTutorProfile);

// Learning Materials Endpoints
// POST /api/tutor/materials - Upload new learning material
router.post("/materials", uploadDocument.single("file"), uploadTutorMaterial);

// GET /api/tutor/materials - List tutor's own learning materials
router.get("/materials", getTutorMaterials);

// GET /api/tutor/materials/:id - Get details of a single material
router.get("/materials/:id", getTutorMaterialById);

// PATCH /api/tutor/materials/:id - Update material metadata or resubmit with new file
router.patch("/materials/:id", uploadDocument.single("file"), updateTutorMaterial);

// DELETE /api/tutor/materials/:id - Delete draft/pending material
router.delete("/materials/:id", deleteTutorMaterial);

export default router;
