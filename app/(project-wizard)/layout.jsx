// app/new/layout.jsx
import WizardHeader from "@/components/layout/WizardHeader";

export default function NewLayout({ children }) {
  return (
    <>
      <WizardHeader />
      {/* AppShell 의 flex 열에서 남은 높이를 받아 WizardShell fill 에 넘긴다 */}
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
