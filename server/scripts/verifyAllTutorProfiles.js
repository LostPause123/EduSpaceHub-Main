import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import tutorSelfRoutes from "../routes/tutorSelfRoutes.js";
import { supabase } from "../supabase.js";

dotenv.config();

const EXPECTED_TUTORS = [
  {
    email: "sarah.mitchell@eduspace.test",
    name: "Dr. Sarah Mitchell",
    expectedUserId: "8ce96251-9ba6-48f1-9b3e-778c028c7a7b",
    expectedTutorId: "20000000-0000-4000-8000-000000000001",
  },
  {
    email: "james.chen@eduspace.test",
    name: "James Chen",
    expectedUserId: "b0f704b3-cc58-42f4-aece-106133c1a265",
    expectedTutorId: "20000000-0000-4000-8000-000000000002",
  },
  {
    email: "emma.rodriguez@eduspace.test",
    name: "Emma Rodriguez",
    expectedUserId: "6e8ddff4-9289-4eec-9c68-25126e9a6c0b",
    expectedTutorId: "20000000-0000-4000-8000-000000000003",
  },
  {
    email: "michael.osei@eduspace.test",
    name: "Prof. Michael Osei",
    expectedUserId: "f67807b7-c70b-4a0a-849f-690fb2b4c132",
    expectedTutorId: "20000000-0000-4000-8000-000000000004",
  },
  {
    email: "aisha.patel@eduspace.test",
    name: "Dr. Aisha Patel",
    expectedUserId: "728a9d84-43c3-4728-93de-5e8d490cc0a7",
    expectedTutorId: "20000000-0000-4000-8000-000000000005",
  },
  {
    email: "thomas.laurent@eduspace.test",
    name: "Thomas Laurent",
    expectedUserId: "49aec3bd-f87f-4b56-8e1e-98e838e0fea4",
    expectedTutorId: "20000000-0000-4000-8000-000000000006",
  },
];

