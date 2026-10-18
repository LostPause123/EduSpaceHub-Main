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
 * GET /api/tutor/stats
 * Statistics and recent activity for the authenticated tutor only
 */
export async function getTutorStats(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;

    // 1. Fetch tutor's bookings
    const { data: bookingsData, error: bookingsErr } = await supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .eq("tutor_id", tutorId)
      .order("start_time", { ascending: false });

    if (bookingsErr) {
      return res.status(500).json({ success: false, error: bookingsErr.message });
    }

    const allBookings = bookingsData || [];
    const totalBookings = allBookings.length;

    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    const studentIdSet = new Set();
    const now = Date.now();

    allBookings.forEach((b) => {
      if (b.student_id) studentIdSet.add(b.student_id);

      const end = new Date(b.end_time);
      if (b.status === "cancelled") {
        cancelledBookings++;
      } else if (b.status === "completed" || (!isNaN(end.getTime()) && end.getTime() < now)) {
        completedBookings++;
      } else {
        upcomingBookings++;
      }
    });

    // 2. Fetch student profiles for recent / upcoming bookings
    const studentIds = allBookings.map((b) => b.student_id);
    const studentMap = await fetchStudentProfilesMap(studentIds);

    const formattedBookings = allBookings.map((row) => {
      const base = formatBookingRow(row);
      const student = studentMap[row.student_id];
      return {
        ...base,
        studentId: row.student_id,
        studentName: student?.full_name || "Student",
        studentEmail: student?.email || "",
        studentAvatar: student?.avatar_url || "",
      };
    });

    const upcomingSessions = formattedBookings
      .filter((b) => b.status === "upcoming")
      .slice(0, 5);

    const recentBookings = formattedBookings.slice(0, 8);

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        upcomingBookings,
        completedBookings,
        cancelledBookings,
        totalStudents: studentIdSet.size,
        hourlyRate: req.tutorUser.tutorRecord.hourly_rate || 40,
        rating: req.tutorUser.tutorRecord.rating || 5.0,
      },
      tutor: {
        id: req.tutorUser.tutorId,
        profileId: req.tutorUser.profileId,
        name: req.tutorUser.name,
        email: req.tutorUser.email,
        avatarUrl: req.tutorUser.avatarUrl,
        subjects: req.tutorUser.tutorRecord.subjects || [],
        experience_years: req.tutorUser.tutorRecord.experience_years || 0,
        bio: req.tutorUser.tutorRecord.bio || "",
      },
      upcomingSessions,
      recentBookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching tutor stats.",
    });
  }
}

/**
 * GET /api/tutor/bookings
 * List of bookings for the authenticated tutor with student details
 */
export async function getTutorBookings(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;
    const { status } = req.query;

    let query = supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .eq("tutor_id", tutorId)
      .order("start_time", { ascending: false });

    if (status && status !== "all") {
      if (status === "cancelled") {
        query = query.eq("status", "cancelled");
      } else if (status === "completed") {
        query = query.or(`status.eq.completed,end_time.lt.${new Date().toISOString()}`);
      } else if (status === "upcoming") {
        query = query
          .neq("status", "cancelled")
          .neq("status", "completed")
          .gte("end_time", new Date().toISOString());
      }
    }

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
      };
    });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching tutor bookings.",
    });
  }
}

/**
 * PATCH /api/tutor/bookings/:id/status
 * Tutor updates their own session status (e.g. completed, cancelled)
 */
export async function updateTutorBookingStatus(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, error: "Booking ID and status are required." });
    }

    // Verify booking belongs to this tutor
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, tutor_id, notes")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !booking) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }

    if (booking.tutor_id !== tutorId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden. You cannot modify bookings belonging to another tutor.",
      });
    }

    const updatePayload = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, error: updateErr.message });
    }

    return res.status(200).json({
      success: true,
      booking: updated,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while updating booking status.",
    });
  }
}

/**
 * GET /api/tutor/students
 * List of students who have booked sessions with this tutor
 */
