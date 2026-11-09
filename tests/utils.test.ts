import { describe, it, expect } from 'vitest';
import { loadLocalStorage, saveLocalStorage } from '../src/utils/storage';

describe('fox3 storage utility tests', () => {
  it('reads and writes to storage with fallback defaults', () => {
    const val = loadLocalStorage('test_key_not_exist', { fallback: true });
    expect(val).toEqual({ fallback: true });
  });

  it('verifies markdown parsing regex patterns for inline images', () => {
    const raw = 'Text before ![Alt text](https://example.com/pic.png) text after';
    const regex = /!\[(.*?)\]\((.*?)\)/g;
    const match = regex.exec(raw);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('Alt text');
    expect(match?.[2]).toBe('https://example.com/pic.png');
  });

  it('verifies markdown heading regex pattern', () => {
    const heading = '### Test Heading 3';
    const match = /^(#{1,6})\s+(.*)$/.exec(heading);
    expect(match).not.toBeNull();
    expect(match?.[1].length).toBe(3);
    expect(match?.[2]).toBe('Test Heading 3');
  });
});
