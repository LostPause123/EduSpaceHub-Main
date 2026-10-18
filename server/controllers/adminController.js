import { supabase } from "../supabase.js";
import { formatBookingRow } from "./bookingController.js";

/**
 * Helper to fetch student profile map for student_ids
 */
async function fetchStudentProfilesMap(studentIds) {
  if (!studentIds || studentIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(studentIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", uniqueIds);

  if (error || !profiles) return {};

  const map = {};
  profiles.forEach((p) => {
    map[p.id] = p;
  });
  return map;
}

/**
 * GET /api/admin/stats
 * Aggregates statistics for admin dashboard
 */
export async function getAdminStats(req, res) {
  try {
    // 1. Total Students
    const { count: totalStudents, error: studentErr } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student");

    if (studentErr) {
      return res.status(500).json({ success: false, error: studentErr.message });
    }

    // 2. Total Tutors
    const { count: totalTutors, error: tutorErr } = await supabase
      .from("tutors")
      .select("id", { count: "exact", head: true });

    if (tutorErr) {
      return res.status(500).json({ success: false, error: tutorErr.message });
    }

    // 3. Bookings counts by status
    const { data: bookingsData, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, start_time, end_time");

    if (bookingErr) {
      return res.status(500).json({ success: false, error: bookingErr.message });
    }

    const totalBookings = bookingsData ? bookingsData.length : 0;
    let pendingBookings = 0;
    let confirmedBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;

    (bookingsData || []).forEach((b) => {
      const end = new Date(b.end_time);
      if (b.status === "cancelled") {
        cancelledBookings++;
      } else if (b.status === "completed" || (!isNaN(end.getTime()) && end.getTime() < Date.now())) {
        completedBookings++;
      } else if (b.status === "pending") {
        pendingBookings++;
      } else {
        confirmedBookings++;
      }
    });

    // 4. Recent Bookings (top 8)
    const { data: recentRows, error: recentErr } = await supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .order("start_time", { ascending: false })
      .limit(8);

    if (recentErr) {
      return res.status(500).json({ success: false, error: recentErr.message });
    }

    const studentIds = (recentRows || []).map((r) => r.student_id);
    const studentMap = await fetchStudentProfilesMap(studentIds);

    const recentBookings = (recentRows || []).map((row) => {
      const base = formatBookingRow(row);
      const student = studentMap[row.student_id];
      return {
        ...base,
        studentName: student?.full_name || "Student",
        studentEmail: student?.email || "",
        studentAvatar: student?.avatar_url || "",
      };
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents: totalStudents || 0,
        totalTutors: totalTutors || 0,
        totalBookings: totalBookings || 0,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
      },
      recentBookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching admin stats.",
    });
  }
}

/**
 * GET /api/admin/tutors
 * Retrieves list of all tutors with profile information, booking count, and active status.
 */
export async function getAdminTutors(req, res) {
  try {
    const { data: tutorsData, error: tutorsErr } = await supabase
      .from("tutors")
      .select("id, bio, subjects, experience_years, hourly_rate, rating, is_active, profile_id, profiles!inner(id, full_name, email, role, avatar_url)");

    if (tutorsErr) {
      return res.status(500).json({ success: false, error: tutorsErr.message });
    }

    const { data: bookingsData, error: bookingsErr } = await supabase
      .from("bookings")
      .select("id, tutor_id");

    if (bookingsErr) {
      return res.status(500).json({ success: false, error: bookingsErr.message });
    }

    const bookingCountMap = {};
    (bookingsData || []).forEach((b) => {
      if (b.tutor_id) {
        bookingCountMap[b.tutor_id] = (bookingCountMap[b.tutor_id] || 0) + 1;
      }
    });

    const tutors = (tutorsData || []).map((t) => ({
      id: t.id,
      profile_id: t.profiles?.id,
      full_name: t.profiles?.full_name || "Tutor",
      name: t.profiles?.full_name || "Tutor",
      email: t.profiles?.email || "",
      role: t.profiles?.role || "tutor",
      bio: t.bio || "",
      subjects: t.subjects || [],
      subject: t.subjects?.[0] || "General",
      hourly_rate: t.hourly_rate || 40,
      pricePerHour: t.hourly_rate || 40,
      rating: t.rating || 5.0,
      experience_years: t.experience_years || 0,
      avatar_url: t.profiles?.avatar_url || "",
      avatarUrl: t.profiles?.avatar_url || "",
      is_active: t.is_active !== false,
      bookingCount: bookingCountMap[t.id] || 0,
    }));

    return res.status(200).json({
      success: true,
      tutors,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching tutors.",
    });
  }
}

/**
 * PATCH /api/admin/tutors/:id
 * Updates tutor active status, subjects, rate, or bio safely.
 */
export async function updateAdminTutor(req, res) {
  try {
    const { id } = req.params;
    const { is_active, subjects, hourly_rate, bio, experience_years, full_name, avatar_url } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "Tutor ID parameter is required." });
    }

    // Fetch tutor record first to get profile_id
    const { data: tutorRow, error: fetchErr } = await supabase
      .from("tutors")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ success: false, error: fetchErr.message });
    }
    if (!tutorRow) {
      return res.status(404).json({ success: false, error: "Tutor not found." });
    }

    // Update tutors table payload
    const tutorUpdatePayload = {};
    if (typeof is_active === "boolean") tutorUpdatePayload.is_active = is_active;
    if (Array.isArray(subjects)) tutorUpdatePayload.subjects = subjects;
    if (typeof hourly_rate === "number" || typeof hourly_rate === "string") {
      tutorUpdatePayload.hourly_rate = Number(hourly_rate);
    }
    if (typeof bio === "string") tutorUpdatePayload.bio = bio;
    if (typeof experience_years === "number" || typeof experience_years === "string") {
      tutorUpdatePayload.experience_years = Number(experience_years);
    }

    if (Object.keys(tutorUpdatePayload).length > 0) {
      const { error: updateTutorErr } = await supabase
        .from("tutors")
        .update(tutorUpdatePayload)
        .eq("id", id);

      if (updateTutorErr) {
        return res.status(500).json({ success: false, error: updateTutorErr.message });
      }
    }

    // Update profiles table if full_name or avatar_url changed
    const profileUpdatePayload = {};
    if (typeof full_name === "string" && full_name.trim()) profileUpdatePayload.full_name = full_name.trim();
    if (typeof avatar_url === "string") profileUpdatePayload.avatar_url = avatar_url;

    if (Object.keys(profileUpdatePayload).length > 0 && tutorRow.profile_id) {
      const { error: updateProfErr } = await supabase
        .from("profiles")
        .update(profileUpdatePayload)
        .eq("id", tutorRow.profile_id);

      if (updateProfErr) {
        return res.status(500).json({ success: false, error: updateProfErr.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Tutor updated successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while updating tutor.",
    });
  }
}

