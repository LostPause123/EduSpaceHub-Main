import { Router } from "express";
import {
  getAdminStats,
  getAdminTutors,
  updateAdminTutor,
  getAdminStudents,
  getAdminBookings,
  updateAdminBookingStatus,
  setTeacherPassword,
} from "../controllers/adminController.js";
import {
  getAdminMaterials,
  getAdminMaterialById,
  reviewAdminMaterial,
  publishAdminMaterial,
  unpublishAdminMaterial,
  archiveAdminMaterial,
} from "../controllers/materialController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/admin/stats - Admin Dashboard Statistics & Recent Bookings
router.get("/stats", getAdminStats);

// GET /api/admin/tutors - Manage Tutors list
router.get("/tutors", getAdminTutors);

// PATCH /api/admin/tutors/:id - Update Tutor (toggle active status, subjects, hourly rate, bio)
router.patch("/tutors/:id", updateAdminTutor);

// GET /api/admin/students - Manage Students list
router.get("/students", getAdminStudents);

// GET /api/admin/bookings - Manage Bookings list
router.get("/bookings", getAdminBookings);

// PATCH /api/admin/bookings/:id/status - Update booking status
router.patch("/bookings/:id/status", updateAdminBookingStatus);

// POST /api/admin/set-teacher-password - Safely set temporary password for teachers (Admin Authentication Required)
router.post("/set-teacher-password", requireAdminAuth, setTeacherPassword);

// Learning Materials Management Endpoints (Admin Authentication Required)
// GET /api/admin/materials - List materials uploaded by all tutors with filtering
router.get("/materials", requireAdminAuth, getAdminMaterials);

// GET /api/admin/materials/:id - Material details with review and status history
router.get("/materials/:id", requireAdminAuth, getAdminMaterialById);

// POST /api/admin/materials/:id/review - Review material (approve, reject with reason, request revision with feedback)
router.post("/materials/:id/review", requireAdminAuth, reviewAdminMaterial);

// POST /api/admin/materials/:id/publish - Publish approved material
router.post("/materials/:id/publish", requireAdminAuth, publishAdminMaterial);

// POST /api/admin/materials/:id/unpublish - Unpublish published material
router.post("/materials/:id/unpublish", requireAdminAuth, unpublishAdminMaterial);

// POST /api/admin/materials/:id/archive - Archive material
router.post("/materials/:id/archive", requireAdminAuth, archiveAdminMaterial);

export default router;
