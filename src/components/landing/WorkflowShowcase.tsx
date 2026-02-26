import Image from "next/image";
import Reveal from "@/components/landing/Reveal";

export default function WorkflowShowcase() {
  return (
    <section id="workflow" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-gray-500">운영 기능</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-gray-900">
              개발 이후까지 이어지는 워크플로우
            </h2>
            <p className="mt-3 text-gray-600 leading-relaxed">
              배포/기록/일정까지 이어져서 “프로젝트 결과물”을 정리하기
              쉬워집니다.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-12">
          <Row
            title="깃 허브 배포"
            headline="변경 이력과 협업 흐름을 IDE에서"
            bullets={[
              "변경 파일/라인을 바로 확인하고 커밋 흐름 안내",
              "브랜치 전략 템플릿으로 실수 줄이기",
              "PR/리뷰 전 체크리스트로 품질 관리",
            ]}
            imgSrc="/workflow_deploy.png"
            reverse={false}
          />

          <Row
            title="개발 일지"
            headline="기록이 자동으로 남아 보고서가 쉬워짐"
            bullets={[
              "커밋/작업 로그 기반으로 오늘 한 일을 요약",
              "버그 해결 과정을 타임라인으로 정리",
              "배포 내역과 릴리즈 노트 자동 생성",
            ]}
            imgSrc="/workflow_devlog.png"
            reverse
          />

          <Row
            title="일정관리"
            headline="마감까지 남은 일이 보이는 일정 보드"
            bullets={[
              "칸반/캘린더 형태로 작업을 한눈에",
              "담당자/우선순위로 역할 분담 명확화",
              "마감일 알림으로 일정 누락 방지",
            ]}
            imgSrc="/workflow_schedule.png"
            reverse={false}
          />
        </div>
      </div>
    </section>
  );
}

function Row({
  title,
  headline,
  bullets,
  imgSrc,
  reverse,
}: {
  title: string;
  headline: string;
  bullets: string[];
  imgSrc: string;
  reverse?: boolean;
}) {
  return (
    <div
      className={`grid md:grid-cols-2 gap-10 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
    >
      <Reveal>
        <div className="rounded-3xl overflow-hidden border border-gray-200 bg-gray-50 relative h-[260px] md:h-[320px]">
          <Image src={imgSrc} alt={title} fill className="object-cover" />
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div>
          <p className="text-sm font-semibold text-gray-500">{title}</p>
          <h3 className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-900">
            {headline}
          </h3>
          <ul className="mt-4 space-y-3 text-gray-700 leading-relaxed">
            {bullets.map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-gray-900/50" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
