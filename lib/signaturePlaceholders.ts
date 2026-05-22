const SIGNATURE_PLACEHOLDER_REGEX = /\{\{\s*signature\s*\}\}/gi;

export function countSignatureSlots(content: string | null | undefined): number {
  if (!content) return 0;
  const matches = content.match(SIGNATURE_PLACEHOLDER_REGEX);
  return matches ? matches.length : 0;
}

export function buildSignatureSlotMap(content: string | null | undefined): {
  index: number;
  start: number;
  end: number;
}[] {
  const slots: { index: number; start: number; end: number }[] = [];
  if (!content) return slots;
  const regex = new RegExp(SIGNATURE_PLACEHOLDER_REGEX.source, SIGNATURE_PLACEHOLDER_REGEX.flags);
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(content)) !== null) {
    slots.push({
      index,
      start: match.index,
      end: match.index + match[0].length,
    });
    index += 1;
  }
  return slots;
}

