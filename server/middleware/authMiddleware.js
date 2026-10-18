import { supabase } from "../supabase.js";

/**
 * Middleware: requireAdminAuth
 *
 * Verifies that the incoming request has:
 * 1. A valid Authorization Bearer token from Supabase Auth
 * 2. An authenticated user
 * 3. The user has role === 'admin' in the 'profiles' database table
 *
 * Responses:
 * - 401 Unauthorized: If token is missing, invalid, or expired
 * - 403 Forbidden: If user is authenticated as a Student or non-admin
 */
export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please provide a valid Bearer token in the Authorization header.",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication token missing.",
      });
    }

    // 1. Validate JWT session token with Supabase Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session. Please log in again.",
      });
    }

    // 2. Verify admin role in the profiles table
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Profile not found in database.",
      });
    }

    if (profile.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden. Admin access required. Student accounts cannot perform this action.",
      });
    }

    // Attach verified admin user to request object
    req.adminUser = {
      id: user.id,
      email: user.email,
      role: profile.role,
      name: profile.full_name,
    };

    return next();
  } catch (err) {
    console.error("requireAdminAuth middleware error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Authentication verification encountered an internal error.",
    });
  }
}

/**
 * Middleware: requireTutorAuth
 *
 * Verifies that the incoming request has:
 * 1. A valid Authorization Bearer token from Supabase Auth
 * 2. An authenticated user
 * 3. The user has role === 'tutor' in the 'profiles' database table
 * 4. The user has an associated record in the 'tutors' database table
 *
 * Responses:
 * - 401 Unauthorized: If token is missing, invalid, or expired
 * - 403 Forbidden: If user is authenticated as Student or Admin
 */
export async function requireTutorAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please provide a valid Bearer token in the Authorization header.",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication token missing.",
      });
    }

    // 1. Validate JWT session token with Supabase Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session. Please log in again.",
      });
    }

    // 2. Verify tutor role in the profiles table
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, role, full_name, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Profile not found in database.",
      });
    }

    if (profile.role !== "tutor") {
      return res.status(403).json({
        success: false,
        error: "Forbidden. Tutor access required.",
      });
    }

    // 3. Find the tutor row linked to this profile
    const { data: tutorRow, error: tutorErr } = await supabase
      .from("tutors")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (tutorErr || !tutorRow) {
      return res.status(403).json({
        success: false,
        error: "Tutor record not found for this profile.",
      });
    }

    // Attach verified tutor user to request object
    req.tutorUser = {
      userId: user.id,
      profileId: profile.id,
      tutorId: tutorRow.id,
      email: user.email,
      role: profile.role,
      name: profile.full_name,
      avatarUrl: profile.avatar_url,
      tutorRecord: tutorRow,
    };

    return next();
  } catch (err) {
    console.error("requireTutorAuth middleware error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Authentication verification encountered an internal error.",
    });
  }
}

/**
 * Middleware: requireStudentAuth
 *
 * Verifies that the incoming request has:
 * 1. A valid Authorization Bearer token from Supabase Auth
 * 2. An authenticated user
 * 3. The user has role === 'student' in the 'profiles' database table
 */
export async function requireStudentAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please provide a valid Bearer token.",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication token missing.",
      });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session. Please log in again.",
      });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Profile not found in database.",
      });
    }

    if (profile.role !== "student") {
      return res.status(403).json({
        success: false,
        error: "Forbidden. Student access required.",
      });
    }

    req.studentUser = {
      id: user.id,
      email: user.email,
      role: profile.role,
      name: profile.full_name,
    };

    return next();
  } catch (err) {
    console.error("requireStudentAuth middleware error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Authentication verification encountered an internal error.",
    });
  }
}

/**
 * Middleware: requireAnyAuth
 *
 * Verifies that the incoming request has a valid Supabase Auth session token,
 * resolves the user's role from 'profiles', and attaches unified req.user object.
 */
export async function requireAnyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please provide a valid Bearer token.",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication token missing.",
      });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session. Please log in again.",
      });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Profile not found in database.",
      });
    }

    let tutorId = null;
    if (profile.role === "tutor") {
      const { data: tutorRow } = await supabase
        .from("tutors")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();
      tutorId = tutorRow?.id || null;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      name: profile.full_name,
      tutorId,
    };

    return next();
  } catch (err) {
    console.error("requireAnyAuth middleware error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Authentication verification encountered an internal error.",
    });
  }
}
