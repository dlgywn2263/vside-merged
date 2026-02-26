// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import Link from "next/link";
// import {
//   MoreVertical,
//   Settings,
//   Trash2,
//   Info,
//   FolderOpen,
//   UsersRound,
// } from "lucide-react";
// import { WorkspaceSettingsModal } from "@/components/workspace/WorkspaceSettingsModal";
// import { InviteMemberModal } from "@/components/workspace/InviteMemberModal";

// /**
//  * TODO (BACKEND)
//  * - GET /api/workspaces/recent
//  * - 로그인 유저 기준, updatedAt DESC, limit 6~10
//  */

// type RecentProject = {
//   id: string;
//   name: string;
//   language: string;
//   updatedAt: string; // 2026.01.05
//   mode?: "team" | "personal";
//   description?: string;
// };

// const MOCK: RecentProject[] = [
//   {
//     id: "p1",
//     name: "Portfolio Website",
//     language: "TypeScript",
//     updatedAt: "2026.01.05",
//     mode: "team",
//     description: "React와 TypeScript를 활용한 포트폴리오 웹사이트",
//   },
//   {
//     id: "p2",
//     name: "VSIDE Dashboard",
//     language: "Next.js",
//     updatedAt: "2026.02.06",
//     mode: "personal",
//     description: "대시보드 UI/라우팅 정리",
//   },
//   {
//     id: "p3",
//     name: "VSIDE Dashboard",
//     language: "Next.js",
//     updatedAt: "2026.02.06",
//     mode: "personal",
//     description: "대시보드 UI/라우팅 정리",
//   },
// ];

// function LanguageBadge({ value }: { value: string }) {
//   return (
//     <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
//       {value}
//     </span>
//   );
// }

// function ProjectIcon() {
//   return (
//     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
//       <UsersRound size={18} />
//     </div>
//   );
// }

// function useOnClickOutside<T extends HTMLElement>(
//   ref: React.RefObject<T>,
//   handler: () => void,
// ) {
//   useEffect(() => {
//     const listener = (e: MouseEvent) => {
//       if (!ref.current) return;
//       if (ref.current.contains(e.target as Node)) return;
//       handler();
//     };
//     document.addEventListener("mousedown", listener);
//     return () => document.removeEventListener("mousedown", listener);
//   }, [ref, handler]);
// }

// export function RecentWorkList() {
//   // TODO (BACKEND): MOCK -> fetch 결과로 교체
//   const projects = useMemo(() => MOCK, []);

//   const [openMenuId, setOpenMenuId] = useState<string | null>(null);

//   // ✅ 모달 상태 (요구사항: 초대 모달은 단독으로 떠야 함)
//   const [settingsOpen, setSettingsOpen] = useState(false);
//   const [inviteOpen, setInviteOpen] = useState(false);

//   // ✅ 초대 모달 닫으면 설정으로 돌아가기 위해 기억
//   const [returnToSettingsAfterInvite, setReturnToSettingsAfterInvite] =
//     useState(false);

//   const [selected, setSelected] = useState<RecentProject | null>(null);

//   const menuRef = useRef<HTMLDivElement | null>(null);
//   useOnClickOutside(menuRef, () => setOpenMenuId(null));

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         setOpenMenuId(null);
//         setInviteOpen(false);
//         setSettingsOpen(false);
//         setReturnToSettingsAfterInvite(false);
//       }
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, []);

//   const openSettings = (p: RecentProject) => {
//     setSelected(p);
//     setOpenMenuId(null);
//     setSettingsOpen(true);
//   };

//   const openInviteOnly = () => {
//     // ✅ 설정 모달은 숨기고, 초대 모달만 단독 표시
//     setReturnToSettingsAfterInvite(true);
//     setSettingsOpen(false);
//     setInviteOpen(true);
//   };

//   const closeInvite = () => {
//     setInviteOpen(false);
//     // ✅ 닫으면 설정 모달로 복귀
//     if (returnToSettingsAfterInvite) {
//       setSettingsOpen(true);
//     }
//     setReturnToSettingsAfterInvite(false);
//   };
//   // ✅ 모달 열릴 때 body 스크롤 잠금
//   useEffect(() => {
//     const isModalOpen = settingsOpen || inviteOpen;
//     if (!isModalOpen) return;

//     const originalOverflow = document.body.style.overflow;
//     const originalPaddingRight = document.body.style.paddingRight;

//     // 스크롤바 폭만큼 패딩을 줘서 레이아웃이 흔들리는 것 방지
//     const scrollbarWidth =
//       window.innerWidth - document.documentElement.clientWidth;

