import { resend } from "./client";
import { log } from "@/lib/log";
import {
    signatureRequiredTemplate,
    agreementFinalizedTemplate,
    EmailTemplateProps,
} from "./templates";

const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function sendSignatureRequestEmail({
    to,
    agreementTitle,
    creatorName,
    actionUrl,
}: EmailTemplateProps & { to: string }) {
    if (!resend) {
        log.info("[email simulated] signature request", { to, agreementTitle });
        return { success: true, simulated: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `Signature Required: ${agreementTitle}`,
            html: signatureRequiredTemplate({ agreementTitle, creatorName, actionUrl }),
        });

        if (error) {
            console.error("Failed to send signature request email:", error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Internal error sending signature request email:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

export async function sendAgreementFinalizedEmail({
    to,
    agreementTitle,
    actionUrl,
}: {
    to: string;
    agreementTitle: string;
    actionUrl: string;
}) {
    if (!resend) {
        log.info("[email simulated] agreement finalized", { to, agreementTitle });
        return { success: true, simulated: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `Agreement Finalized: ${agreementTitle}`,
            html: agreementFinalizedTemplate({ agreementTitle, actionUrl }),
        });

        if (error) {
            console.error("Failed to send agreement finalized email:", error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Internal error sending agreement finalized email:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}