/**
 * GET /api/admin/students
 * Retrieves list of all student profiles with booking count.
 */
export async function getAdminStudents(req, res) {
  try {
    const { data: studentsData, error: studentsErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, created_at")
      .eq("role", "student");

    if (studentsErr) {
      return res.status(500).json({ success: false, error: studentsErr.message });
    }

    const { data: bookingsData, error: bookingsErr } = await supabase
      .from("bookings")
      .select("id, student_id");

    if (bookingsErr) {
      return res.status(500).json({ success: false, error: bookingsErr.message });
    }

    const bookingCountMap = {};
    (bookingsData || []).forEach((b) => {
      if (b.student_id) {
        bookingCountMap[b.student_id] = (bookingCountMap[b.student_id] || 0) + 1;
      }
    });

    const students = (studentsData || []).map((s) => ({
      id: s.id,
      full_name: s.full_name || "Student",
      name: s.full_name || "Student",
      email: s.email || "",
      avatar_url: s.avatar_url || "",
      avatarUrl: s.avatar_url || "",
      created_at: s.created_at || new Date().toISOString(),
      bookingCount: bookingCountMap[s.id] || 0,
      status: "active",
    }));

    return res.status(200).json({
      success: true,
      students,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching students.",
    });
  }
}

/**
 * GET /api/admin/bookings
 * Retrieves all platform bookings with detailed student and tutor profile info.
 */
export async function getAdminBookings(req, res) {
  try {
    const { status, tutor_id, student_id } = req.query;

    let query = supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .order("start_time", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (tutor_id && tutor_id !== "all") query = query.eq("tutor_id", tutor_id);
    if (student_id && student_id !== "all") query = query.eq("student_id", student_id);

    const { data: rows, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const studentIds = (rows || []).map((r) => r.student_id);
    const studentMap = await fetchStudentProfilesMap(studentIds);

    const bookings = (rows || []).map((row) => {
      const base = formatBookingRow(row);
      const student = studentMap[row.student_id];
      return {
        ...base,
        studentId: row.student_id,
        studentName: student?.full_name || "Student",
        studentEmail: student?.email || "",
        studentAvatar: student?.avatar_url || "",
        created_at: row.created_at || row.start_time,
      };
    });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching admin bookings.",
    });
  }
}

/**
 * PATCH /api/admin/bookings/:id/status
 * Safely updates booking status for admin
 */
export async function updateAdminBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes, reason } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "Booking ID is required." });
    }

    if (!status || !["confirmed", "completed", "cancelled", "pending"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid booking status provided." });
    }

    // Fetch existing booking
    const { data: currentBooking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ success: false, error: fetchErr.message });
    }
    if (!currentBooking) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }

    let updatedNotes = notes !== undefined ? notes : currentBooking.notes;
    if (status === "cancelled" && reason) {
      const cleanNotes = (updatedNotes || "").replace(/^\[Cancelled(?::\s*[^\]]*)?\]\s*/, "");
      updatedNotes = `[Cancelled: ${reason.trim()}] ${cleanNotes}`.trim();
    }

    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update({
        status,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, error: updateErr.message });
    }

    const studentMap = await fetchStudentProfilesMap([updated.student_id]);
    const student = studentMap[updated.student_id];

    const formatted = {
      ...formatBookingRow(updated),
      studentId: updated.student_id,
      studentName: student?.full_name || "Student",
      studentEmail: student?.email || "",
      studentAvatar: student?.avatar_url || "",
    };

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      booking: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while updating booking status.",
    });
  }
}

