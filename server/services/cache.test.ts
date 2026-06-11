import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TTLCache } from './cache';

describe('TTLCache', () => {
  let cache: TTLCache<string>;

  beforeEach(() => {
    cache = new TTLCache(1000); // 1 second TTL
  });

  it('should set and get a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('non-existent')).toBeUndefined();
  });

  it('should expire items after TTL', async () => {
    cache.set('key2', 'value2', 100); // 100ms TTL
    expect(cache.get('key2')).toBe('value2');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should use default TTL when not specified', async () => {
    cache = new TTLCache(50);
    cache.set('key3', 'value3');
    expect(cache.get('key3')).toBe('value3');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cache.get('key3')).toBeUndefined();
  });
});