export async function getTutorStudents(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, student_id, start_time, end_time, status, notes")
      .eq("tutor_id", tutorId)
      .order("start_time", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const studentStatsMap = {};
    const now = Date.now();

    (bookings || []).forEach((b) => {
      if (!b.student_id) return;
      if (!studentStatsMap[b.student_id]) {
        studentStatsMap[b.student_id] = {
          studentId: b.student_id,
          totalSessions: 0,
          completedSessions: 0,
          upcomingSessions: 0,
          lastSessionDate: null,
          nextSessionDate: null,
        };
      }

      const stat = studentStatsMap[b.student_id];
      stat.totalSessions++;

      const end = new Date(b.end_time);
      const isPast = !isNaN(end.getTime()) && end.getTime() < now;

      if (b.status === "completed" || (b.status !== "cancelled" && isPast)) {
        stat.completedSessions++;
        if (!stat.lastSessionDate || new Date(b.start_time) > new Date(stat.lastSessionDate)) {
          stat.lastSessionDate = b.start_time;
        }
      } else if (b.status !== "cancelled" && !isPast) {
        stat.upcomingSessions++;
        if (!stat.nextSessionDate || new Date(b.start_time) < new Date(stat.nextSessionDate)) {
          stat.nextSessionDate = b.start_time;
        }
      }
    });

    const studentIds = Object.keys(studentStatsMap);
    const studentProfileMap = await fetchStudentProfilesMap(studentIds);

    const students = studentIds.map((sid) => {
      const profile = studentProfileMap[sid];
      const stats = studentStatsMap[sid];
      return {
        id: sid,
        name: profile?.full_name || "Student",
        email: profile?.email || "",
        avatarUrl: profile?.avatar_url || "",
        totalSessions: stats.totalSessions,
        completedSessions: stats.completedSessions,
        upcomingSessions: stats.upcomingSessions,
        lastSessionDate: stats.lastSessionDate,
        nextSessionDate: stats.nextSessionDate,
      };
    });

    return res.status(200).json({
      success: true,
      students,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching tutor students.",
    });
  }
}

/**
 * GET /api/tutor/schedules
 * Return all sessions for weekly schedule calendar
 */
export async function getTutorSchedules(req, res) {
  try {
    const tutorId = req.tutorUser.tutorId;

    const { data: rows, error } = await supabase
      .from("bookings")
      .select("id, student_id, start_time, end_time, status, notes, tutors(*, profiles(*))")
      .eq("tutor_id", tutorId)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const studentIds = (rows || []).map((r) => r.student_id);
    const studentMap = await fetchStudentProfilesMap(studentIds);

    const schedules = (rows || []).map((r) => {
      const student = studentMap[r.student_id];
      return {
        id: r.id,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status,
        notes: r.notes,
        studentName: student?.full_name || "Student",
        studentEmail: student?.email || "",
        studentAvatar: student?.avatar_url || "",
      };
    });

    return res.status(200).json({
      success: true,
      schedules,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching tutor schedule.",
    });
  }
}

/**
 * GET /api/tutor/profile
 * Return tutor's profile details
 */
export async function getTutorProfile(req, res) {
  try {
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .eq("id", req.tutorUser.profileId)
      .single();

    if (profErr) {
      return res.status(500).json({ success: false, error: profErr.message });
    }

    const { data: tutor, error: tutErr } = await supabase
      .from("tutors")
      .select("*")
      .eq("id", req.tutorUser.tutorId)
      .single();

    if (tutErr) {
      return res.status(500).json({ success: false, error: tutErr.message });
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: tutor.id,
        profileId: profile.id,
        name: profile.full_name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        bio: tutor.bio || "",
        subjects: tutor.subjects || [],
        hourly_rate: tutor.hourly_rate || 40,
        experience_years: tutor.experience_years || 0,
        rating: tutor.rating || 5.0,
        is_active: tutor.is_active !== false,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while fetching tutor profile.",
    });
  }
}

/**
 * PATCH /api/tutor/profile
 * Update tutor bio, subjects, rate, experience, full_name
 */
export async function updateTutorProfile(req, res) {
  try {
    const { bio, subjects, hourly_rate, experience_years, full_name } = req.body;

    const tutorUpdates = {};
    if (bio !== undefined) tutorUpdates.bio = bio;
    if (subjects !== undefined) tutorUpdates.subjects = subjects;
    if (hourly_rate !== undefined) tutorUpdates.hourly_rate = Number(hourly_rate);
    if (experience_years !== undefined) tutorUpdates.experience_years = Number(experience_years);
    tutorUpdates.updated_at = new Date().toISOString();

    const { data: updatedTutor, error: tutErr } = await supabase
      .from("tutors")
      .update(tutorUpdates)
      .eq("id", req.tutorUser.tutorId)
      .select()
      .single();

    if (tutErr) {
      return res.status(500).json({ success: false, error: tutErr.message });
    }

    if (full_name !== undefined) {
      await supabase
        .from("profiles")
        .update({ full_name, updated_at: new Date().toISOString() })
        .eq("id", req.tutorUser.profileId);
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      tutor: updatedTutor,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred while updating tutor profile.",
    });
  }
}
