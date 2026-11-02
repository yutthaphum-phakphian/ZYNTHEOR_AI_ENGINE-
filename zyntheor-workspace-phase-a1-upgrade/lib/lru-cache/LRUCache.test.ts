import { describe, it, expect } from 'vitest';
import { LRUCache } from './LRUCache';

describe('LRUCache O(1) + TTL', () => {
  it('evicts least recently used item when max size is reached', () => {
    const cache = new LRUCache<string, number>({ max: 2, ttl: 1000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' becomes MRU, 'b' is LRU
    cache.set('c', 3); // 'b' is evicted
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });

  it('expires entries after TTL', async () => {
    const cache = new LRUCache<string, number>({ max: 5, ttl: 50 });
    cache.set('x', 100);
    expect(cache.has('x')).toBe(true);
    expect(cache.get('x')).toBe(100);

    await new Promise(r => setTimeout(r, 70));
    expect(cache.has('x')).toBe(false);
    expect(cache.get('x')).toBeUndefined();
  });

  it('allows overriding TTL per set call', async () => {
    const cache = new LRUCache<string, string>({ max: 10, ttl: 500 });
    cache.set('short', 'val', 30);
    expect(cache.has('short')).toBe(true);

    await new Promise(r => setTimeout(r, 50));
    expect(cache.has('short')).toBe(false);
  });

  it('clears all entries and resets head/tail', () => {
    const cache = new LRUCache<string, number>({ max: 5 });
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has('a')).toBe(false);
  });
});
