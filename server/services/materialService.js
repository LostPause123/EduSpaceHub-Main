import path from "path";
import crypto from "crypto";
import { supabase } from "../supabase.js";

export const BUCKET_NAME = "learning-materials";
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt"];

export const VALID_STATUSES = [
  "processing",
  "pending_review",
  "revision_requested",
  "rejected",
  "approved",
  "published",
  "archived",
];

/**
 * Sanitize filename to prevent directory traversal and invalid characters
 */
export function sanitizeFilename(originalName) {
  if (!originalName) return "file";
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext);
  const cleanBase = base.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_") || "document";
  return `${cleanBase}${ext}`;
}

/**
 * Validate file metadata (MIME type, extension, size)
 */
export function validateFile(file) {
  if (!file) {
    throw new Error("No file provided.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File extension '${ext}' is not supported. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, TXT.`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && file.mimetype !== "application/octet-stream") {
    throw new Error(`File MIME type '${file.mimetype}' is not permitted.`);
  }

  return true;
}

const META_PREFIX = "<!--EDUSPACE_META:";
const META_SUFFIX = ":EDUSPACE_META-->";

/**
 * Extract structured metadata from description if present
 */
export function parseDescriptionMetadata(rawDesc) {
  if (!rawDesc || typeof rawDesc !== "string") {
    return { cleanDescription: rawDesc || "", metadata: {} };
  }

  const startIdx = rawDesc.indexOf(META_PREFIX);
  const endIdx = rawDesc.indexOf(META_SUFFIX);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonStr = rawDesc.substring(startIdx + META_PREFIX.length, endIdx);
    const cleanDescription = rawDesc.substring(0, startIdx).trim() + rawDesc.substring(endIdx + META_SUFFIX.length).trim();
    try {
      const metadata = JSON.parse(jsonStr);
      return { cleanDescription, metadata };
    } catch {
      return { cleanDescription: rawDesc, metadata: {} };
    }
  }

  return { cleanDescription: rawDesc, metadata: {} };
}

/**
 * Embed structured metadata into description
 */
export function buildDescriptionWithMetadata(cleanDescription, metadata) {
  const jsonStr = JSON.stringify(metadata);
  return `${cleanDescription || ""}\n\n${META_PREFIX}${jsonStr}${META_SUFFIX}`.trim();
}

/**
 * Normalize a database row into a standard Material entity
 */
