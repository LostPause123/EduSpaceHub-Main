import { supabase } from "../supabase.js";

const TUTOR_AVATARS = {
  "20000000-0000-4000-8000-000000000001":
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format",
  "20000000-0000-4000-8000-000000000002":
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format",
  "20000000-0000-4000-8000-000000000003":
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&auto=format",
  "20000000-0000-4000-8000-000000000004":
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format",
  "20000000-0000-4000-8000-000000000005":
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format",
  "20000000-0000-4000-8000-000000000006":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
};

/**
 * Format a raw database booking row into the shape expected by the frontend Booking interface.
 */
export function formatBookingRow(row) {
  if (!row) return null;

  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  const duration =
    !isNaN(start.getTime()) && !isNaN(end.getTime())
      ? Math.round((end.getTime() - start.getTime()) / 60000)
      : 60;

  // Determine status
  let status = "upcoming";
  if (row.status === "cancelled") {
    status = "cancelled";
  } else if (row.status === "completed") {
    status = "completed";
  } else if (!isNaN(end.getTime()) && end.getTime() < Date.now()) {
    status = "completed";
  } else {
    status = "upcoming";
  }

  // Parse notes and cancellation reason from notes column
  let notes = row.notes || undefined;
  let cancelledReason = undefined;
  if (row.notes) {
    const cancelMatch = row.notes.match(/^\[Cancelled(?::\s*([^\]]*))?\]\s*(.*)$/s);
    if (cancelMatch) {
      cancelledReason = cancelMatch[1]?.trim() || "Cancelled by student";
      notes = cancelMatch[2]?.trim() || undefined;
    }
  }

  const tutorProfile = row.tutors?.profiles;
  const tutorName = tutorProfile?.full_name || "Dr. Sarah Mitchell";
  const tutorTitle =
    tutorProfile?.role === "tutor"
      ? row.tutors?.experience_years
        ? `${row.tutors.experience_years} years experience`
        : "Tutor"
      : "Tutor";
  const tutorSubject = row.tutors?.subjects?.[0] || "Mathematics";
  const tutorAvatar =
    tutorProfile?.avatar_url ||
    TUTOR_AVATARS[row.tutor_id] ||
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format";

  const hourlyRate = Number(row.tutors?.hourly_rate) || 45;
  const price = (hourlyRate * duration) / 60;

  const displayDate = !isNaN(start.getTime())
    ? start.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const time = !isNaN(start.getTime())
    ? start.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  const date = !isNaN(start.getTime())
    ? start.toISOString().split("T")[0]
    : "";

  const location = row.room_id ? "in-person" : "online";
  const meetingLink =
    location === "online"
      ? `https://meet.eduspace.io/room/${String(row.id).replace(/-/g, "").slice(0, 10)}`
      : undefined;
  const room = row.study_rooms?.name || (row.room_id ? "Study Room" : undefined);

  return {
    ...row,
    tutorId: row.tutor_id || "",
    tutorName,
    tutorTitle,
    tutorSubject,
    tutorAvatar,
    date,
    displayDate,
    time,
    duration,
    type: "one-on-one",
    status,
    notes,
    cancelledReason,
    location,
    price,
    meetingLink,
    room,
  };
}

/**
 * Helper to parse date/time inputs and calculate start_time and end_time.
 */
function resolveBookingTimes(body) {
  const { start_time, end_time, date, time, duration } = body;

  let start;
  if (start_time) {
    start = new Date(start_time);
  } else if (date && time) {
    start = new Date(`${date}T${time}:00`);
  }

  if (!start || isNaN(start.getTime())) {
    return {
      error:
        "Invalid or missing start time. Please provide 'start_time' or both 'date' and 'time'.",
    };
  }

  let end;
  if (end_time) {
    end = new Date(end_time);
  } else if (duration) {
    const durNum = Number(duration);
    if (isNaN(durNum) || durNum <= 0) {
      return { error: "Duration must be a positive number in minutes." };
    }
    end = new Date(start.getTime() + durNum * 60 * 1000);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }

  if (isNaN(end.getTime())) {
    return { error: "Invalid end time." };
  }

  if (end <= start) {
    return { error: "End time must be after start time." };
  }

  return { start, end };
}

/**
 * POST /api/bookings
 * Create a new booking with validation and conflict checking.
 */
