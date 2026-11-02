type Node<K, V> = {
  key: K;
  value: V;
  expireAt: number;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
};

export class LRUCache<K, V> {
  private max: number;
  private ttl: number;
  private map = new Map<K, Node<K, V>>();
  private head: Node<K, V> | null = null;
  private tail: Node<K, V> | null = null;

  constructor(opts: { max?: number; ttl?: number } = {}) {
    this.max = opts.max ?? 1000;
    this.ttl = opts.ttl ?? 0;
  }

  get(key: K): V | undefined {
    const n = this.map.get(key);
    if (!n) return;
    if (n.expireAt && Date.now() > n.expireAt) {
      this.delNode(n);
      return;
    }
    this.moveToHead(n);
    return n.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    let n = this.map.get(key);
    const effectiveTtl = ttlMs ?? this.ttl;
    const exp = Date.now() + effectiveTtl;
    const useExp = effectiveTtl > 0 ? exp : 0;
    if (n) {
      n.value = value;
      n.expireAt = useExp;
      this.moveToHead(n);
      return;
    }
    n = { key, value, expireAt: useExp, prev: null, next: null };
    this.map.set(key, n);
    this.addToHead(n);
    if (this.map.size > this.max && this.tail) {
      this.delNode(this.tail);
    }
  }

  has(key: K): boolean {
    const n = this.map.get(key);
    if (!n) return false;
    if (n.expireAt && Date.now() > n.expireAt) {
      this.delNode(n);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    const n = this.map.get(key);
    if (!n) return false;
    this.delNode(n);
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  get size(): number {
    return this.map.size;
  }

  private addToHead(n: Node<K, V>): void {
    n.next = this.head;
    n.prev = null;
    if (this.head) this.head.prev = n;
    this.head = n;
    if (!this.tail) this.tail = n;
  }

  private delNode(n: Node<K, V>): void {
    this.map.delete(n.key);
    if (n.prev) n.prev.next = n.next;
    else this.head = n.next;
    if (n.next) n.next.prev = n.prev;
    else this.tail = n.prev;
  }

  private moveToHead(n: Node<K, V>): void {
    if (n === this.head) return;
    if (n.prev) n.prev.next = n.next;
    if (n.next) n.next.prev = n.prev;
    if (n === this.tail) this.tail = n.prev;
    n.prev = null;
    n.next = this.head;
    if (this.head) this.head.prev = n;
    this.head = n;
  }
}
