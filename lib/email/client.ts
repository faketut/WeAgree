import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

if (!resend) {
    console.warn("RESEND_API_KEY is not set. Email notifications will be logged to console instead of sent.");
}
