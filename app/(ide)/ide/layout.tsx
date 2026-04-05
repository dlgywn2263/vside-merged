import IdeRootProviders from "@/components/ide/IdeRootProviders";

export default function IdeLayout({ children }: { children: React.ReactNode }) {
  return <IdeRootProviders>{children}</IdeRootProviders>;
}
