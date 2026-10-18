import { supabase } from "../supabase.js";

async function ensureStudentUser() {
  const email = "student.demo@eduspace.test";
  const password = process.argv[2] || process.env.TEMP_STUDENT_PASSWORD || "EduStudent2026!";

  console.log(`Checking for student user: ${email}...`);

  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Error listing users:", listErr.message);
    return;
  }

  let user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log(`Creating student user: ${email}...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Demo Student",
        university: "EduSpace University",
        program: "Computer Science",
      },
    });

    if (createErr) {
      console.error("Error creating student:", createErr.message);
      return;
    }

    user = created.user;
    console.log(`Student user created with ID: ${user.id}`);
  } else {
    console.log(`Student user already exists with ID: ${user.id}`);
    if (password) {
      await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      console.log("Updated password for student user.");
    }
  }

  // Ensure profile exists and has role 'student'
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: "Demo Student",
      email: email,
      role: "student",
    }, { onConflict: "id" })
    .select()
    .single();

  if (profErr) {
    console.error("Error creating student profile:", profErr.message);
  } else {
    console.log(`Student profile verified: ${profile.full_name} | Role: ${profile.role}`);
  }
}

ensureStudentUser();
