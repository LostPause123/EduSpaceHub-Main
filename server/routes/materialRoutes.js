import { Router } from "express";
import { requireStudentAuth, requireAnyAuth } from "../middleware/authMiddleware.js";
import { getStudentMaterials, downloadMaterialFile } from "../controllers/materialController.js";

const router = Router();

// GET /api/materials/student - List published materials for student's enrolled subjects
router.get("/student", requireStudentAuth, getStudentMaterials);

// GET /api/materials/:id/download - Secure file download / preview URL (checks authorization by role)
router.get("/:id/download", requireAnyAuth, downloadMaterialFile);

export default router;
