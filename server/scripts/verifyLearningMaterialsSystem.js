import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import tutorSelfRoutes from "../routes/tutorSelfRoutes.js";
import adminRoutes from "../routes/adminRoutes.js";
import materialRoutes from "../routes/materialRoutes.js";
import { supabase } from "../supabase.js";

dotenv.config();

const TEST_PORT = 3097;

async function runVerification() {
  console.log("======================================================================");
  console.log("   AUTOMATED VERIFICATION: LEARNING MATERIALS SYSTEM & ACCESS CONTROL ");
  console.log("======================================================================\n");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/tutor", tutorSelfRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/materials", materialRoutes);

  const server = app.listen(TEST_PORT);
  console.log(`[INFO] Test server listening on http://localhost:${TEST_PORT}\n`);

  const authClient = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } }
  );

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

  let createdMaterialId = null;

  try {
    // -------------------------------------------------------------
    // Step 1: Authenticate all roles
    // -------------------------------------------------------------
    console.log("--------------------------------------------------");
    console.log("Step 1: Authenticating All Roles...");
    console.log("--------------------------------------------------");

    const tutorPassword = process.env.TEMP_TEACHER_PASSWORD || "EduAdmin2026!";
    const studentPassword = process.env.TEMP_STUDENT_PASSWORD || "EduStudent2026!";

    // 1a. Tutor 1: Dr. Aisha Patel
    const { data: t1Data, error: t1Err } = await authClient.auth.signInWithPassword({
      email: "aisha.patel@eduspace.test",
      password: tutorPassword,
    });
    assert(!t1Err && t1Data?.session?.access_token, "Tutor 1 (Aisha Patel) authenticated");
    const tutor1Token = t1Data?.session?.access_token;

    // 1b. Tutor 2: James Chen
    const { data: t2Data, error: t2Err } = await authClient.auth.signInWithPassword({
      email: "james.chen@eduspace.test",
      password: tutorPassword,
    });
    assert(!t2Err && t2Data?.session?.access_token, "Tutor 2 (James Chen) authenticated");
    const tutor2Token = t2Data?.session?.access_token;

    // 1c. Student: Demo Student
    const { data: sData, error: sErr } = await authClient.auth.signInWithPassword({
      email: "student.demo@eduspace.test",
      password: studentPassword,
    });
    assert(!sErr && sData?.session?.access_token, "Student (Demo Student) authenticated");
    const studentToken = sData?.session?.access_token;

    // 1d. Admin: fumo807@gmail.com (via magiclink verification)
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: "fumo807@gmail.com",
    });
    assert(!linkErr && linkData?.properties?.hashed_token, "Admin magic link generated");

    const { data: adminSession, error: adminErr } = await authClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "email",
    });
    assert(!adminErr && adminSession?.session?.access_token, "Admin (fumo807@gmail.com) session verified");
    const adminToken = adminSession?.session?.access_token;

    // -------------------------------------------------------------
    // Step 2: Test File Validation (MIME & Extension)
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 2: Testing File Validation (Security & Constraints)...");
    console.log("--------------------------------------------------");

    // Invalid extension test (.exe)
    const invalidBoundary = "----WebKitFormBoundaryInvalid123";
    const invalidBody = [
      `--${invalidBoundary}`,
      'Content-Disposition: form-data; name="title"',
      '',
      'Malicious Executable',
      `--${invalidBoundary}`,
      'Content-Disposition: form-data; name="subject"',
      '',
      'Biology',
      `--${invalidBoundary}`,
      'Content-Disposition: form-data; name="file"; filename="payload.exe"',
      'Content-Type: application/x-msdownload',
      '',
      'MZThisIsNotAllowed',
      `--${invalidBoundary}--`,
    ].join("\r\n");

    const invalidRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tutor1Token}`,
        "Content-Type": `multipart/form-data; boundary=${invalidBoundary}`,
      },
      body: invalidBody,
    });
    assert(invalidRes.status === 400 || invalidRes.status === 500, `Blocked disallowed .exe file extension (HTTP ${invalidRes.status})`);

    // -------------------------------------------------------------
    // Step 3: Tutor 1 Uploads Valid Document
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 3: Tutor Upload Valid Document (.pdf)...");
    console.log("--------------------------------------------------");

    const validBoundary = "----WebKitFormBoundaryValid123";
    const validPdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF";

    const uploadBody = [
      `--${validBoundary}`,
      'Content-Disposition: form-data; name="title"',
      '',
      'Biology 101: Cell Organelles and Functions',
      `--${validBoundary}`,
      'Content-Disposition: form-data; name="description"',
      '',
      'Comprehensive study notes on eukaryotic and prokaryotic cell structures.',
      `--${validBoundary}`,
      'Content-Disposition: form-data; name="subject"',
      '',
      'Biology',
      `--${validBoundary}`,
      'Content-Disposition: form-data; name="file"; filename="Cell_Organelles_Study_Guide.pdf"',
      'Content-Type: application/pdf',
      '',
      validPdfContent,
      `--${validBoundary}--`,
    ].join("\r\n");

    const uploadRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tutor1Token}`,
        "Content-Type": `multipart/form-data; boundary=${validBoundary}`,
      },
      body: uploadBody,
    });

    assert(uploadRes.status === 201, `Tutor upload returned HTTP 201 Created (got ${uploadRes.status})`);
    const uploadData = await uploadRes.json();
    assert(uploadData.success === true, "Upload response success === true");
    assert(uploadData.material?.status === "pending_review", `Initial material status is 'pending_review' (got '${uploadData.material?.status}')`);
    assert(uploadData.material?.subject === "Biology", "Material subject is 'Biology'");
    assert(uploadData.material?.filePath.includes("materials/"), `Private storage path generated: ${uploadData.material?.filePath}`);

    createdMaterialId = uploadData.material?.id;

    // -------------------------------------------------------------
    // Step 4: Tutor 1 Views Own Materials
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 4: Tutor 1 Queries Own Materials...");
    console.log("--------------------------------------------------");

    const tutor1ListRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials`, {
      headers: { Authorization: `Bearer ${tutor1Token}` },
    });
    const tutor1ListData = await tutor1ListRes.json();
    assert(tutor1ListRes.status === 200, "Tutor 1 list returned HTTP 200");
    const foundMaterial = tutor1ListData.materials?.find((m) => m.id === createdMaterialId);
    assert(Boolean(foundMaterial), `Newly uploaded material appears in Tutor 1's list`);

    // -------------------------------------------------------------
    // Step 5: Cross-Tutor Security & Isolation
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 5: Testing Cross-Tutor Data Isolation...");
    console.log("--------------------------------------------------");

    // Tutor 2 attempts to fetch Tutor 1's material
    const t2GetRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials/${createdMaterialId}`, {
      headers: { Authorization: `Bearer ${tutor2Token}` },
    });
    assert(t2GetRes.status === 403, `Tutor 2 blocked from viewing Tutor 1's material (got ${t2GetRes.status})`);

    // Tutor 2 attempts to edit Tutor 1's material
    const t2PatchRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials/${createdMaterialId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tutor2Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Hacked Title" }),
    });
    assert(t2PatchRes.status === 400 || t2PatchRes.status === 403, `Tutor 2 blocked from editing Tutor 1's material (got ${t2PatchRes.status})`);

    // Tutor 2 attempts to delete Tutor 1's material
    const t2DelRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials/${createdMaterialId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tutor2Token}` },
    });
    assert(t2DelRes.status === 403, `Tutor 2 blocked from deleting Tutor 1's material (got ${t2DelRes.status})`);

    // -------------------------------------------------------------
    // Step 6: Tutor Cannot Self-Approve or Self-Publish
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 6: Testing Tutor Cannot Self-Approve or Self-Publish...");
    console.log("--------------------------------------------------");

    await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials/${createdMaterialId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tutor1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "approved", is_public: true }),
    });

    const checkRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials/${createdMaterialId}`, {
      headers: { Authorization: `Bearer ${tutor1Token}` },
    });
    const checkData = await checkRes.json();
    assert(checkData.material?.status === "pending_review", "Material status unchanged (remains 'pending_review')");
    assert(checkData.material?.isPublic === false, "isPublic remains false");

    // -------------------------------------------------------------
    // Step 7: Admin Review: Request Revision
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 7: Admin Reviews & Requests Revision...");
    console.log("--------------------------------------------------");

    const revFeedback = "Please add diagram labels to the mitochondrion section.";
    const revRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/materials/${createdMaterialId}/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "request_revision",
        feedback: revFeedback,
      }),
    });
    assert(revRes.status === 200, "Admin revision request returned HTTP 200");
    const revData = await revRes.json();
    assert(revData.material?.status === "revision_requested", "Status updated to 'revision_requested'");
    assert(revData.material?.reviewFeedback === revFeedback, "Feedback properly recorded");

    // -------------------------------------------------------------
    // Step 8: Tutor Resubmits Revised Material
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 8: Tutor Resubmits Revised Material...");
    console.log("--------------------------------------------------");

    const resubmitRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials/${createdMaterialId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tutor1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resubmit: true,
        resubmissionNote: "Updated mitochondrion diagram with high-res labels.",
      }),
    });
    assert(resubmitRes.status === 200, "Tutor resubmission returned HTTP 200");
    const resubmitData = await resubmitRes.json();
    assert(resubmitData.material?.status === "pending_review", "Resubmission transitioned status back to 'pending_review'");

    // -------------------------------------------------------------
    // Step 9: Admin Approves Material (Approval != Publishing)
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 9: Admin Approves Material (Verification: Not Yet Published)...");
    console.log("--------------------------------------------------");

    const approveRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/materials/${createdMaterialId}/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "approve" }),
    });
    assert(approveRes.status === 200, "Admin approval returned HTTP 200");
    const approveData = await approveRes.json();
    assert(approveData.material?.status === "approved", "Status transitioned to 'approved'");
    assert(approveData.material?.isPublic === false, "Approved material is NOT yet public (isPublic === false)");

    // Student checks materials: MUST NOT see the approved-but-unpublished material
    const studentCheckRes = await fetch(`http://localhost:${TEST_PORT}/api/materials/student`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentCheckData = await studentCheckRes.json();
    const isVisibleToStudent = (studentCheckData.materials || []).some((m) => m.id === createdMaterialId);
    assert(isVisibleToStudent === false, "CRITICAL: Approved-but-unpublished material is INVISIBLE to student");

    // -------------------------------------------------------------
    // Step 10: Admin Publishes Material
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 10: Admin Publishes Material...");
    console.log("--------------------------------------------------");

    const publishRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/materials/${createdMaterialId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(publishRes.status === 200, "Admin publish returned HTTP 200");
    const publishData = await publishRes.json();
    assert(publishData.material?.status === "published", "Material status is now 'published'");
    assert(publishData.material?.isPublic === true, "Material isPublic === true");
    assert(Boolean(publishData.material?.publishedAt), `publishedAt timestamp recorded: ${publishData.material?.publishedAt}`);

    // -------------------------------------------------------------
    // Step 11: Student Access & Enrollment Authorization
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 11: Student Enrollment & Access Enforcement...");
    console.log("--------------------------------------------------");

    // Check student enrolled subjects
    const studentEnrolledSubjects = studentCheckData.enrolledSubjects || [];
    console.log(`  Student enrolled subjects from bookings: [${studentEnrolledSubjects.join(", ")}]`);

    // Student tries to download Biology material:
    // If student is not enrolled in Biology, they should be blocked!
    const isEnrolledInBio = studentEnrolledSubjects.some((s) => s.toLowerCase() === "biology");

    const studentDownloadRes = await fetch(`http://localhost:${TEST_PORT}/api/materials/${createdMaterialId}/download`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    if (!isEnrolledInBio) {
      assert(studentDownloadRes.status === 403, `Student blocked from downloading non-enrolled subject material (got HTTP ${studentDownloadRes.status})`);
    } else {
      assert(studentDownloadRes.status === 200, "Student granted download for enrolled subject material");
    }

    // -------------------------------------------------------------
    // Step 12: Secure Signed Download URL & Actual Fetch
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 12: Secure Signed Download URL & Verification...");
    console.log("--------------------------------------------------");

    // Admin downloads material
    const adminDlRes = await fetch(`http://localhost:${TEST_PORT}/api/materials/${createdMaterialId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDlRes.status === 200, "Admin download URL request returned HTTP 200");
    const adminDlData = await adminDlRes.json();
    assert(Boolean(adminDlData.downloadUrl), "Signed URL received");

    // Fetch the signed URL from Supabase Storage
    const storageFileRes = await fetch(adminDlData.downloadUrl);
    assert(storageFileRes.status === 200, `Supabase private storage signed URL fetched successfully (HTTP 200, Content-Type: ${storageFileRes.headers.get("content-type")})`);

    // Unauthenticated download request
    const unauthRes = await fetch(`http://localhost:${TEST_PORT}/api/materials/${createdMaterialId}/download`);
    assert(unauthRes.status === 401, `Unauthenticated download request blocked with HTTP 401 (got ${unauthRes.status})`);

    // -------------------------------------------------------------
    // Step 13: Admin Unpublishes and Archives Material
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 13: Admin Unpublish and Archive...");
    console.log("--------------------------------------------------");

    const unpublishRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/materials/${createdMaterialId}/unpublish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(unpublishRes.status === 200, "Unpublish returned HTTP 200");
    const unpublishData = await unpublishRes.json();
    assert(unpublishData.material?.status === "approved", "Status reverted to 'approved'");

    const archiveRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/materials/${createdMaterialId}/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(archiveRes.status === 200, "Archive returned HTTP 200");
    const archiveData = await archiveRes.json();
    assert(archiveData.material?.status === "archived", "Status moved to 'archived'");

    // -------------------------------------------------------------
    // Step 14: Cleanup Test Material
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 14: Cleanup Test Material...");
    console.log("--------------------------------------------------");

    if (createdMaterialId) {
      await fetch(`http://localhost:${TEST_PORT}/api/tutor/materials/${createdMaterialId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tutor1Token}` },
      });
      console.log(`  [CLEANUP] Deleted test material ${createdMaterialId}`);
    }

    // -------------------------------------------------------------
    // Step 15: Existing System Regressions Check
    // -------------------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("Step 15: Regression Check on Existing Functionality...");
    console.log("--------------------------------------------------");

    // Check tutor stats
    const tutorStatsRes = await fetch(`http://localhost:${TEST_PORT}/api/tutor/stats`, {
      headers: { Authorization: `Bearer ${tutor1Token}` },
    });
    assert(tutorStatsRes.status === 200, "Tutor stats API operational (HTTP 200)");

    // Check admin stats
    const adminStatsRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminStatsRes.status === 200, "Admin stats API operational (HTTP 200)");

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

runVerification();
