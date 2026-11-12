export type WriteStatus = 'idle' | 'saving';

export interface WriteQueue {
  enqueue(write: () => Promise<void>): void;
}

// Runs writes one at a time in enqueue order, so the backend sees them in the order the user made them.
export function createWriteQueue(onStatusChange: (status: WriteStatus) => void): WriteQueue {
  let tail: Promise<void> = Promise.resolve();
  let outstanding = 0;

  return {
    enqueue(write) {
      if (outstanding === 0) {
        onStatusChange('saving');
      }
      outstanding += 1;
      tail = tail.then(write).then(() => {
        outstanding -= 1;
        if (outstanding === 0) {
          onStatusChange('idle');
        }
      });
    },
  };
}
