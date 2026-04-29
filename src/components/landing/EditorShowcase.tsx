"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/landing/Reveal";

type Variant = {
  key: "personal" | "team";
  badge: string;
  title: string;
  points: string[];
  imgSrc: string;
};

export default function EditorShowcase() {
  const variants: Variant[] = useMemo(
    () => [
      {
        key: "personal",
        badge: "개인용 에디터",
        title: "혼자서 빠르게 시작하는 개발 워크스페이스",
        points: [
          "프로젝트 생성 → 즉시 코딩 시작 (빠른 부팅/간단한 흐름)",
          "언어별 LSP 기반 자동완성/진단을 기본 제공",
          "AI 도우미가 에러/현재 파일 컨텍스트 기반 해결 흐름 제안",
        ],
        imgSrc: "/personalide.png", // ✅ public/personalide.png
      },
      {
        key: "team",
        badge: "팀 협업 에디터",
        title: "같은 파일을 동시에 편집하는 실시간 협업 IDE",
        points: [
          "동시 편집    ",
          "팀원 커서/선택/현재 보고 있는 파일을 실시간 공유",
          "드라이버/내비게이터 역할로 페어 프로그래밍에 최적화",
        ],
        imgSrc: "/teamide.png", // ✅ public/teamide.png
      },
    ],
    [],
  );

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((p) => (p + 1) % variants.length);
    }, 5200);
    return () => clearInterval(t);
  }, [variants.length]);

  const current = variants[idx];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* 이미지 영역 */}
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden border border-gray-200 bg-gray-50">
              <div className="absolute left-4 top-4 z-10 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                {current.badge} · 자동 전환
              </div>

              <div className="relative h-[280px] md:h-[360px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.key}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.99, filter: "blur(10px)" }}
                    transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <Image
                      src={current.imgSrc}
                      alt={current.badge}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          {/* 텍스트 영역 */}
          <Reveal delay={120}>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-900/60" />
                {current.badge}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={current.key}
                  initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                  transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <h1 className="mt-4 text-3xl md:text-5xl font-extrabold leading-tight text-gray-900">
                    {current.title}
                  </h1>

                  <ul className="mt-6 space-y-3 text-gray-700 leading-relaxed">
                    {current.points.map((t) => (
                      <li key={t} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-gray-900/50" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
              {/* 
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#start"
                  className="rounded-xl bg-gray-900 text-white px-5 py-3 font-semibold hover:opacity-90"
                >
                  프로젝트 시작하기
                </a>
                <a
                  href="#features"
                  className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-50"
                >
                  기능 둘러보기
                </a>
              </div> */}

              {/* 전환 인디케이터 */}
              <div className="mt-6 flex items-center gap-2">
                {variants.map((v, i) => {
                  const on = i === idx;
                  return (
                    <span
                      key={v.key}
                      className={[
                        "h-2 rounded-full transition-all duration-300",
                        on ? "w-8 bg-gray-900/70" : "w-2 bg-gray-300",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
