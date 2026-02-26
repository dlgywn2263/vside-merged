"use client";

import { motion } from "framer-motion";

export default function Reveal({
  children,
  delay = 0,
  once = true,
  y = 18,
}: {
  children: React.ReactNode;
  delay?: number;
  once?: boolean;
  y?: number;
}) {
  return (
    <motion.div
      // ✅ 처음 상태(안 보일 때)
      initial={{ opacity: 0, y, filter: "blur(1px)" }}
      // ✅ 화면에 들어오면(스크롤 진입)
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      // ✅ 화면에 얼마나 들어오면 트리거할지 + 한번만/반복
      viewport={{ once, amount: 0.2 }}
      // ✅ 토스 느낌 easing
      transition={{
        duration: 0.9,
        ease: [0.2, 0.8, 0.2, 1],
        delay: delay / 1000, // ms -> sec
      }}
    >
      {children}
    </motion.div>
  );
}
