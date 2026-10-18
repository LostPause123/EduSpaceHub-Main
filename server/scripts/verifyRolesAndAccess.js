import { createClient } from "@supabase/supabase-js";
import { supabase } from "../supabase.js";
import { requireTutorAuth, requireAdminAuth } from "../middleware/authMiddleware.js";

async function verifyAllRoles() {
  console.log("==================================================");
  console.log("   EDUSPACE 3-TIER ROLE & ACCESS VERIFICATION     ");
  console.log("==================================================");

  // 1. Verify Profiles & Role Separation in DB
  console.log("\n[1] Verifying Database Profiles & Roles...");
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("role", { ascending: true });

  if (pErr) {
    console.error("Failed to query profiles:", pErr);
    return;
  }

  const roleCounts = { admin: 0, tutor: 0, student: 0 };
  profiles.forEach((p) => {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    console.log(`  - [${p.role.toUpperCase()}] ${p.full_name} (${p.email}) - ID: ${p.id}`);
  });

  console.log("\nRole Counts Summary:", roleCounts);

  // 2. Verify Tutor Records Linkage
  console.log("\n[2] Verifying Tutors Table Linkages...");
  const { data: tutors, error: tErr } = await supabase
    .from("tutors")
    .select("id, profile_id, hourly_rate, rating, subjects, profiles(full_name, email, role)");

  if (tErr) {
    console.error("Failed to query tutors:", tErr);
    return;
  }

  console.log(`Found ${tutors.length} tutors linked to profiles:`);
  tutors.forEach((t) => {
    const prof = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
    console.log(`  - Tutor ID: ${t.id} | Profile ID: ${t.profile_id} | Name: ${prof?.full_name} | Role: ${prof?.role} | Rate: $${t.hourly_rate}/hr`);
  });

  // 3. Test Client Sign In for Roles using separate auth client instance
  console.log("\n[3] Testing Client Sign In for Roles...");
  const authClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } }
  );

  // 3a. Tutor Sign In
  const { data: tutorAuth, error: tutorErr } = await authClient.auth.signInWithPassword({
    email: "sarah.mitchell@eduspace.test",
    password: "EduAdmin2026!",
  });

  if (tutorErr) {
    console.error("Tutor Sign In Failed:", tutorErr.message);
  } else {
    console.log("✓ Tutor (Dr. Sarah Mitchell) Sign In Succeeded!");
    console.log("  Tutor User ID:", tutorAuth.user.id);
  }

  // 3b. Student Sign In
  const { data: studentAuth, error: studentErr } = await authClient.auth.signInWithPassword({
    email: "student.demo@eduspace.test",
    password: "EduStudent2026!",
  });

  if (studentErr) {
    console.error("Student Sign In Failed:", studentErr.message);
  } else {
    console.log("✓ Student (Demo Student) Sign In Succeeded!");
    console.log("  Student User ID:", studentAuth.user.id);
  }

  // 4. Test Middleware Authorization Logic
  console.log("\n[4] Testing Middleware Access Control...");

  function createMockRes() {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  }

  // Test 4a: Student attempting Tutor-only endpoint
  if (studentAuth?.session?.access_token) {
    const reqStudent = {
      headers: {
        authorization: `Bearer ${studentAuth.session.access_token}`,
      },
    };
    const resStudent = createMockRes();
    let nextCalled = false;
    await requireTutorAuth(reqStudent, resStudent, () => { nextCalled = true; });

    console.log("  - Student requesting Tutor Auth Guard:");
    console.log(`    Status Code: ${resStudent.statusCode} (Expected: 403 Forbidden)`);
    console.log(`    Error Message: ${resStudent.jsonData?.error}`);
    console.log(`    Passed Guard: ${nextCalled} (Expected: false)`);
  }

  // Test 4b: Student attempting Admin-only endpoint
  if (studentAuth?.session?.access_token) {
    const reqStudentAdmin = {
      headers: {
        authorization: `Bearer ${studentAuth.session.access_token}`,
      },
    };
    const resStudentAdmin = createMockRes();
    let nextCalledAdmin = false;
    await requireAdminAuth(reqStudentAdmin, resStudentAdmin, () => { nextCalledAdmin = true; });

    console.log("\n  - Student requesting Admin Auth Guard:");
    console.log(`    Status Code: ${resStudentAdmin.statusCode} (Expected: 403 Forbidden)`);
    console.log(`    Error Message: ${resStudentAdmin.jsonData?.error}`);
    console.log(`    Passed Guard: ${nextCalledAdmin} (Expected: false)`);
  }

  // Test 4c: Tutor requesting Tutor-only endpoint
  if (tutorAuth?.session?.access_token) {
    const reqTutor = {
      headers: {
        authorization: `Bearer ${tutorAuth.session.access_token}`,
      },
    };
    const resTutor = createMockRes();
    let nextCalledTutor = false;
    await requireTutorAuth(reqTutor, resTutor, () => { nextCalledTutor = true; });

    console.log("\n  - Tutor requesting Tutor Auth Guard:");
    console.log(`    Status Code: ${resTutor.statusCode} (Expected: 200)`);
    console.log(`    Passed Guard: ${nextCalledTutor} (Expected: true)`);
    console.log(`    Attached Tutor User: ${reqTutor.tutorUser?.name} (${reqTutor.tutorUser?.role})`);
    console.log(`    Attached Tutor ID: ${reqTutor.tutorUser?.tutorId}`);
  }

  // Test 4d: Tutor requesting Admin-only endpoint (Tutor blocked from Admin)
  if (tutorAuth?.session?.access_token) {
    const reqTutorAdmin = {
      headers: {
        authorization: `Bearer ${tutorAuth.session.access_token}`,
      },
    };
    const resTutorAdmin = createMockRes();
    let nextCalledTutorAdmin = false;
    await requireAdminAuth(reqTutorAdmin, resTutorAdmin, () => { nextCalledTutorAdmin = true; });

    console.log("\n  - Tutor requesting Admin Auth Guard (Testing Tutor blocked from Admin):");
    console.log(`    Status Code: ${resTutorAdmin.statusCode} (Expected: 403 Forbidden)`);
    console.log(`    Error Message: ${resTutorAdmin.jsonData?.error}`);
    console.log(`    Passed Guard: ${nextCalledTutorAdmin} (Expected: false)`);
  }

  console.log("\n==================================================");
  console.log("   ALL ACCESS & ROLE SEPARATION CHECKS COMPLETE!  ");
  console.log("==================================================");
}

verifyAllRoles();