//     document.body.style.overflow = "hidden";
//     if (scrollbarWidth > 0) {
//       document.body.style.paddingRight = `${scrollbarWidth}px`;
//     }

//     return () => {
//       document.body.style.overflow = originalOverflow;
//       document.body.style.paddingRight = originalPaddingRight;
//     };
//   }, [settingsOpen, inviteOpen]);

//   return (
//     <>
//       <div className="space-y-3">
//         {projects.map((p) => (
//           <div
//             key={p.id}
//             className="relative rounded-2xl border border-gray-200 bg-white px-5 py-4 "
//           >
//             <div className="flex items-center justify-between gap-4">
//               <div className="flex items-center gap-4 min-w-0">
//                 <ProjectIcon />

//                 <div className="min-w-0">
//                   <div className="flex items-center gap-3">
//                     <Link
//                       href={`/workspace/${p.id}`}
//                       className="truncate text-base font-semibold text-gray-900 hover:underline underline-offset-4"
//                     >
//                       {p.name}
//                     </Link>
//                     <LanguageBadge value={p.language} />
//                   </div>

//                   <p className="mt-1 text-sm text-gray-500">
//                     최근 수정 날짜 : {p.updatedAt}
//                   </p>
//                 </div>
//               </div>

//               <div
//                 className="relative"
//                 ref={openMenuId === p.id ? menuRef : null}
//               >
//                 <button
//                   type="button"
//                   className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100"
//                   aria-label="프로젝트 메뉴"
//                   onClick={() =>
//                     setOpenMenuId((cur) => (cur === p.id ? null : p.id))
//                   }
//                 >
//                   <MoreVertical className="text-gray-600" size={18} />
//                 </button>

//                 {openMenuId === p.id && (
//                   <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
//                     <button
//                       type="button"
//                       className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
//                       onClick={() => {
//                         setOpenMenuId(null);
//                         // TODO (BACKEND): 상세 정보 페이지/모달 연결
//                         console.log("detail:", p.id);
//                       }}
//                     >
//                       <Info size={16} className="text-gray-500" />
//                       상세 정보
//                     </button>

//                     <Link
//                       href={`/workspace/${p.id}`}
//                       className="block px-4 py-2.5 text-sm hover:bg-gray-50"
//                       onClick={() => setOpenMenuId(null)}
//                     >
//                       <span className="flex items-center gap-2">
//                         <FolderOpen size={16} className="text-gray-500" />
//                         프로젝트 열기
//                       </span>
//                     </Link>

//                     <button
//                       type="button"
//                       className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
//                       onClick={() => openSettings(p)}
//                     >
//                       <Settings size={16} className="text-gray-500" />
//                       프로젝트 설정
//                     </button>

//                     <div className="h-px bg-gray-100" />

//                     <button
//                       type="button"
//                       className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
//                       onClick={() => {
//                         setOpenMenuId(null);
//                         // TODO (BACKEND): DELETE /api/workspaces/:id
//                         console.log("delete:", p.id);
//                       }}
//                     >
//                       <Trash2 size={16} className="text-red-600" />
//                       프로젝트 삭제
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* 설정 모달 */}
//       <WorkspaceSettingsModal
//         open={settingsOpen}
//         workspace={
//           selected
//             ? {
//                 id: selected.id,
//                 name: selected.name,
//                 description: selected.description ?? "",
//               }
//             : null
//         }
//         onClose={() => setSettingsOpen(false)}
//         onClickInvite={openInviteOnly}
//         onSave={(payload) => {
//           /**
//            * TODO (BACKEND)
//            * PATCH /api/workspaces/:id
//            * body: { name, description }
//            */
//           console.log("save settings:", payload);
//           setSettingsOpen(false);
//         }}
//         onDelete={() => {
//           /**
//            * TODO (BACKEND)
//            * DELETE /api/workspaces/:id
//            */
//           console.log("delete workspace:", selected?.id);
//           setSettingsOpen(false);
//           setInviteOpen(false);
//           setReturnToSettingsAfterInvite(false);
//         }}
//       />

//       {/* 초대 모달 (단독 표시) */}
//       <InviteMemberModal
//         open={inviteOpen}
//         workspaceId={selected?.id ?? ""}
//         onClose={closeInvite}
//         onSendInvite={(payload) => {
//           /**
//            * TODO (BACKEND)
//            * POST /api/workspaces/:id/invites
//            * body: { email, role }
//            */
//           console.log("send invite:", payload);
//         }}
//       />
//     </>
//   );
// }
