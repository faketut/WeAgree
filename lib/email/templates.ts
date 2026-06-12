import { escapeHtml, safeHttpUrl } from "./escape";

export interface EmailTemplateProps {
  agreementTitle: string;
  creatorName: string;
  actionUrl: string;
}

const FALLBACK_HOME = "https://weagree.app";

// Editorial Legal email palette (hex equivalents so they render in mail clients).
// Paper #FBF8F0, Ink #232020, Oxblood #6F1E1E, Hairline #DDD6C6, Muted ink #6B645A.
const PAPER = "#FBF8F0";
const INK = "#232020";
const OXBLOOD = "#6F1E1E";
const HAIRLINE = "#DDD6C6";
const MUTED_INK = "#6B645A";
const FAINT_INK = "#9A9489";

const baseFont = `font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;`;
const sansFont = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;`;

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
  <div style="${sansFont} max-width: 600px; margin: 0 auto; padding: 32px; background: ${PAPER}; border: 1px solid ${HAIRLINE};">
    <p style="${sansFont} font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: ${MUTED_INK}; margin: 0 0 16px 0;">
      Signature required
    </p>
    <h2 style="${baseFont} color: ${INK}; font-size: 28px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.2;">
      An agreement awaits your signature
    </h2>
    <p style="color: ${INK}; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
      <strong>${creator}</strong> has invited you to sign:
    </p>
    <p style="${baseFont} color: ${INK}; font-size: 18px; font-style: italic; margin: 0 0 28px 0;">
      ${title}
    </p>
    <div style="margin: 32px 0;">
      <a href="${urlAttr}" style="display: inline-block; background-color: ${OXBLOOD}; color: ${PAPER}; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 500; ${sansFont} font-size: 14px; letter-spacing: 0.02em;">
        Review &amp; sign
      </a>
    </div>
    <p style="color: ${MUTED_INK}; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0;">
      If the button above doesn&rsquo;t work, copy and paste this link into your browser:<br />
      <a href="${urlAttr}" style="color: ${OXBLOOD}; text-decoration: underline;">${urlText}</a>
    </p>
    <hr style="border: 0; border-top: 1px solid ${HAIRLINE}; margin: 32px 0;" />
    <p style="color: ${FAINT_INK}; font-size: 11px; text-align: center; letter-spacing: 0.06em; margin: 0;">
      Sent via We&nbsp;Agree &mdash; cryptographic agreements
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
  <div style="${sansFont} max-width: 600px; margin: 0 auto; padding: 32px; background: ${PAPER}; border: 1px solid ${HAIRLINE};">
    <p style="${sansFont} font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: ${MUTED_INK}; margin: 0 0 16px 0;">
      Fully signed
    </p>
    <h2 style="${baseFont} color: ${INK}; font-size: 28px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.2;">
      Your agreement has been signed by all parties
    </h2>
    <p style="${baseFont} color: ${INK}; font-size: 18px; font-style: italic; margin: 0 0 28px 0;">
      ${title}
    </p>
    <p style="color: ${INK}; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      The agreement is now finalized. Its proof hash will be anchored on-chain so anyone can
      verify it independently &mdash; today, tomorrow, or in ten years.
    </p>
    <div style="margin: 32px 0;">
      <a href="${urlAttr}" style="display: inline-block; background-color: ${OXBLOOD}; color: ${PAPER}; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 500; ${sansFont} font-size: 14px; letter-spacing: 0.02em;">
        View final agreement
      </a>
    </div>
    <hr style="border: 0; border-top: 1px solid ${HAIRLINE}; margin: 32px 0;" />
    <p style="color: ${FAINT_INK}; font-size: 11px; text-align: center; letter-spacing: 0.06em; margin: 0;">
      Sent via We&nbsp;Agree &mdash; cryptographic agreements
    </p>
  </div>
`;
};
