import { RESEND_EMAILS_URL, RESET_EMAIL_SUBJECT, RESET_EMAIL_TEXT } from "@/constants/auth/auth";
import type { MailCredentials } from "@/types/auth/auth";

/**
 * Sends the reset link through the Resend REST API (no SDK). Never throws: a failure is logged,
 * because an error here would only reach the caller for registered addresses and so reveal them
 * (SEC-10). The caller schedules it after the response for the same reason (timing).
 */
export async function sendResetEmail(mail: MailCredentials, to: string, url: string) {
  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${mail.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mail.from,
        to,
        subject: RESET_EMAIL_SUBJECT,
        text: RESET_EMAIL_TEXT.replace("{url}", url),
      }),
    });
    if (!response.ok) console.error(`Reset email failed: Resend answered ${response.status}`);
  } catch (error) {
    console.error("Reset email failed: Resend unreachable", error);
  }
}