export function normalizeMaterial(row, tutorInfo = null) {
  if (!row) return null;

  const { cleanDescription, metadata } = parseDescriptionMetadata(row.description);

  const status = row.status || metadata.status || (row.is_public ? "published" : "pending_review");
  const subject = row.subject || metadata.subject || "General";
  const filePath = row.file_path || metadata.filePath || row.file_url || "";
  const originalFilename = row.original_filename || metadata.originalFilename || path.basename(filePath);
  const fileSize = row.file_size || metadata.fileSize || 0;
  const mimeType = row.mime_type || metadata.mimeType || "application/octet-stream";
  const reviewFeedback = row.review_feedback !== undefined ? row.review_feedback : (metadata.reviewFeedback || null);
  const reviewedBy = row.reviewed_by || metadata.reviewedBy || null;
  const publishedAt = row.published_at || metadata.publishedAt || null;
  const statusHistory = row.status_history || metadata.statusHistory || [];

  return {
    id: row.id,
    tutorId: row.tutor_id,
    tutorName: tutorInfo?.name || row.tutors?.profiles?.full_name || "Tutor",
    tutorEmail: tutorInfo?.email || row.tutors?.profiles?.email || "",
    title: row.title,
    description: cleanDescription,
    subject,
    fileType: row.file_type || path.extname(originalFilename).replace(".", "") || "pdf",
    filePath,
    originalFilename,
    fileSize,
    mimeType,
    status,
    isPublic: status === "published",
    reviewFeedback,
    reviewedBy,
    publishedAt,
    statusHistory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Upload file to private Supabase storage
 */
export async function uploadToStorage(tutorId, materialId, file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeName = sanitizeFilename(file.originalname);
  const storagePath = `materials/${tutorId}/${materialId}/${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  return { storagePath, safeName, ext: ext.replace(".", "") };
}

/**
 * Remove file from private Supabase storage
 */
export async function removeFromStorage(storagePath) {
  if (!storagePath) return;
  try {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
  } catch (err) {
    console.warn("Storage removal warning:", err.message);
  }
}

/**
 * Generate a short-lived signed URL for downloading/previewing
 */
export async function createSignedDownloadUrl(storagePath, expiresIn = 300) {
  if (!storagePath) throw new Error("No storage path provided.");

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed download URL: ${error?.message || "Unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * Fetch tutor info map for an array of tutor_ids
 */
export async function getTutorsMap(tutorIds) {
  if (!tutorIds || tutorIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(tutorIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data: tutors, error } = await supabase
    .from("tutors")
    .select("id, profile_id, subjects, profiles(id, full_name, email)")
    .in("id", uniqueIds);

  if (error || !tutors) return {};

  const map = {};
  tutors.forEach((t) => {
    const prof = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
    map[t.id] = {
      id: t.id,
      name: prof?.full_name || "Tutor",
      email: prof?.email || "",
      subjects: t.subjects || [],
    };
  });
  return map;
}

/**
 * Create a new learning material (Tutor action)
 */
export async function createMaterial({ tutorId, title, description, subject, file, tutorUser }) {
  if (!tutorId || !title || !file) {
    throw new Error("Tutor ID, title, and file are required.");
  }

  validateFile(file);

  const materialId = crypto.randomUUID();
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");

  // 1. Initial history record
  const initialHistory = [
    {
      status: "processing",
      timestamp: new Date().toISOString(),
      action: "upload_started",
      actorId: tutorUser.userId,
      actorName: tutorUser.name,
      actorRole: "tutor",
    },
  ];

  // 2. Upload file to private storage
  let storageResult;
  try {
    storageResult = await uploadToStorage(tutorId, materialId, file);
  } catch (uploadErr) {
    throw new Error(`File storage upload failed: ${uploadErr.message}`);
  }

  // 3. Mark processed -> pending_review
  initialHistory.push({
    status: "pending_review",
    timestamp: new Date().toISOString(),
    action: "submitted_for_review",
    actorId: tutorUser.userId,
    actorName: tutorUser.name,
    actorRole: "tutor",
  });

  const metadata = {
    status: "pending_review",
    subject: subject || "General",
    filePath: storageResult.storagePath,
    originalFilename: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    reviewFeedback: null,
    reviewedBy: null,
    publishedAt: null,
    statusHistory: initialHistory,
  };

  const rawDescription = buildDescriptionWithMetadata(description, metadata);

  // Try to write to database with native columns if present, otherwise fallback
  const insertPayload = {
    id: materialId,
    tutor_id: tutorId,
    title: title.trim(),
    description: rawDescription,
    file_url: storageResult.storagePath,
    file_type: ext,
    is_public: false,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("learning_materials")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr) {
    // Cleanup orphaned storage file on database error
    await removeFromStorage(storageResult.storagePath);
    console.error("Database insert failed, cleaned up storage:", insertErr);
    throw new Error(`Database error saving material: ${insertErr.message}`);
  }

  return normalizeMaterial(inserted, { name: tutorUser.name, email: tutorUser.email });
}

/**
 * Fetch all materials belonging to a specific tutor
 */
export async function getMaterialsForTutor(tutorId, filters = {}) {
  let query = supabase
    .from("learning_materials")
    .select("*, tutors(*, profiles(*))")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  const { data: rows, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch tutor materials: ${error.message}`);
  }

  const tutorsMap = await getTutorsMap([tutorId]);
  let materials = (rows || []).map((r) => normalizeMaterial(r, tutorsMap[tutorId]));

  if (filters.status && filters.status !== "all") {
    materials = materials.filter((m) => m.status === filters.status);
  }
  if (filters.subject && filters.subject !== "all") {
    materials = materials.filter((m) => m.subject.toLowerCase() === filters.subject.toLowerCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q)
    );
  }

  return materials;
}

/**
 * Get single material by ID
 */
export async function getMaterialById(id) {
  const { data: row, error } = await supabase
    .from("learning_materials")
    .select("*, tutors(*, profiles(*))")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const tutorsMap = await getTutorsMap([row.tutor_id]);
  return normalizeMaterial(row, tutorsMap[row.tutor_id]);
}

/**
 * Tutor updates material metadata or resubmits revised file
 */
