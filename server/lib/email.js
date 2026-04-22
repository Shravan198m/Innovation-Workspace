const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const templatePath = path.join(__dirname, "..", "templates", "projectAssigned.html");

function getResendClient() {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  return new Resend(resendApiKey);
}

function renderProjectAssignmentTemplate({ name, projectName, role, link }) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Project assignment template not found at ${templatePath}`);
  }

  const template = fs.readFileSync(templatePath, "utf8");

  return template
    .replace(/{{name}}/g, String(name || "there"))
    .replace(/{{projectName}}/g, String(projectName || "your project"))
    .replace(/{{role}}/g, String(role || "member"))
    .replace(/{{link}}/g, String(link || "#"));
}

async function sendProjectAssignmentEmail(to, name, projectName, role, link) {
  if (!process.env.RESEND_FROM) {
    throw new Error("RESEND_FROM is missing.");
  }

  const resend = getResendClient();

  console.log("[email] sending project assignment email to:", to, "role:", role, "project:", projectName);
  const html = renderProjectAssignmentTemplate({ name, projectName, role, link });

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject: "You’ve been added to a project",
      html,
    });

    if (response?.error) {
      const resendMessage = String(response.error.message || "Resend email send failed.");
      throw new Error(`Resend API error (${response.error.statusCode || "unknown"}): ${resendMessage}`);
    }

    console.log("[email] send result:", response);
    return response;
  } catch (error) {
    const rawMessage = String(error?.message || "");
    const lowerMessage = rawMessage.toLowerCase();

    if (lowerMessage.includes("domain") && lowerMessage.includes("verify")) {
      console.error(
        "[email] send failed: sender domain is not verified in Resend. "
        + "Use RESEND_FROM=\"onboarding@resend.dev\" for temporary testing, "
        + "or verify your domain and DNS records in Resend."
      );
    }

    console.error("[email] send failed:", error);
    throw error;
  }
}

module.exports = {
  sendProjectAssignmentEmail,
  renderProjectAssignmentTemplate,
};