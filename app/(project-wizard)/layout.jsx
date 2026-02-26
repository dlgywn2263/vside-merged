// app/new/layout.jsx
import WizardHeader from "@/components/layout/WizardHeader";

export default function NewLayout({ children }) {
  return (
    <>
      <WizardHeader />
      <main className="">{children}</main>
    </>
  );
}