export async function updateTutorMaterial(id, tutorId, updates, newFile, tutorUser) {
  const existing = await getMaterialById(id);
  if (!existing) {
    throw new Error("Material not found.");
  }

  if (existing.tutorId !== tutorId) {
    throw new Error("Forbidden. You can only edit your own materials.");
  }

  // Tutors cannot edit published or archived materials directly without admin workflow
  if (existing.status === "archived") {
    throw new Error("Cannot modify an archived material.");
  }

  let newFilePath = existing.filePath;
  let newOriginalName = existing.originalFilename;
  let newFileSize = existing.fileSize;
  let newMimeType = existing.mimeType;
  let newFileType = existing.fileType;
  let nextStatus = existing.status;

  const history = [...(existing.statusHistory || [])];

  // If a new file is uploaded
  if (newFile) {
    validateFile(newFile);
    const storageResult = await uploadToStorage(tutorId, id, newFile);

    // Remove old file if path differs
    if (existing.filePath && existing.filePath !== storageResult.storagePath) {
      await removeFromStorage(existing.filePath);
    }

    newFilePath = storageResult.storagePath;
    newOriginalName = newFile.originalname;
    newFileSize = newFile.size;
    newMimeType = newFile.mimetype;
    newFileType = storageResult.ext;

    // Resubmission transitions status back to pending_review
    if (existing.status === "revision_requested") {
      nextStatus = "pending_review";
      history.push({
        status: "pending_review",
        timestamp: new Date().toISOString(),
        action: "resubmitted_with_file",
        actorId: tutorUser.userId,
        actorName: tutorUser.name,
        actorRole: "tutor",
        notes: updates.resubmissionNote || "Resubmitted revised file for review",
      });
    }
  } else if (existing.status === "revision_requested" && updates.resubmit) {
    nextStatus = "pending_review";
    history.push({
      status: "pending_review",
      timestamp: new Date().toISOString(),
      action: "resubmitted_metadata",
      actorId: tutorUser.userId,
      actorName: tutorUser.name,
      actorRole: "tutor",
      notes: updates.resubmissionNote || "Resubmitted revisions for review",
    });
  }

  const updatedMetadata = {
    status: nextStatus,
    subject: updates.subject !== undefined ? updates.subject : existing.subject,
    filePath: newFilePath,
    originalFilename: newOriginalName,
    fileSize: newFileSize,
    mimeType: newMimeType,
    reviewFeedback: nextStatus === "pending_review" ? null : existing.reviewFeedback,
    reviewedBy: existing.reviewedBy,
    publishedAt: existing.publishedAt,
    statusHistory: history,
  };

  const cleanDesc = updates.description !== undefined ? updates.description : existing.description;
  const rawDescription = buildDescriptionWithMetadata(cleanDesc, updatedMetadata);

  const updatePayload = {
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    description: rawDescription,
    file_url: newFilePath,
    file_type: newFileType,
    is_public: nextStatus === "published",
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from("learning_materials")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update material: ${error.message}`);
  }

  return normalizeMaterial(updated, { name: tutorUser.name, email: tutorUser.email });
}

/**
 * Tutor deletes draft or pending material
 */
export async function deleteTutorMaterial(id, tutorId) {
  const existing = await getMaterialById(id);
  if (!existing) {
    throw new Error("Material not found.");
  }

  if (existing.tutorId !== tutorId) {
    throw new Error("Forbidden. You can only delete your own materials.");
  }

  if (existing.status === "published") {
    throw new Error("Published materials cannot be deleted directly. Request admin to unpublish/archive.");
  }

  // Remove file from storage
  if (existing.filePath) {
    await removeFromStorage(existing.filePath);
  }

  const { error } = await supabase
    .from("learning_materials")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete material: ${error.message}`);
  }

  return true;
}

/**
 * Admin: Get all materials across tutors with filters
 */
