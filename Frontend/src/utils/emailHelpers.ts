import { extractEmailAndContent, sanitizeEmailResponse } from "../lib/extractEmail";

// Parse email string to extract subject and body
export const parseEmail = (emailStr: any = "") => {
  if (!emailStr || typeof emailStr !== "string") {
    return { subject: "", body: "" };
  }

  const sanitized = sanitizeEmailResponse(emailStr);
  const { email } = extractEmailAndContent(sanitized);

  const lines = email.split("\n");
  let subjectLine = "";
  let bodyLines: string[] = [];

  if (lines.length > 0) {
    if (/^Subject:\s*/i.test(lines[0])) {
      subjectLine = lines[0].replace(/^Subject:\s*/i, "").trim();
      bodyLines = lines.slice(1);
    } else {
      const subjectIndex = lines.findIndex((line) => /^Subject:\s*/i.test(line));
      if (subjectIndex !== -1) {
        subjectLine = lines[subjectIndex].replace(/^Subject:\s*/i, "").trim();
        bodyLines = [...lines.slice(0, subjectIndex), ...lines.slice(subjectIndex + 1)];
      } else {
        subjectLine = "";
        bodyLines = lines;
      }
    }
  }

  return {
    subject: subjectLine,
    body: bodyLines.join("\n").trim(),
  };
};

// Create Gmail compose URL
export const createGmailComposeUrl = ({
  to = "",
  subject = "",
  body = "",
}: {
  to?: string;
  subject?: string;
  body?: string;
}) => {
  const baseUrl = "https://mail.google.com/mail/?view=cm&fs=1";
  const params = new URLSearchParams({
    to,
    su: subject,
    body,
  });
  return `${baseUrl}&${params.toString()}`;
};

// Open Gmail compose window
export const openGmailCompose = ({
  to = "",
  subject = "",
  body = "",
  userEmail = null,
}: {
  to?: string;
  subject?: string;
  body?: string;
  userEmail?: string | null;
}) => {
  const gmailComposeUrl = createGmailComposeUrl({ to, subject, body });

  if (!userEmail) {
    const googleLoginUrl =
      "https://accounts.google.com/ServiceLogin" +
      `?continue=${encodeURIComponent(gmailComposeUrl)}`;
    window.open(googleLoginUrl, "_blank");
    return;
  }

  window.open(gmailComposeUrl, "_blank");
};
