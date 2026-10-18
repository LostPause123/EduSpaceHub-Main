import {
  createMaterial,
  getMaterialsForTutor,
  getMaterialById,
  updateTutorMaterial as serviceUpdateTutorMaterial,
  deleteTutorMaterial as serviceDeleteTutorMaterial,
  getAllMaterialsForAdmin,
  reviewMaterial as serviceReviewMaterial,
  publishMaterial as servicePublishMaterial,
  unpublishMaterial as serviceUnpublishMaterial,
  archiveMaterial as serviceArchiveMaterial,
  getMaterialsForStudent,
  verifyFileAccess,
  createSignedDownloadUrl,
} from "../services/materialService.js";

/**
 * POST /api/tutor/materials
 * Tutor uploads a new learning material
 */
export async function uploadTutorMaterial(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;
    const { title, description, subject } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "Please attach a document file." });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "Title is required." });
    }

    // Verify subject is one of the tutor's taught subjects if tutor has subjects listed
    const tutorSubjects = req.tutorUser.tutorRecord?.subjects || [];
    const selectedSubject = subject ? subject.trim() : tutorSubjects[0] || "General";

    const material = await createMaterial({
      tutorId,
      title: title.trim(),
      description: description ? description.trim() : "",
      subject: selectedSubject,
      file,
      tutorUser: req.tutorUser,
    });

    return res.status(201).json({
      success: true,
      message: "Material uploaded successfully and queued for admin review.",
      material,
    });
  } catch (err) {
    console.error("uploadTutorMaterial error:", err.message);
    return res.status(err.message.includes("limit") || err.message.includes("extension") || err.message.includes("format") ? 400 : 500).json({
      success: false,
      error: err.message || "Failed to upload material.",
    });
  }
}

/**
 * GET /api/tutor/materials
 * Get list of materials for the authenticated tutor
 */
export async function getTutorMaterials(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;
    const { status, subject, search } = req.query;

    const materials = await getMaterialsForTutor(tutorId, { status, subject, search });

    return res.status(200).json({
      success: true,
      materials,
    });
  } catch (err) {
    console.error("getTutorMaterials error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch materials.",
    });
  }
}

/**
 * GET /api/tutor/materials/:id
 * Get details of a tutor's own material
 */
export async function getTutorMaterialById(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;
    const { id } = req.params;

    const material = await getMaterialById(id);
    if (!material) {
      return res.status(404).json({ success: false, error: "Material not found." });
    }

    if (material.tutorId !== tutorId) {
      return res.status(403).json({ success: false, error: "Forbidden. You cannot view this material." });
    }

    return res.status(200).json({
      success: true,
      material,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch material details.",
    });
  }
}

/**
 * PATCH /api/tutor/materials/:id
 * Tutor updates metadata or resubmits revised file
 */
export async function updateTutorMaterial(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;
    const { id } = req.params;
    const { title, description, subject, resubmit, resubmissionNote } = req.body;
    const file = req.file;

    // Prevent tutors from attempting to approve or publish via updates
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (resubmit !== undefined) updates.resubmit = Boolean(resubmit);
    if (resubmissionNote !== undefined) updates.resubmissionNote = resubmissionNote;

    const updated = await serviceUpdateTutorMaterial(id, tutorId, updates, file, req.tutorUser);

    return res.status(200).json({
      success: true,
      message: updated.status === "pending_review" ? "Material resubmitted for admin review." : "Material updated successfully.",
      material: updated,
    });
  } catch (err) {
    console.error("updateTutorMaterial error:", err.message);
    const isClientErr = err.message.includes("Forbidden") || err.message.includes("Cannot modify") || err.message.includes("not found");
    return res.status(isClientErr ? 400 : 500).json({
      success: false,
      error: err.message || "Failed to update material.",
    });
  }
}

/**
 * DELETE /api/tutor/materials/:id
 * Tutor deletes draft/pending material
 */
export async function deleteTutorMaterial(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;
    const { id } = req.params;

    await serviceDeleteTutorMaterial(id, tutorId);

    return res.status(200).json({
      success: true,
      message: "Material deleted successfully.",
    });
  } catch (err) {
    console.error("deleteTutorMaterial error:", err.message);
    return res.status(err.message.includes("Forbidden") ? 403 : 400).json({
      success: false,
      error: err.message || "Failed to delete material.",
    });
  }
}