async function main() {
  console.log("======================================================================");
  console.log("   AUTOMATED VERIFICATION: ALL 6 TUTOR PROFILES & DATA ISOLATION     ");
  console.log("======================================================================\n");

  const TEST_PORT = 3099;
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/tutor", tutorSelfRoutes);

  const server = app.listen(TEST_PORT);
  console.log(`[INFO] Test server listening on http://localhost:${TEST_PORT}\n`);

  const authClient = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } }
  );

  const password = process.env.TEMP_TEACHER_PASSWORD || "EduAdmin2026!";
  const sessions = {};
  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${message}`);
      return true;
    } else {
      console.error(`  [FAIL] ${message}`);
      return false;
    }
  }

  try {
    // -------------------------------------------------------------
    // Step 1: Sign in as each of the 6 tutors & obtain access tokens
    // -------------------------------------------------------------
    console.log("--------------------------------------------------");
    console.log("Step 1: Authenticating all 6 Tutor accounts...");
    console.log("--------------------------------------------------");

    for (const tutor of EXPECTED_TUTORS) {
      const { data, error } = await authClient.auth.signInWithPassword({
        email: tutor.email,
        password,
      });

      if (error || !data.session) {
        assert(false, `Authentication failed for ${tutor.email}: ${error?.message}`);
        continue;
      }

      sessions[tutor.email] = {
        token: data.session.access_token,
        userId: data.user.id,
      };

      assert(
        data.user.id === tutor.expectedUserId,
        `Auth UUID match for ${tutor.name} (${tutor.email}): ${data.user.id}`
      );
    }

    // -------------------------------------------------------------
    // Step 2: Test GET /api/tutor/profile for each tutor
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 2: Testing GET /api/tutor/profile for each tutor...");
    console.log("--------------------------------------------------");

    const initialProfiles = {};

    for (const tutor of EXPECTED_TUTORS) {
      console.log(`\nTesting Profile Endpoint for ${tutor.name}:`);
      const token = sessions[tutor.email]?.token;
      if (!token) {
        assert(false, `No token available for ${tutor.email}`);
        continue;
      }

      const res = await fetch(`http://localhost:${TEST_PORT}/api/tutor/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      assert(res.status === 200, `HTTP Status is 200 OK (got ${res.status})`);
      const body = await res.json();
      assert(body.success === true, `API response success === true`);

      const prof = body.profile;
      assert(prof !== undefined && prof !== null, `Profile object returned`);
      assert(prof?.name === tutor.name, `Profile name strictly matches: "${prof?.name}" === "${tutor.name}"`);
      assert(prof?.email === tutor.email, `Profile email strictly matches: "${prof?.email}" === "${tutor.email}"`);
      assert(prof?.profileId === tutor.expectedUserId, `Profile UUID strictly matches: ${prof?.profileId}`);
      assert(prof?.id === tutor.expectedTutorId, `Tutor row ID strictly matches: ${prof?.id}`);
      assert(Array.isArray(prof?.subjects) && prof.subjects.length > 0, `Tutor has subjects: ${prof?.subjects?.join(", ")}`);
      assert(typeof prof?.hourly_rate === "number" && prof.hourly_rate > 0, `Hourly rate is valid: $${prof?.hourly_rate}/hr`);

      initialProfiles[tutor.email] = prof;
    }

    // -------------------------------------------------------------
    // Step 3: Test Data Isolation & Edit Propagation
    // (Edit Aisha Patel's profile, confirm ONLY Aisha changes)
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 3: Testing Isolation: PATCH /api/tutor/profile for Dr. Aisha Patel");
    console.log("--------------------------------------------------");

    const aishaEmail = "aisha.patel@eduspace.test";
    const aishaOriginal = initialProfiles[aishaEmail];
    const aishaToken = sessions[aishaEmail].token;

    const testBio = `Test updated bio for verification at ${new Date().toISOString()}`;
    const testRate = aishaOriginal.hourly_rate + 2;

    console.log(`Updating Aisha Patel's bio and hourly rate ($${aishaOriginal.hourly_rate} -> $${testRate})...`);

    const patchRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aishaToken}`,
      },
      body: JSON.stringify({
        bio: testBio,
        hourly_rate: testRate,
      }),
    });

    assert(patchRes.status === 200, `PATCH returned HTTP 200 OK`);
    const patchBody = await patchRes.json();
    assert(patchBody.success === true, `PATCH response success === true`);

    // Re-fetch Aisha's profile and check
    const aishaRefetch = await fetch(`http://localhost:${TEST_PORT}/api/tutor/profile`, {
      headers: { Authorization: `Bearer ${aishaToken}` },
    });
    const aishaRefetchBody = await aishaRefetch.json();
    assert(
      aishaRefetchBody.profile.bio === testBio,
      `Aisha's bio was updated successfully to: "${testBio.slice(0, 35)}..."`
    );
    assert(
      aishaRefetchBody.profile.hourly_rate === testRate,
      `Aisha's hourly rate was updated successfully to: $${testRate}/hr`
    );

    // Verify all other 5 tutors were NOT changed
    console.log("\nVerifying the other 5 tutors were NOT modified:");
    for (const tutor of EXPECTED_TUTORS) {
      if (tutor.email === aishaEmail) continue;

      const token = sessions[tutor.email]?.token;
      const res = await fetch(`http://localhost:${TEST_PORT}/api/tutor/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      const prof = body.profile;
      const original = initialProfiles[tutor.email];

      assert(
        prof.name === original.name,
        `${tutor.name} name unchanged: "${prof.name}"`
      );
      assert(
        prof.bio === original.bio,
        `${tutor.name} bio unchanged`
      );
      assert(
        prof.hourly_rate === original.hourly_rate,
        `${tutor.name} hourly rate unchanged: $${prof.hourly_rate}/hr`
      );
    }

    // Revert Aisha's profile back to original
    console.log("\nReverting Aisha Patel's profile back to original values...");
    await fetch(`http://localhost:${TEST_PORT}/api/tutor/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aishaToken}`,
      },
      body: JSON.stringify({
        bio: aishaOriginal.bio,
        hourly_rate: aishaOriginal.hourly_rate,
      }),
    });

    const aishaRestored = await fetch(`http://localhost:${TEST_PORT}/api/tutor/profile`, {
      headers: { Authorization: `Bearer ${aishaToken}` },
    });
    const aishaRestoredBody = await aishaRestored.json();
    assert(
      aishaRestoredBody.profile.hourly_rate === aishaOriginal.hourly_rate,
      `Aisha's profile successfully restored to original values ($${aishaOriginal.hourly_rate}/hr)`
    );

    // -------------------------------------------------------------
    // Step 4: Test GET /api/tutor/stats for each tutor
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 4: Testing GET /api/tutor/stats per tutor...");
    console.log("--------------------------------------------------");

    for (const tutor of EXPECTED_TUTORS) {
      const token = sessions[tutor.email]?.token;
      const res = await fetch(`http://localhost:${TEST_PORT}/api/tutor/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      assert(
        res.status === 200 && body.success === true && body.tutor?.name === tutor.name,
        `Stats endpoint returns correct tutor identity for ${tutor.name}`
      );
    }

    console.log("\n======================================================================");
    console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("======================================================================");
  } catch (err) {
    console.error("Test execution failed with error:", err);
  } finally {
    server.close(() => {
      console.log("[INFO] Test server closed.");
      process.exit(passedTests === totalTests ? 0 : 1);
    });
  }
}

main();
