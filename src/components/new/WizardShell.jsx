// fill: AppShell 의 TopNav 아래 남은 높이만 채운다. min-h-screen 은 TopNav 위에 100vh 를 더 쌓아
// 내용이 짧아도 세로 스크롤이 생기므로, 화면에 다 들어오는 페이지(/new/workspace)는 fill 을 쓴다.
// 부모(project-wizard layout 의 main)가 flex-1 flex-col 이어야 동작한다.
export default function WizardShell({ children, fill = false }) {
  return (
    <main className={fill ? "flex-1 bg-gray-50" : "bg-gray-50 min-h-screen "}>
      <div
        className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8 2xl:max-w-[1120px] 2xl:px-0 2xl:py-12 2xl:pt-16 2xl:pb-20
      "
      >
        <div>{children}</div>
      </div>
    </main>
  );
}
