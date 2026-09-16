import { supabase } from "../supabase.js";

/**
 * GET /api/tutors
 * Fetches all tutors whose associated profile has role = 'tutor'.
 */
export async function getTutors(req, res) {
  try {
    const { data, error } = await supabase
      .from("tutors")
      .select(
        "id, bio, subjects, experience_years, hourly_rate, rating, is_active, profiles!inner(id, full_name, email, role, avatar_url)"
      )
      .eq("profiles.role", "tutor");

    if (error) {
      return res.status(500).json({
        success: false,
        error: `Database error while fetching tutors: ${error.message}`,
      });
    }

    const tutors = (data || []).map((t) => ({
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
      is_active: t.is_active,
      specializations: t.subjects || [],
      title: t.subjects?.[0] ? `${t.subjects[0]} Tutor` : "Academic Tutor",
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
 * GET /api/tutors/:id
 * Fetches a single tutor by tutor ID.
 */
export async function getTutorById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Tutor ID parameter is required.",
      });
    }

    const { data, error } = await supabase
      .from("tutors")
      .select(
        "id, bio, subjects, experience_years, hourly_rate, rating, is_active, profiles!inner(id, full_name, email, role, avatar_url)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (error.code === "22P02") {
        return res.status(404).json({
          success: false,
          error: "Tutor not found.",
        });
      }
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Tutor not found.",
      });
    }

    const tutor = {
      id: data.id,
      profile_id: data.profiles?.id,
      full_name: data.profiles?.full_name || "Tutor",
      name: data.profiles?.full_name || "Tutor",
      email: data.profiles?.email || "",
      role: data.profiles?.role || "tutor",
      bio: data.bio || "",
      subjects: data.subjects || [],
      subject: data.subjects?.[0] || "General",
      hourly_rate: data.hourly_rate || 40,
      pricePerHour: data.hourly_rate || 40,
      rating: data.rating || 5.0,
      experience_years: data.experience_years || 0,
      avatar_url: data.profiles?.avatar_url || "",
      avatarUrl: data.profiles?.avatar_url || "",
      is_active: data.is_active,
      specializations: data.subjects || [],
      title: data.subjects?.[0] ? `${data.subjects[0]} Tutor` : "Academic Tutor",
    };

    return res.status(200).json({
      success: true,
      tutor,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred.",
    });
  }
}
