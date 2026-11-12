import { useNoteEditor } from './useNoteEditor';

interface NoteEditorProps {
  readonly text: string;
  readonly onDone: (text: string) => void; // Called once.
}

export function NoteEditor({ text, onDone }: NoteEditorProps) {
  const { ref, onBlur, onKeyDown } = useNoteEditor(onDone);

  return (
    <textarea
      ref={ref}
      className="note-editor"
      aria-label="Note text"
      placeholder="Write a note…"
      defaultValue={text}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
