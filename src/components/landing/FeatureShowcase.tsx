"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Reveal from "@/components/landing/Reveal";

type Item = {
  key: "codemap" | "tester" | "api";
  title: string;
  oneLiner: string;
  bullets: string[];
  imgSrc: string;
};

export default function FeatureShowcase() {
  const items: Item[] = useMemo(
    () => [
      {
        key: "codemap",
        title: "코드맵",
        oneLiner: "프로젝트 구조를 한눈에 파악하는 지도",
        bullets: [
          "파일/모듈/의존 관계를 그래프로 시각화",
          "영향 범위를 빠르게 파악해서 디버깅 시간 감소",
          "팀원이 합류해도 프로젝트 흐름을 바로 이해",
        ],
        imgSrc: "/feature_codemap.png",
      },
      {
        key: "tester",
        title: "API 테스터",
        oneLiner: "변경 이력과 협업 흐름을 IDE에서",
        bullets: [
          "Postman 없이 즉시 GET / POST / PUT / DELETE 요청 실행",
          "응답 결과를 실시간으로 확인하며 디버깅 속도 향상",
          "개발 흐름을 끊지 않는 인라인 테스트 환경 제공",
        ],
        imgSrc: "/feature_git.png",
      },
      {
        key: "api",
        title: "API 명세서",
        oneLiner: "문서를 ‘쓰는’게 아니라 ‘생성’하는 방식",
        bullets: [
          "엔드포인트/요청/응답 예시를 자동 정리",
          "팀 공용 포맷으로 문서 퀄리티 유지",
          "프론트/백 협업 커뮤니케이션 비용 절감",
        ],
        imgSrc: "/feature_api.png",
      },
    ],
    [],
  );

  const [active, setActive] = useState<Item["key"]>("codemap");
  const current = items.find((x) => x.key === active) ?? items[0];

  return (
    <section id="features" className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-gray-500">핵심 기능</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-gray-900">
              기능을 누르면 큰 프리뷰로 바로 확인
            </h2>
            <p className="mt-3 text-gray-600 leading-relaxed">
              VSIDE의 주요 기능들을 클릭해서 어떤 모습인지 바로 확인해보세요.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
          <div className="space-y-3">
            {items.map((it, i) => {
              const on = it.key === active;
              return (
                <Reveal key={it.key} delay={80 + i * 80}>
                  <button
                    type="button"
                    onClick={() => setActive(it.key)}
                    className={[
                      "w-full text-left rounded-2xl border p-5 transition",
                      on
                        ? "border-gray-900 bg-white shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-lg font-extrabold text-gray-900">
                          {it.title}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {it.oneLiner}
                        </div>
                      </div>
                      <div className="h-12 w-12 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden relative">
                        <Image
                          src={it.imgSrc}
                          alt={it.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </button>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-500">
                  기능 설명
                </div>
                <h3 className="mt-2 text-2xl font-extrabold text-gray-900">
                  {current.title}
                </h3>
                <p className="mt-2 text-gray-600">{current.oneLiner}</p>

                <ul className="mt-4 space-y-2 text-gray-700 leading-relaxed">
                  {current.bullets.map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-gray-900/50" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative bg-gray-50 h-[320px] md:h-[420px]">
                <Image
                  src={current.imgSrc}
                  alt={`${current.title} 프리뷰`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
