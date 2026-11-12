import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWriteQueue, type WriteStatus } from '../../src/persistence/writeQueue';

function delayed(ms: number) {
  return () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
}

function setup() {
  const statuses: WriteStatus[] = [];
  const queue = createWriteQueue((status) => statuses.push(status));
  return { statuses, queue };
}

describe('createWriteQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs writes one at a time in enqueue order', async () => {
    const { queue } = setup();
    const log: string[] = [];
    queue.enqueue(async () => {
      log.push('A start');
      await delayed(300)();
      log.push('A end');
    });
    queue.enqueue(async () => {
      log.push('B start');
      await delayed(10)();
      log.push('B end');
    });

    await vi.advanceTimersByTimeAsync(299);
    expect(log).toEqual(['A start']);

    await vi.advanceTimersByTimeAsync(1000);
    expect(log).toEqual(['A start', 'A end', 'B start', 'B end']);
  });

  it('reports saving then idle for a successful write', async () => {
    const { queue, statuses } = setup();
    queue.enqueue(delayed(10));
    await vi.advanceTimersByTimeAsync(10);
    expect(statuses).toEqual(['saving', 'idle']);
  });

  it('stays saving across queued writes and notifies only on change', async () => {
    const { queue, statuses } = setup();
    queue.enqueue(delayed(10));
    queue.enqueue(delayed(10));
    await vi.advanceTimersByTimeAsync(20);
    expect(statuses).toEqual(['saving', 'idle']);
  });
});
