export default function WizardShell({ children }) {
  return (
    <main className="bg-gray-50 min-h-screen ">
      <div
        className="mx-auto max-w-6xl px-5 py-8
      "
      >
        <div>{children}</div>
      </div>
    </main>
  );
}
