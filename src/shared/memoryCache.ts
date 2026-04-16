interface MemoryCacheRecord<T> {
  expiresAt: number;
  value: T;
}

export function createMemoryCache<T>() {
  const records = new Map<string, MemoryCacheRecord<T>>();

  return {
    get(key: string): T | null {
      const record = records.get(key);

      if (!record) {
        return null;
      }

      if (record.expiresAt <= Date.now()) {
        records.delete(key);
        return null;
      }

      return record.value;
    },
    set(key: string, value: T, ttlMs: number) {
      if (ttlMs <= 0) {
        records.delete(key);
        return;
      }

      records.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
    },
    clear() {
      records.clear();
    },
  };
}
