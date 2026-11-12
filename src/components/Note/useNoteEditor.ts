import { useCallback, useLayoutEffect, useRef } from 'react';

// Reports the text once: on blur (Escape blurs), or on unmount if the text changed and no blur came first.
export function useNoteEditor(onDone: (text: string) => void) {
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => {
    onDoneRef.current = onDone;
  });

  const done = useRef(false);
  const finish = useCallback((value: string) => {
    if (done.current) {
      return;
    }
    done.current = true;
    onDoneRef.current(value);
  }, []);

  // A ref that returns a cleanup is called with the element on mount, never with null; the cleanup runs on unmount.
  const ref = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const end = textarea.value.length;
      textarea.focus();
      textarea.setSelectionRange(end, end);
      return () => {
        // Pressing another note or the board removes this textarea before the browser moves focus, so no blur comes.
        if (textarea.value !== textarea.defaultValue) {
          finish(textarea.value);
        }
      };
    },
    [finish],
  );

  return {
    ref,
    onBlur(event: React.FocusEvent<HTMLTextAreaElement>) {
      finish(event.currentTarget.value);
    },
    onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (event.key === 'Escape') {
        event.currentTarget.blur();
      }
    },
  };
}
