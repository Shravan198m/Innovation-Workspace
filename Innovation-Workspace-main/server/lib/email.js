const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const templatePath = path.join(__dirname, "..", "templates", "projectAssigned.html");

function parsePositiveIntEnv(name, defaultValue) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`[email] invalid ${name}="${raw}", using default ${defaultValue}`);
    return defaultValue;
  }

  return Math.floor(parsed);
}

const ASSIGNMENT_EMAILS_PER_SECOND = parsePositiveIntEnv("ASSIGNMENT_EMAILS_PER_SECOND", 2);
const ASSIGNMENT_EMAIL_BATCH_DELAY_MS = parsePositiveIntEnv("ASSIGNMENT_EMAIL_BATCH_DELAY_MS", 1000);
const ASSIGNMENT_EMAIL_MAX_RETRIES = parsePositiveIntEnv("ASSIGNMENT_EMAIL_MAX_RETRIES", 3);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error) {
  const statusCode = Number(error?.statusCode || error?.status || error?.code || 0);
  if (statusCode === 429) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return message.includes("429") || message.includes("too many requests") || message.includes("rate limit");
}

function formatRoleForEmail(role) {
  const normalized = String(role || "member").trim().toLowerCase().replace(/[_\s]+/g, " ");

  if (normalized === "team lead") {
    return "Team Lead";
  }

  if (normalized === "team member") {
    return "Team Member";
  }

  if (normalized === "mentor") {
    return "Mentor";
  }

  if (normalized === "admin") {
    return "Admin";
  }

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  console.log("[email] template path:", templatePath);

  return template
    .replace(/{{name}}/g, String(name || "there"))
    .replace(/{{projectName}}/g, String(projectName || "your project"))
    .replace(/{{role}}/g, formatRoleForEmail(role))
    .replace(/{{link}}/g, String(link || "#"));
}

async function sendProjectAssignmentEmail(to, name, projectName, role, link) {
  if (!process.env.RESEND_FROM) {
    throw new Error("RESEND_FROM is missing.");
  }

  const resend = getResendClient();

  console.log("[email] attempting to send email to:", to, "role:", role, "project:", projectName);
  const html = renderProjectAssignmentTemplate({ name, projectName, role, link });

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject: `You’ve been added to a project as ${formatRoleForEmail(role)}`,
      html,
    });

    if (response?.error) {
      const resendMessage = String(response.error.message || "Resend email send failed.");
      throw new Error(`Resend API error (${response.error.statusCode || "unknown"}): ${resendMessage}`);
    }

    console.log("[email] email sent successfully to:", to);
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

    console.error("[email] email failed for:", to);
    console.error("[email] send failed:", error);
    throw error;
  }
}

async function sendProjectAssignmentEmailWithRetry(recipient, maxRetries = ASSIGNMENT_EMAIL_MAX_RETRIES) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      const response = await sendProjectAssignmentEmail(
        recipient.email,
        recipient.name,
        recipient.projectName,
        recipient.role,
        recipient.link
      );
      return {
        response,
        attempts: attempt + 1,
        retriesUsed: attempt,
      };
    } catch (error) {
      lastError = error;
      const isRateLimited = isRateLimitError(error);
      const canRetry = isRateLimited && attempt < maxRetries;

      if (!canRetry) {
        error.attempts = attempt + 1;
        error.retriesUsed = attempt;
        throw error;
      }

      const retryDelayMs = ASSIGNMENT_EMAIL_BATCH_DELAY_MS * (attempt + 1);
      console.warn(
        `[email] rate limit hit for ${recipient?.email || "unknown"}. `
        + `Retrying in ${retryDelayMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await sleep(retryDelayMs);
      attempt += 1;
    }
  }

  if (lastError) {
    lastError.attempts = maxRetries + 1;
    lastError.retriesUsed = maxRetries;
  }
  throw lastError || new Error("Email send failed after retries");
}

function queueProjectAssignmentEmails(recipients, meta = {}) {
  const normalizedRecipients = Array.isArray(recipients) ? recipients.filter(Boolean) : [];

  if (normalizedRecipients.length === 0) {
    console.log("[email] no project assignment recipients to notify");
    return false;
  }

  console.log("[email] queued project assignment batch:", {
    total: normalizedRecipients.length,
    projectId: meta.projectId || null,
    projectName: meta.projectName || null,
    source: meta.source || "unknown",
  });

  setImmediate(() => {
    void (async () => {
      try {
        const summary = [];

        for (let i = 0; i < normalizedRecipients.length; i += ASSIGNMENT_EMAILS_PER_SECOND) {
          const batch = normalizedRecipients.slice(i, i + ASSIGNMENT_EMAILS_PER_SECOND);
          console.log("[email] sending assignment email batch:", {
            batchStart: i + 1,
            batchEnd: i + batch.length,
            total: normalizedRecipients.length,
          });

          const batchResults = await Promise.allSettled(
            batch.map((recipient) => sendProjectAssignmentEmailWithRetry(recipient))
          );

          batchResults.forEach((result, batchIndex) => {
            const recipient = batch[batchIndex];

            if (result.status === "fulfilled") {
              summary.push({
                recipient: recipient?.email || null,
                status: "sent",
                messageId: result?.value?.response?.data?.id || null,
                attempts: result?.value?.attempts || 1,
                retriesUsed: result?.value?.retriesUsed || 0,
              });
              return;
            }

            const reason = String(result?.reason?.message || result?.reason || "Unknown email send error");
            console.error(`[email] background send failed for ${recipient?.email || "unknown"}:`, reason);
            summary.push({
              recipient: recipient?.email || null,
              status: "failed",
              reason,
              attempts: Number(result?.reason?.attempts || 1),
              retriesUsed: Number(result?.reason?.retriesUsed || 0),
            });
          });

          if (i + ASSIGNMENT_EMAILS_PER_SECOND < normalizedRecipients.length) {
            await sleep(ASSIGNMENT_EMAIL_BATCH_DELAY_MS);
          }
        }

        const sentCount = summary.filter((item) => item.status === "sent").length;
        const failedCount = summary.length - sentCount;

        console.log("[email] project assignment batch finished:", {
          total: summary.length,
          sent: sentCount,
          failed: failedCount,
          results: summary,
        });
      } catch (error) {
        console.error("[email] background assignment batch crashed:", error);
      }
    })();
  });

  return true;
}

module.exports = {
  sendProjectAssignmentEmail,
  queueProjectAssignmentEmails,
  renderProjectAssignmentTemplate,
};