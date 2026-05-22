import { countSignatureSlots, buildSignatureSlotMap } from './signaturePlaceholders';

describe('signaturePlaceholders', () => {
    describe('countSignatureSlots', () => {
        it('returns 0 for empty or null content', () => {
            expect(countSignatureSlots('')).toBe(0);
            expect(countSignatureSlots(null)).toBe(0);
        });

        it('counts single and multiple placeholders', () => {
            expect(countSignatureSlots('Hello {{signature}}')).toBe(1);
            expect(countSignatureSlots('{{signature}} and {{signature}}')).toBe(2);
        });

        it('is case insensitive and handles spaces', () => {
            expect(countSignatureSlots('{{SIGNATURE}}')).toBe(1);
            expect(countSignatureSlots('{{ signature }}')).toBe(1);
            expect(countSignatureSlots('{{  signature  }}')).toBe(1);
        });

        it('ignores non-placeholders', () => {
            expect(countSignatureSlots('{{name}} and {signature}')).toBe(0);
        });
    });

    describe('buildSignatureSlotMap', () => {
        it('returns empty array for no placeholders', () => {
            expect(buildSignatureSlotMap('Hello world')).toEqual([]);
        });

        it('returns correct mappings for multiple placeholders', () => {
            const content = 'A: {{signature}}, B: {{ signature }}';
            const map = buildSignatureSlotMap(content);

            expect(map).toHaveLength(2);
            expect(map[0]).toEqual({
                index: 0,
                start: 3,
                end: 3 + '{{signature}}'.length
            });
            expect(map[1]).toEqual({
                index: 1,
                start: 21,
                end: 21 + '{{ signature }}'.length
            });
        });
    });
});