export async function createBooking(req, res) {
  try {
    const { student_id, tutor_id, room_id, status, notes } = req.body;

    // 1. Validate required fields
    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: 'student_id' is required.",
      });
    }

    // 2. Resolve start and end times
    const timeResolution = resolveBookingTimes(req.body);
    if (timeResolution.error) {
      return res.status(400).json({
        success: false,
        error: timeResolution.error,
      });
    }

    const { start, end } = timeResolution;
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    // 3. Conflict Check: check if the tutor already has an overlapping active booking
    if (tutor_id) {
      const { data: conflicts, error: conflictErr } = await supabase
        .from("bookings")
        .select("id, tutor_id, start_time, end_time, status")
        .eq("tutor_id", tutor_id)
        .neq("status", "cancelled")
        .lt("start_time", endIso)
        .gt("end_time", startIso);

      if (conflictErr) {
        return res.status(500).json({
          success: false,
          error: `Failed to check for booking conflicts: ${conflictErr.message}`,
        });
      }

      if (conflicts && conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          error: "The requested time slot conflicts with an existing booking for this tutor.",
          conflictingBooking: conflicts[0],
        });
      }
    }

    // 4. Insert booking into Supabase
    const bookingPayload = {
      student_id,
      tutor_id: tutor_id || null,
      room_id: room_id || null,
      start_time: startIso,
      end_time: endIso,
      status: status || "confirmed",
      notes: notes || null,
    };

    const { data: newBooking, error: insertError } = await supabase
      .from("bookings")
      .insert([bookingPayload])
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .maybeSingle();

    if (insertError) {
      if (insertError.code === "23503") {
        return res.status(400).json({
          success: false,
          error: `Referenced entity not found: ${insertError.message}`,
        });
      }
      return res.status(500).json({
        success: false,
        error: insertError.message,
      });
    }

    const resultBooking = newBooking || bookingPayload;

    return res.status(201).json({
      success: true,
      booking: formatBookingRow(resultBooking),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected internal server error occurred.",
    });
  }
}

/**
 * GET /api/bookings
 * Get bookings with filter by student_id or tutor_id for user isolation.
 */
export async function getBookings(req, res) {
  try {
    const { student_id, tutor_id, status } = req.query;

    // Security: require student_id or tutor_id so a student cannot view other students' bookings
    if (!student_id && !tutor_id) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'student_id' or 'tutor_id' is required for access.",
      });
    }

    let query = supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .order("start_time", { ascending: true });

    if (student_id) query = query.eq("student_id", student_id);
    if (tutor_id) query = query.eq("tutor_id", tutor_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    const formattedBookings = (data || []).map(formatBookingRow);

    return res.status(200).json({
      success: true,
      bookings: formattedBookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected internal server error occurred.",
    });
  }
}

/**
 * GET /api/bookings/:id
 * Get a single booking by its ID, with formatted fields.
 */
export async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    const { student_id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Booking ID parameter is required.",
      });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (error.code === "22P02") {
        return res.status(404).json({
          success: false,
          error: "Booking not found.",
        });
      }
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Booking not found.",
      });
    }

    // Security check: if student_id provided, ensure student owns this booking
    if (student_id && data.student_id !== student_id) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to view this booking.",
      });
    }

    return res.status(200).json({
      success: true,
      booking: formatBookingRow(data),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected internal server error occurred.",
    });
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking, update status to 'cancelled', and append cancellation reason to notes.
 */
export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const { reason, student_id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Booking ID parameter is required.",
      });
    }

    // 1. Fetch current booking
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ success: false, error: fetchErr.message });
    }

    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }

    // Security check
    if (student_id && booking.student_id !== student_id) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to cancel this booking.",
      });
    }

    // 2. Prepare updated notes with cancellation reason
    const reasonText = reason && reason.trim() ? reason.trim() : "Cancelled by student";
    let updatedNotes;
    if (booking.notes) {
      const cleanNotes = booking.notes.replace(/^\[Cancelled(?::\s*[^\]]*)?\]\s*/, "");
      updatedNotes = `[Cancelled: ${reasonText}] ${cleanNotes}`.trim();
    } else {
      updatedNotes = `[Cancelled: ${reasonText}]`;
    }

    // 3. Update status in Supabase
    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, error: updateErr.message });
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking: formatBookingRow(updated),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected internal server error occurred.",
    });
  }
}

/**
 * PATCH /api/bookings/:id/reschedule
 * Reschedule a booking to a new date/time with conflict checking.
 */
export async function rescheduleBooking(req, res) {
  try {
    const { id } = req.params;
    const { student_id, notes } = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Booking ID parameter is required.",
      });
    }

    // 1. Fetch current booking
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

    // Security check
    if (student_id && currentBooking.student_id !== student_id) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to reschedule this booking.",
      });
    }

    // 2. Resolve new start and end times
    const timeResolution = resolveBookingTimes(req.body);
    if (timeResolution.error) {
      return res.status(400).json({
        success: false,
        error: timeResolution.error,
      });
    }

    const { start, end } = timeResolution;
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const tutorId = currentBooking.tutor_id;

    // 3. Conflict Check (excluding this booking)
    if (tutorId) {
      const { data: conflicts, error: conflictErr } = await supabase
        .from("bookings")
        .select("id, tutor_id, start_time, end_time, status")
        .eq("tutor_id", tutorId)
        .neq("id", id)
        .neq("status", "cancelled")
        .lt("start_time", endIso)
        .gt("end_time", startIso);

      if (conflictErr) {
        return res.status(500).json({
          success: false,
          error: `Failed to check for booking conflicts: ${conflictErr.message}`,
        });
      }

      if (conflicts && conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          error: "The requested reschedule time slot conflicts with an existing booking for this tutor.",
          conflictingBooking: conflicts[0],
        });
      }
    }

    // 4. Update in Supabase
    const updatePayload = {
      start_time: startIso,
      end_time: endIso,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", id)
      .select("*, tutors(*, profiles(*)), study_rooms(*)")
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, error: updateErr.message });
    }

    return res.status(200).json({
      success: true,
      message: "Booking rescheduled successfully.",
      booking: formatBookingRow(updated),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected internal server error occurred.",
    });
  }
}
