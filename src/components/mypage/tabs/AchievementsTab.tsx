// "use client";

// import type { Achievement } from "../types";
// import { Card, EmptyLine, cn, formatKST } from "../ui";

// export default function AchievementsTab({ items }: { items: Achievement[] }) {
//   const earned = items.filter((a) => a.earnedAt);
//   const locked = items.filter((a) => !a.earnedAt);

//   return (
//     <div className="grid gap-6">
//       <Card title="업적" desc="달성 기록.">
//         <div className="grid gap-6">
//           <div>
//             <div className="text-sm font-bold text-gray-900">획득</div>
//             <div className="mt-3 grid gap-3">
//               {earned.map((a) => (
//                 <AchievementRow key={a.id} a={a} />
//               ))}
//               {earned.length === 0 ? (
//                 <EmptyLine text="아직 획득한 업적이 없습니다." />
//               ) : null}
//             </div>
//           </div>

//           <div>
//             <div className="text-sm font-bold text-gray-900">미획득</div>
//             <div className="mt-3 grid gap-3">
//               {locked.map((a) => (
//                 <AchievementRow key={a.id} a={a} />
//               ))}
//               {locked.length === 0 ? (
//                 <EmptyLine text="모든 업적을 획득했습니다." />
//               ) : null}
//             </div>
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }

// function AchievementRow({ a }: { a: Achievement }) {
//   const earned = !!a.earnedAt;

//   return (
//     <div
//       className={cn(
//         "rounded-2xl border px-4 py-3",
//         earned ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50",
//       )}
//     >
//       <div className="flex items-start justify-between gap-3">
//         <div>
//           <div className="text-sm font-black text-gray-900">{a.title}</div>
//           <div className="mt-1 text-xs text-gray-500">{a.desc}</div>
//           {earned ? (
//             <div className="mt-2 text-xs font-semibold text-gray-700">
//               획득일: {formatKST(a.earnedAt!)}
//             </div>
//           ) : (
//             <div className="mt-2 text-xs font-semibold text-gray-500">
//               미획득
//             </div>
//           )}
//         </div>

//         <span
//           className={cn(
//             "inline-flex rounded-full px-3 py-1 text-xs font-bold",
//             earned ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700",
//           )}
//         >
//           {earned ? "EARNED" : "LOCKED"}
//         </span>
//       </div>
//     </div>
//   );
// }
