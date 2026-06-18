import { describe, it, expect } from 'vitest';
import { sanitizeId, sanitizeString, sanitizeArray, validate, ContactSchema } from './validation';

// The security-critical path: sanitizeId is the only thing standing between
// user input and a PocketBase filter string. A regression here reopens filter
// injection, so these cases must stay green.
describe('sanitizeId', () => {
    it('accepts valid PocketBase-style ids', () => {
        expect(sanitizeId('abc123XYZ')).toBe('abc123XYZ');
        expect(sanitizeId('user_id-01')).toBe('user_id-01');
    });

    it('rejects filter-injection payloads', () => {
        expect(() => sanitizeId('a" || user="b')).toThrow('Invalid ID format');
        expect(() => sanitizeId('1 || 1=1')).toThrow('Invalid ID format');
        expect(() => sanitizeId("'; DROP")).toThrow('Invalid ID format');
        expect(() => sanitizeId('')).toThrow('Invalid ID format');
    });

    it('rejects non-string input', () => {
        expect(() => sanitizeId(null)).toThrow('Invalid ID format');
        expect(() => sanitizeId(42)).toThrow('Invalid ID format');
        expect(() => sanitizeId({})).toThrow('Invalid ID format');
    });
});

describe('sanitizeString', () => {
    it('trims and collapses whitespace', () => {
        expect(sanitizeString('  hello   world  ')).toBe('hello world');
    });
    it('enforces max length', () => {
        expect(sanitizeString('abcdef', 3)).toBe('abc');
    });
    it('throws on non-string', () => {
        expect(() => sanitizeString(123)).toThrow('Expected string');
    });
});

describe('sanitizeArray', () => {
    it('keeps only non-empty strings', () => {
        expect(sanitizeArray(['a', '', '  b  ', 5, null])).toEqual(['a', 'b']);
    });
    it('returns [] for non-arrays', () => {
        expect(sanitizeArray('nope')).toEqual([]);
    });
});

describe('validate', () => {
    it('passes a valid contact through', () => {
        const c = { name: 'Jane', email: 'jane@example.com' };
        expect(validate(ContactSchema, c)).toMatchObject(c);
    });
    it('throws a descriptive error on bad data', () => {
        expect(() => validate(ContactSchema, { name: '', email: 'nope' })).toThrow(/Validation failed/);
    });
});
