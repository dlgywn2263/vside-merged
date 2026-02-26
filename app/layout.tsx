import "./globals.css";
import TopNav from "@/components/landing/TopNav";
import { AuthProvider } from "@/contexts/AuthContext";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {/* ✅ 모든 페이지에서 공통으로 보이는 헤더 */}

        {/* 페이지별 콘텐츠 */}
        <AuthProvider>
          <TopNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
