import { canonicalize } from './json-canonical';

describe('json-canonical', () => {
    it('sorts keys of a simple object', () => {
        const input = { b: 2, a: 1 };
        expect(canonicalize(input)).toBe('{"a":1,"b":2}');
    });

    it('sorts nested objects', () => {
        const input = {
            z: { b: 2, a: 1 },
            m: 3
        };
        expect(canonicalize(input)).toBe('{"m":3,"z":{"a":1,"b":2}}');
    });

    it('handles arrays correctly without sorting them', () => {
        const input = { a: [3, 2, 1], b: 2 };
        expect(canonicalize(input)).toBe('{"a":[3,2,1],"b":2}');
    });

    it('handles null and primitives', () => {
        expect(canonicalize(null)).toBe('null');
        expect(canonicalize(123)).toBe('123');
        expect(canonicalize("hello")).toBe('"hello"');
    });

    it('handles nested objects in arrays', () => {
        const input = [{ b: 2, a: 1 }];
        expect(canonicalize(input)).toBe('[{"a":1,"b":2}]');
    });
});
