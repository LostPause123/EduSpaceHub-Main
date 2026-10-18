import { supabase } from "../supabase.js";

async function check() {
  console.log("=== Checking Supabase Auth & Profiles ===");
  try {
    // 1. Auth Users
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      console.error("Auth listUsers error:", authErr.message);
      return;
    }

    console.log(`\nFound ${users.length} Auth Users:`);
    users.forEach((u) => {
      console.log(`- ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
    });

    // 2. Profiles
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, role");
    if (profErr) {
      console.error("Profiles error:", profErr.message);
      return;
    }

    console.log(`\nFound ${profiles.length} Profiles:`);
    profiles.forEach((p) => {
      console.log(`- ID: ${p.id} | Name: ${p.full_name} | Email: ${p.email} | Role: ${p.role}`);
    });

    // 3. Tutors
    const { data: tutors, error: tutErr } = await supabase
      .from("tutors")
      .select("id, profile_id");
    if (tutErr) {
      console.error("Tutors error:", tutErr.message);
      return;
    }

    console.log(`\nFound ${tutors.length} Tutors:`);
    tutors.forEach((t) => {
      console.log(`- Tutor ID: ${t.id} | Profile ID: ${t.profile_id}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
