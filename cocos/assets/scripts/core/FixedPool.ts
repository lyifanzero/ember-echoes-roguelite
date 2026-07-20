interface Poolable {
  active: boolean;
}

export class FixedPool<T extends Poolable> {
  private readonly items: T[];

  public constructor(capacity: number, factory: () => T) {
    this.items = Array.from({ length: capacity }, factory);
  }

  public acquire(initialise: (item: T) => void): T | null {
    const item = this.items.find((candidate) => !candidate.active);
    if (!item) {
      return null;
    }
    initialise(item);
    item.active = true;
    return item;
  }

  public release(item: T): void {
    item.active = false;
  }

  public forEachActive(visitor: (item: T) => void): void {
    for (const item of this.items) {
      if (item.active) {
        visitor(item);
      }
    }
  }

  public findActive(predicate: (item: T) => boolean): T | null {
    for (const item of this.items) {
      if (item.active && predicate(item)) {
        return item;
      }
    }
    return null;
  }

  public get activeCount(): number {
    let count = 0;
    this.forEachActive(() => count++);
    return count;
  }

  public get capacity(): number {
    return this.items.length;
  }

  public clear(): void {
    for (const item of this.items) {
      item.active = false;
    }
  }
}