/**
 * POST /api/admin/set-teacher-password
 * Server-side endpoint to set temporary password for teacher accounts safely.
 * Accepts { email, password } or { password, updateAll: true }
 */
export async function setTeacherPassword(req, res) {
  try {
    // Check if the API endpoint is disabled by configuration (e.g. post-defense hardening)
    if (process.env.ENABLE_ADMIN_PASSWORD_API === "false") {
      return res.status(403).json({
        success: false,
        error: "Password management API endpoint is disabled by server configuration.",
      });
    }

    const { email, password, updateAll } = req.body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be a string of at least 6 characters.",
      });
    }

    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      return res.status(500).json({ success: false, error: listErr.message });
    }

    const teacherEmails = [
      "sarah.mitchell@eduspace.test",
      "james.chen@eduspace.test",
      "emma.rodriguez@eduspace.test",
      "michael.osei@eduspace.test",
      "aisha.patel@eduspace.test",
      "thomas.laurent@eduspace.test",
    ];

    let targetEmails = [];
    if (email) {
      targetEmails = [email.trim().toLowerCase()];
    } else if (updateAll) {
      targetEmails = teacherEmails;
    } else {
      return res.status(400).json({
        success: false,
        error: "Please specify an email or set updateAll: true.",
      });
    }

    const results = [];
    for (const em of targetEmails) {
      const u = users.find((user) => user.email?.toLowerCase() === em);
      if (!u) {
        results.push({ email: em, success: false, error: "User not found in Supabase Auth" });
        continue;
      }

      const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
        u.id,
        {
          password,
          email_confirm: true,
        }
      );

      if (updateErr) {
        results.push({ email: em, uuid: u.id, success: false, error: updateErr.message });
      } else {
        results.push({
          email: em,
          uuid: updated.user.id,
          uuidUnchanged: updated.user.id === u.id,
          success: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed password update for ${results.filter((r) => r.success).length} accounts.`,
      results,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while updating teacher password.",
    });
  }
}