export async function getAllMaterialsForAdmin(filters = {}) {
  const { data: rows, error } = await supabase
    .from("learning_materials")
    .select("*, tutors(*, profiles(*))")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch admin materials: ${error.message}`);
  }

  const tutorIds = (rows || []).map((r) => r.tutor_id);
  const tutorsMap = await getTutorsMap(tutorIds);

  let materials = (rows || []).map((r) => normalizeMaterial(r, tutorsMap[r.tutor_id]));

  if (filters.status && filters.status !== "all") {
    materials = materials.filter((m) => m.status === filters.status);
  }
  if (filters.tutorId && filters.tutorId !== "all") {
    materials = materials.filter((m) => m.tutorId === filters.tutorId);
  }
  if (filters.subject && filters.subject !== "all") {
    materials = materials.filter((m) => m.subject.toLowerCase() === filters.subject.toLowerCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.tutorName.toLowerCase().includes(q)
    );
  }

  return materials;
}

/**
 * Admin: Review material (approve, reject, request_revision)
 */
export async function reviewMaterial(id, adminUser, { action, feedback, reason }) {
  const existing = await getMaterialById(id);
  if (!existing) {
    throw new Error("Material not found.");
  }

  let nextStatus;
  let actionNote = "";

  if (action === "approve") {
    if (existing.status !== "pending_review" && existing.status !== "revision_requested") {
      throw new Error(`Cannot approve material with status '${existing.status}'.`);
    }
    nextStatus = "approved";
    actionNote = feedback || "Material approved by admin.";
  } else if (action === "reject") {
    if (!reason || !reason.trim()) {
      throw new Error("Rejection requires a specified reason.");
    }
    nextStatus = "rejected";
    actionNote = reason.trim();
  } else if (action === "request_revision") {
    if (!feedback || !feedback.trim()) {
      throw new Error("Revision request requires specific feedback for the tutor.");
    }
    nextStatus = "revision_requested";
    actionNote = feedback.trim();
  } else {
    throw new Error(`Invalid review action '${action}'.`);
  }

  const history = [...(existing.statusHistory || [])];
  history.push({
    status: nextStatus,
    timestamp: new Date().toISOString(),
    action: `review_${action}`,
    actorId: adminUser.id,
    actorName: adminUser.name || "Admin",
    actorRole: "admin",
    feedback: actionNote,
  });

  const updatedMetadata = {
    status: nextStatus,
    subject: existing.subject,
    filePath: existing.filePath,
    originalFilename: existing.originalFilename,
    fileSize: existing.fileSize,
    mimeType: existing.mimeType,
    reviewFeedback: actionNote,
    reviewedBy: adminUser.id,
    publishedAt: existing.publishedAt,
    statusHistory: history,
  };

  const rawDescription = buildDescriptionWithMetadata(existing.description, updatedMetadata);

  const { data: updated, error } = await supabase
    .from("learning_materials")
    .update({
      description: rawDescription,
      is_public: false, // Approval does not automatically publish
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update review status: ${error.message}`);
  }

  const tutorsMap = await getTutorsMap([existing.tutorId]);
  return normalizeMaterial(updated, tutorsMap[existing.tutorId]);
}

/**
 * Admin: Publish approved material
 */
export async function publishMaterial(id, adminUser) {
  const existing = await getMaterialById(id);
  if (!existing) {
    throw new Error("Material not found.");
  }

  if (existing.status !== "approved") {
    throw new Error(`Cannot publish material with status '${existing.status}'. Only 'approved' materials can be published.`);
  }

  const history = [...(existing.statusHistory || [])];
  const publishedAt = new Date().toISOString();

  history.push({
    status: "published",
    timestamp: publishedAt,
    action: "published",
    actorId: adminUser.id,
    actorName: adminUser.name || "Admin",
    actorRole: "admin",
  });

  const updatedMetadata = {
    status: "published",
    subject: existing.subject,
    filePath: existing.filePath,
    originalFilename: existing.originalFilename,
    fileSize: existing.fileSize,
    mimeType: existing.mimeType,
    reviewFeedback: existing.reviewFeedback,
    reviewedBy: existing.reviewedBy,
    publishedAt,
    statusHistory: history,
  };

  const rawDescription = buildDescriptionWithMetadata(existing.description, updatedMetadata);

  const { data: updated, error } = await supabase
    .from("learning_materials")
    .update({
      description: rawDescription,
      is_public: true,
      updated_at: publishedAt,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to publish material: ${error.message}`);
  }

  const tutorsMap = await getTutorsMap([existing.tutorId]);
  return normalizeMaterial(updated, tutorsMap[existing.tutorId]);
}

/**
 * Admin: Unpublish published material
 */
export async function unpublishMaterial(id, adminUser) {
  const existing = await getMaterialById(id);
  if (!existing) {
    throw new Error("Material not found.");
  }

  if (existing.status !== "published") {
    throw new Error("Only published materials can be unpublished.");
  }

  const history = [...(existing.statusHistory || [])];
  const timestamp = new Date().toISOString();

  history.push({
    status: "approved",
    timestamp,
    action: "unpublished",
    actorId: adminUser.id,
    actorName: adminUser.name || "Admin",
    actorRole: "admin",
  });

  const updatedMetadata = {
    status: "approved",
    subject: existing.subject,
    filePath: existing.filePath,
    originalFilename: existing.originalFilename,
    fileSize: existing.fileSize,
    mimeType: existing.mimeType,
    reviewFeedback: existing.reviewFeedback,
    reviewedBy: existing.reviewedBy,
    publishedAt: null,
    statusHistory: history,
  };

  const rawDescription = buildDescriptionWithMetadata(existing.description, updatedMetadata);

  const { data: updated, error } = await supabase
    .from("learning_materials")
    .update({
      description: rawDescription,
      is_public: false,
      updated_at: timestamp,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to unpublish material: ${error.message}`);
  }

  const tutorsMap = await getTutorsMap([existing.tutorId]);
  return normalizeMaterial(updated, tutorsMap[existing.tutorId]);
}

