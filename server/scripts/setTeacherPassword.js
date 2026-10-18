import { supabase } from "../supabase.js";
import crypto from "crypto";

const TEACHER_EMAILS = [
  "sarah.mitchell@eduspace.test",
  "james.chen@eduspace.test",
  "emma.rodriguez@eduspace.test",
  "michael.osei@eduspace.test",
  "aisha.patel@eduspace.test",
  "thomas.laurent@eduspace.test",
];

/**
 * Generate a random temporary password if none is provided
 */
function generateRandomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return pwd;
}

async function main() {
  console.log("==================================================");
  console.log("  EduSpace - Set Teacher Admin Temporary Passwords");
  console.log("==================================================\n");

  // Determine password from CLI arguments or environment variable
  // Usage: node server/scripts/setTeacherPassword.js [optional_password] [optional_email]
  let password = process.env.TEMP_TEACHER_PASSWORD;
  const args = process.argv.slice(2);

  let targetEmail = null;
  for (const arg of args) {
    if (arg.includes("@")) {
      targetEmail = arg.trim();
    } else if (!password) {
      password = arg.trim();
    }
  }

  if (!password) {
    password = generateRandomPassword();
    console.log(`[INFO] No password provided. Generated temporary password: ${password}`);
  } else {
    console.log(`[INFO] Using provided password.`);
  }

  if (password.length < 6) {
    console.error("[ERROR] Password must be at least 6 characters long.");
    process.exit(1);
  }

  // Fetch all Auth Users
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("[ERROR] Failed to fetch auth users from Supabase:", listErr.message);
    process.exit(1);
  }

  const emailsToProcess = targetEmail ? [targetEmail] : TEACHER_EMAILS;
  const results = [];

  for (const email of emailsToProcess) {
    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.warn(`[WARN] User not found in auth.users: ${email}`);
      continue;
    }

    const originalUuid = user.id;

    // Verify existing profile & role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", originalUuid)
      .maybeSingle();

    console.log(`Updating password for: ${email}`);
    console.log(`  Name: ${profile?.full_name || "N/A"}`);
    console.log(`  Role: ${profile?.role || "N/A"}`);
    console.log(`  Auth UUID: ${originalUuid}`);

    // Update password using Supabase Admin API
    const { data: updatedUser, error: updateErr } = await supabase.auth.admin.updateUserById(
      originalUuid,
      {
        password: password,
        email_confirm: true,
      }
    );

    if (updateErr) {
      console.error(`  [FAIL] Error updating ${email}:`, updateErr.message);
      results.push({ email, uuid: originalUuid, success: false, error: updateErr.message });
    } else {
      // Verify UUID did not change
      const newUuid = updatedUser.user.id;
      const uuidMatch = originalUuid === newUuid;
      console.log(`  [SUCCESS] Password updated.`);
      console.log(`  UUID verification: ${uuidMatch ? "MATCH (Unchanged)" : "MISMATCH (Error!)"}\n`);

      results.push({
        email,
        name: profile?.full_name,
        role: profile?.role,
        uuid: newUuid,
        uuidMatch,
        success: true,
      });
    }
  }

  console.log("==================================================");
  console.log("  Summary of Password Update");
  console.log("==================================================");
  console.table(
    results.map((r) => ({
      Email: r.email,
      Name: r.name,
      Role: r.role,
      "Auth UUID": r.uuid,
      "UUID Unchanged": r.uuidMatch ? "YES" : "NO",
      Status: r.success ? "SUCCESS" : "FAILED",
    }))
  );

  console.log(`\nAll updated accounts can now sign in using the configured password.`);
  console.log(`Password length: ${password.length} characters.`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
