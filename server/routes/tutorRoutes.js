import { Router } from "express";
import { getTutors, getTutorById } from "../controllers/tutorController.js";

const router = Router();

// GET /api/tutors - Get all tutors where profile role is 'tutor'
router.get("/", getTutors);

// GET /api/tutors/:id - Get a single tutor by ID
router.get("/:id", getTutorById);

export default router;
