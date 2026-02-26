// "use client";

// import type { Stats } from "../types";
// import { Card, cn } from "../ui";

// export default function ReputationTab({ stats }: { stats: Stats }) {
//   const stars = Math.round(stats.feedbackScore);

//   return (
//     <div className="grid gap-6">
//       <Card
//         title="협업 평판"
//         desc="대시보드는 ‘작업 진행’, 여긴 ‘협업 품질’의 축적."
//       >
//         <div className="grid gap-4 sm:grid-cols-3">
//           <Metric
//             title="협업 세션"
//             value={`${stats.collabSessions}회`}
//             sub="최근 30일 기준 (TODO)"
//           />
//           <Metric
//             title="평균 응답"
//             value={`${stats.avgResponseMin}분`}
//             sub="멘션/요청 응답 (TODO)"
//           />
//           <Metric
//             title="피드백"
//             value={`${stats.feedbackScore.toFixed(1)} / 5`}
//             sub="팀원 평가 (TODO)"
//           />
//         </div>

//         <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
//           <div className="text-sm font-bold text-gray-900">피드백 요약</div>
//           <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
//             <span className="font-black">{stats.feedbackScore.toFixed(1)}</span>
//             <div className="flex gap-1">
//               {Array.from({ length: 5 }).map((_, i) => (
//                 <span
//                   key={i}
//                   className={cn(
//                     "text-lg leading-none",
//                     i < stars ? "text-gray-900" : "text-gray-300",
//                   )}
//                 >
//                   ★
//                 </span>
//               ))}
//             </div>
//           </div>
//           <div className="mt-3 text-xs text-gray-500">
//             TODO: 세션 종료 후 팀원 평가 저장해서 집계
//           </div>
//         </div>

//         <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
//           <div className="text-sm font-bold text-gray-900">최근 피드백</div>
//           <div className="mt-3 grid gap-2">
//             <FeedbackLine text="설명 깔끔해서 디버깅 속도가 빨랐어요." />
//             <FeedbackLine text="커밋 규칙을 잘 지켜서 충돌이 적었어요." />
//             <FeedbackLine text="코드 리뷰가 날카로웠는데 상처는 안 받았어요. 신기하네요." />
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }

// function Metric({
//   title,
//   value,
//   sub,
// }: {
//   title: string;
//   value: string;
//   sub?: string;
// }) {
//   return (
//     <div className="rounded-2xl border border-gray-200 bg-white p-4">
//       <div className="text-xs font-bold text-gray-500">{title}</div>
//       <div className="mt-1 text-xl font-black text-gray-900">{value}</div>
//       {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
//     </div>
//   );
// }

// function FeedbackLine({ text }: { text: string }) {
//   return (
//     <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
//       “{text}”
//     </div>
//   );
// }