/**
 * GET /api/admin/materials
 * Admin lists all materials across all tutors
 */
export async function getAdminMaterials(req, res) {
  try {
    const { status, tutorId, subject, search } = req.query;

    const materials = await getAllMaterialsForAdmin({ status, tutorId, subject, search });

    return res.status(200).json({
      success: true,
      materials,
    });
  } catch (err) {
    console.error("getAdminMaterials error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch materials.",
    });
  }
}

/**
 * GET /api/admin/materials/:id
 * Admin gets full details and review history of a material
 */
export async function getAdminMaterialById(req, res) {
  try {
    const { id } = req.params;
    const material = await getMaterialById(id);

    if (!material) {
      return res.status(404).json({ success: false, error: "Material not found." });
    }

    return res.status(200).json({
      success: true,
      material,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch material details.",
    });
  }
}

/**
 * POST /api/admin/materials/:id/review
 * Admin reviews a material (approve, reject, request_revision)
 */
export async function reviewAdminMaterial(req, res) {
  try {
    const { id } = req.params;
    const { action, feedback, reason } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: "Review action is required ('approve', 'reject', or 'request_revision')." });
    }

    const updated = await serviceReviewMaterial(id, req.adminUser, { action, feedback, reason });

    return res.status(200).json({
      success: true,
      message: `Material review action '${action}' completed successfully.`,
      material: updated,
    });
  } catch (err) {
    console.error("reviewAdminMaterial error:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to submit review.",
    });
  }
}

/**
 * POST /api/admin/materials/:id/publish
 * Admin publishes an approved material
 */
export async function publishAdminMaterial(req, res) {
  try {
    const { id } = req.params;

    const published = await servicePublishMaterial(id, req.adminUser);

    return res.status(200).json({
      success: true,
      message: "Material published successfully. It is now accessible to enrolled students.",
      material: published,
    });
  } catch (err) {
    console.error("publishAdminMaterial error:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to publish material.",
    });
  }
}

/**
 * POST /api/admin/materials/:id/unpublish
 * Admin unpublishes a published material
 */
export async function unpublishAdminMaterial(req, res) {
  try {
    const { id } = req.params;

    const unpublished = await serviceUnpublishMaterial(id, req.adminUser);

    return res.status(200).json({
      success: true,
      message: "Material unpublished. It is no longer visible to students.",
      material: unpublished,
    });
  } catch (err) {
    console.error("unpublishAdminMaterial error:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to unpublish material.",
    });
  }
}

/**
 * POST /api/admin/materials/:id/archive
 * Admin archives a material
 */
export async function archiveAdminMaterial(req, res) {
  try {
    const { id } = req.params;

    const archived = await serviceArchiveMaterial(id, req.adminUser);

    return res.status(200).json({
      success: true,
      message: "Material archived successfully.",
      material: archived,
    });
  } catch (err) {
    console.error("archiveAdminMaterial error:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to archive material.",
    });
  }
}

/**
 * GET /api/materials/student
 * Student lists published materials for enrolled subjects
 */
export async function getStudentMaterials(req, res) {
  try {
    const studentProfileId = req.studentUser.id;
    const { subject, search } = req.query;

    const { materials, enrolledSubjects } = await getMaterialsForStudent(studentProfileId, { subject, search });

    return res.status(200).json({
      success: true,
      materials,
      enrolledSubjects,
    });
  } catch (err) {
    console.error("getStudentMaterials error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch student materials.",
    });
  }
}

/**
 * GET /api/materials/:id/download
 * Secure download / preview endpoint with role-based authorization check
 */
export async function downloadMaterialFile(req, res) {
  try {
    const { id } = req.params;
    const authResult = await verifyFileAccess(req.user, id);

    if (!authResult.allowed) {
      return res.status(authResult.status || 403).json({
        success: false,
        error: authResult.reason || "Access denied.",
      });
    }

    const material = authResult.material;
    if (!material.filePath) {
      return res.status(404).json({ success: false, error: "File path not found for this material." });
    }

    // Generate short-lived signed URL (300 seconds = 5 minutes)
    const signedUrl = await createSignedDownloadUrl(material.filePath, 300);

    return res.status(200).json({
      success: true,
      downloadUrl: signedUrl,
      fileName: material.originalFilename,
      mimeType: material.mimeType,
      expiresIn: 300,
    });
  } catch (err) {
    console.error("downloadMaterialFile error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate file access URL.",
    });
  }
}
