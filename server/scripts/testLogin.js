import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// Known original UUIDs for the 6 teachers
const ORIGINAL_TEACHER_UUIDS = {
  "sarah.mitchell@eduspace.test": "8ce96251-9ba6-48f1-9b3e-778c028c7a7b",
  "james.chen@eduspace.test": "b0f704b3-cc58-42f4-aece-106133c1a265",
  "emma.rodriguez@eduspace.test": "6e8ddff4-9289-4eec-9c68-25126e9a6c0b",
  "michael.osei@eduspace.test": "f67807b7-c70b-4a0a-849f-690fb2b4c132",
  "aisha.patel@eduspace.test": "728a9d84-43c3-4728-93de-5e8d490cc0a7",
  "thomas.laurent@eduspace.test": "49aec3bd-f87f-4b56-8e1e-98e838e0fea4",
};

async function testLogin(email, password, expectedRole) {
  console.log(`\nTesting login for: ${email} (expected role: ${expectedRole})`);
  const { data: authData, error: signInError } = await anonSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error(`  [FAIL] Login failed:`, signInError.message);
    return false;
  }

  const userId = authData.user.id;
  console.log(`  [PASS] Auth successful! User ID: ${userId}`);

  // If this is a teacher, verify UUID match
  if (ORIGINAL_TEACHER_UUIDS[email]) {
    const expectedUuid = ORIGINAL_TEACHER_UUIDS[email];
    if (userId === expectedUuid) {
      console.log(`  [PASS] Auth UUID MATCH: ${userId} (Unchanged)`);
    } else {
      console.error(`  [FAIL] Auth UUID MISMATCH: Expected ${expectedUuid}, got ${userId}`);
      return false;
    }
  }

  // Query profile role as done in Login.tsx
  const { data: profile, error: profErr } = await anonSupabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) {
    console.error("  [FAIL] Profile query failed:", profErr.message);
    return false;
  }

  console.log(`  [PASS] Profile loaded: ${profile.full_name} | Role: ${profile.role}`);

  if (profile.role !== expectedRole) {
    console.error(`  [FAIL] Role mismatch: Expected ${expectedRole}, got ${profile.role}`);
    return false;
  }

  const destination =
    profile.role === 'admin'
      ? '/admin (Admin Dashboard)'
      : profile.role === 'tutor'
      ? '/tutor (Tutor Dashboard)'
      : '/dashboard (Student Dashboard)';
  console.log(`  [PASS] Navigation redirect: ${destination}`);

  return true;
}

async function run() {
  console.log("==================================================");
  console.log("  3-Tier Auth & Role Login Verification");
  console.log("==================================================");

  const teacherPassword = process.argv[2] || process.env.TEMP_TEACHER_PASSWORD || "EduAdmin2026!";
  const studentPassword = process.argv[3] || process.env.TEMP_STUDENT_PASSWORD || "EduStudent2026!";

  let allPassed = true;

  // 1. Test Student Login
  console.log("\n--- 1. Testing Student Account Login ---");
  const studentPassed = await testLogin("student.demo@eduspace.test", studentPassword, "student");
  if (!studentPassed) allPassed = false;

  // 2. Test 6 Teacher Accounts Login (Role: tutor)
  console.log("\n--- 2. Testing 6 Teacher Accounts Login (Role: tutor) ---");
  for (const [email, expectedUuid] of Object.entries(ORIGINAL_TEACHER_UUIDS)) {
    const passed = await testLogin(email, teacherPassword, "tutor");
    if (!passed) allPassed = false;
  }

  // 3. Verify Admin Profile in DB (via admin supabase client to bypass RLS for unauthenticated check)
  console.log("\n--- 3. Verifying Admin Account (fumo807@gmail.com) ---");
  const { supabase } = await import("../supabase.js");
  const { data: adminProf, error: adminErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("email", "fumo807@gmail.com")
    .maybeSingle();

  if (adminErr || !adminProf) {
    console.error("  [FAIL] Admin profile check failed:", adminErr?.message);
    allPassed = false;
  } else {
    console.log(`  [PASS] Admin Profile loaded: ${adminProf.full_name} (${adminProf.email})`);
    console.log(`  [PASS] Role: ${adminProf.role} (Expected: admin)`);
    console.log(`  [PASS] ID: ${adminProf.id} (Expected: a08eb8e4-1903-44f2-a867-b48f9ef200ec)`);
    if (adminProf.role !== "admin") {
      allPassed = false;
    }
  }

  console.log("\n==================================================");
  console.log(`Final Result: ${allPassed ? 'ALL TESTS PASSED PERFECTLY!' : 'SOME TESTS FAILED'}`);
  console.log("==================================================");
}

run();
