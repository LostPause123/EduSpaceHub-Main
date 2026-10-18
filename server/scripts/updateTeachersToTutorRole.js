import { supabase } from "../supabase.js";

const TEACHER_EMAILS = [
  "sarah.mitchell@eduspace.test",
  "james.chen@eduspace.test",
  "emma.rodriguez@eduspace.test",
  "michael.osei@eduspace.test",
  "aisha.patel@eduspace.test",
  "thomas.laurent@eduspace.test",
];

async function updateTeachersToTutor() {
  console.log("=== Updating Teachers' Profiles Role to 'tutor' ===");

  for (const email of TEACHER_EMAILS) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ role: "tutor" })
      .eq("email", email)
      .select("id, full_name, email, role");

    if (error) {
      console.error(`Failed to update ${email}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Updated: ${data[0].full_name} (${data[0].email}) -> role: ${data[0].role}`);
    } else {
      console.warn(`No profile found for email: ${email}`);
    }
  }

  // Verification step
  console.log("\n=== Verifying All Profiles ===");
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("created_at", { ascending: true });

  if (pErr) {
    console.error("Error fetching profiles:", pErr.message);
    return;
  }

  profiles.forEach((p) => {
    console.log(`- [${p.role.toUpperCase()}] ${p.full_name} (${p.email}) - ID: ${p.id}`);
  });
}

updateTeachersToTutor();
