import { escapeHtml, safeHttpUrl } from "./escape";

export interface EmailTemplateProps {
    agreementTitle: string;
    creatorName: string;
    actionUrl: string;
}

const FALLBACK_HOME = "https://weagree.app";

export const signatureRequiredTemplate = ({
    agreementTitle,
    creatorName,
    actionUrl,
}: EmailTemplateProps) => {
    const title = escapeHtml(agreementTitle);
    const creator = escapeHtml(creatorName);
    const url = safeHttpUrl(actionUrl) ?? FALLBACK_HOME;
    const urlAttr = escapeHtml(url);
    const urlText = escapeHtml(url);
    return `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h2 style="color: #1a202c;">Signature Required</h2>
    <p style="color: #4a5568;">
      <strong>${creator}</strong> has invited you to sign an agreement: <strong>${title}</strong>.
    </p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${urlAttr}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Review and Sign
      </a>
    </div>
    <p style="color: #718096; font-size: 14px;">
      If the button above doesn't work, copy and paste this link into your browser:<br />
      <a href="${urlAttr}" style="color: #3182ce;">${urlText}</a>
    </p>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
      Sent via WeAgree – Secure Lightweight Agreements
    </p>
  </div>
`;
};

export const agreementFinalizedTemplate = ({
    agreementTitle,
    actionUrl,
}: {
    agreementTitle: string;
    actionUrl: string;
}) => {
    const title = escapeHtml(agreementTitle);
    const url = safeHttpUrl(actionUrl) ?? FALLBACK_HOME;
    const urlAttr = escapeHtml(url);
    return `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h2 style="color: #1a202c;">Agreement Finalized! 🎉</h2>
    <p style="color: #4a5568;">
      Great news! All parties have signed the agreement: <strong>${title}</strong>.
    </p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${urlAttr}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        View Final Agreement
      </a>
    </div>
    <p style="color: #718096; font-size: 14px;">
      The agreement is now fully signed and stored securely.
    </p>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
      Sent via WeAgree – Secure Lightweight Agreements
    </p>
  </div>
`;
};