/**
 * Admin: Archive material
 */
export async function archiveMaterial(id, adminUser) {
  const existing = await getMaterialById(id);
  if (!existing) {
    throw new Error("Material not found.");
  }

  const history = [...(existing.statusHistory || [])];
  const timestamp = new Date().toISOString();

  history.push({
    status: "archived",
    timestamp,
    action: "archived",
    actorId: adminUser.id,
    actorName: adminUser.name || "Admin",
    actorRole: "admin",
  });

  const updatedMetadata = {
    status: "archived",
    subject: existing.subject,
    filePath: existing.filePath,
    originalFilename: existing.originalFilename,
    fileSize: existing.fileSize,
    mimeType: existing.mimeType,
    reviewFeedback: existing.reviewFeedback,
    reviewedBy: existing.reviewedBy,
    publishedAt: existing.publishedAt,
    statusHistory: history,
  };

  const rawDescription = buildDescriptionWithMetadata(existing.description, updatedMetadata);

  const { data: updated, error } = await supabase
    .from("learning_materials")
    .update({
      description: rawDescription,
      is_public: false,
      updated_at: timestamp,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to archive material: ${error.message}`);
  }

  const tutorsMap = await getTutorsMap([existing.tutorId]);
  return normalizeMaterial(updated, tutorsMap[existing.tutorId]);
}

/**
 * Determine enrolled subjects for a student
 * Based on student's bookings with tutors who teach those subjects
 */
export async function getStudentEnrolledSubjects(studentProfileId) {
  // Query all bookings for this student (past, present, upcoming)
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("tutor_id, tutors(subjects)")
    .eq("student_id", studentProfileId);

  if (error || !bookings) {
    return [];
  }

  const subjectsSet = new Set();
  bookings.forEach((b) => {
    const subjects = b.tutors?.subjects || [];
    subjects.forEach((s) => subjectsSet.add(s));
  });

  return Array.from(subjectsSet);
}

/**
 * Student: Get published materials for enrolled subjects
 */
export async function getMaterialsForStudent(studentProfileId, filters = {}) {
  const enrolledSubjects = await getStudentEnrolledSubjects(studentProfileId);

  // If student has no bookings/enrolled subjects yet, return empty list or allow filtering
  const { data: rows, error } = await supabase
    .from("learning_materials")
    .select("*, tutors(*, profiles(*))")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch student materials: ${error.message}`);
  }

  const tutorIds = (rows || []).map((r) => r.tutor_id);
  const tutorsMap = await getTutorsMap(tutorIds);

  let materials = (rows || [])
    .map((r) => normalizeMaterial(r, tutorsMap[r.tutor_id]))
    .filter((m) => m.status === "published"); // Only published

  // Enforce enrollment access restriction
  materials = materials.filter((m) => {
    // If student is enrolled in the subject
    return enrolledSubjects.some((s) => s.toLowerCase() === m.subject.toLowerCase());
  });

  if (filters.subject && filters.subject !== "all") {
    materials = materials.filter((m) => m.subject.toLowerCase() === filters.subject.toLowerCase());
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.tutorName.toLowerCase().includes(q)
    );
  }

  return { materials, enrolledSubjects };
}

/**
 * Verify file access authorization for preview/download
 */
export async function verifyFileAccess(user, materialId) {
  const material = await getMaterialById(materialId);
  if (!material) {
    return { allowed: false, reason: "Material not found", status: 404 };
  }

  // 1. Admin has universal access to review/audit all materials
  if (user.role === "admin") {
    return { allowed: true, material };
  }

  // 2. Tutor can only access their own materials
  if (user.role === "tutor") {
    if (material.tutorId === user.tutorId) {
      return { allowed: true, material };
    }
    return { allowed: false, reason: "Tutors may only access their own materials.", status: 403 };
  }

  // 3. Student can ONLY access PUBLISHED materials for enrolled subjects
  if (user.role === "student") {
    if (material.status !== "published") {
      return {
        allowed: false,
        reason: "Access denied. Material is not currently published.",
        status: 403,
      };
    }

    const enrolledSubjects = await getStudentEnrolledSubjects(user.id);
    const isEnrolled = enrolledSubjects.some((s) => s.toLowerCase() === material.subject.toLowerCase());

    if (!isEnrolled) {
      return {
        allowed: false,
        reason: `Access denied. You are not enrolled in '${material.subject}'.`,
        status: 403,
      };
    }

    return { allowed: true, material };
  }

  return { allowed: false, reason: "Unauthorized role.", status: 403 };
}
