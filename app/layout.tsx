import "./globals.css";
import Providers from "./providers";
import AppShell from "./app-shell";

// 💡 [추가] 우리가 방금 만든 글로벌 초대 알림창 컴포넌트를 불러옵니다!
import { GlobalInvitationToast } from "@/components/notifications/GlobalInvitationToast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
          
          {/* 💡 [핵심 추가] 사용자가 어느 페이지에 있든 초대를 받을 수 있도록 레이아웃 맨 밑에 깔아둡니다! */}
          <GlobalInvitationToast />
        </Providers>
      </body>
    </html>
  );
}