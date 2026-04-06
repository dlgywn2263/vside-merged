import RearrangeProviders from "./providers";

export default function RearrangeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RearrangeProviders>{children}</RearrangeProviders>;
}
