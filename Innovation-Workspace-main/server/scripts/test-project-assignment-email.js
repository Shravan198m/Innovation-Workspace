const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { sendProjectAssignmentEmail } = require("../lib/email");

function getArgValue(flag) {
  const exactPrefix = `${flag}=`;
  const directValue = process.argv.find((argument) => argument.startsWith(exactPrefix));
  if (directValue) {
    return directValue.slice(exactPrefix.length).trim();
  }

  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return "";
  }

  const value = process.argv[index + 1];
  return typeof value === "string" ? value.trim() : "";
}

function getDefaultLink() {
  const baseUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/projects/demo/board`;
}

async function main() {
  const to = getArgValue("--to");
  const name = getArgValue("--name") || "Test User";
  const projectName = getArgValue("--projectName") || "Innovation Hub Demo Project";
  const role = getArgValue("--role") || "Student";
  const link = getArgValue("--link") || getDefaultLink();

  if (!to) {
    console.error("Missing required --to argument.");
    console.error("Example: npm run test:project-assignment-email -- --to=person@example.com --name=Person --projectName=Demo --role=Student");
    process.exit(1);
  }

  console.log(`Sending test assignment email to ${to}...`);

  const result = await sendProjectAssignmentEmail(to, name, projectName, role, link);
  console.log("Email send result:", result);
}

main().catch((error) => {
  console.error("Project assignment email test failed:", error);
  process.exit(1);
});