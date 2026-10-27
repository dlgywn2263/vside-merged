export function DevlogEmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 px-5 py-12 text-center text-xs text-slate-400">
      {text}
    </div>
  );
}
