// "use client";

// import { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { VscClose, VscChevronLeft } from "react-icons/vsc";
// import { DiJava, DiPython, DiJsBadge, DiHtml5 } from "react-icons/di";

// import { closeProjectModal, writeToTerminal } from "@/store/slices/uiSlice";
// import {
//   setProjectList,
//   setWorkspaceTree,
//   setActiveProject,
// } from "@/store/slices/fileSystemSlice";
// import {
//   createProjectInWorkspaceApi,
//   fetchWorkspaceProjectsApi,
// } from "@/lib/ide/api";

// export default function CreateProjectModal() {
//   const dispatch = useDispatch();
//   const { isProjectModalVisible } = useSelector((state) => state.ui);
//   const { workspaceId } = useSelector((state) => state.fileSystem);

//   const [step, setStep] = useState(1);
//   const [selectedLang, setSelectedLang] = useState(null);
//   const [formData, setFormData] = useState({
//     name: "",
//     description: "",
//     gitUrl: "",
//   });

//   if (!isProjectModalVisible) return null;

//   const languages = [
//     {
//       id: "JAVA",
//       name: "Java",
//       icon: <DiJava size={40} color="#E76F00" />,
//       desc: "Spring Boot, General Java",
//     },
//     {
//       id: "JAVASCRIPT",
//       name: "JavaScript",
//       icon: <DiJsBadge size={40} color="#F7DF1E" />,
//       desc: "Node.js, React, Vanilla",
//     },
//     {
//       id: "PYTHON",
//       name: "Python",
//       icon: <DiPython size={40} color="#3776AB" />,
//       desc: "Django, Flask, Scripts",
//     },
//     {
//       id: "HTML",
//       name: "HTML/CSS",
//       icon: <DiHtml5 size={40} color="#E34F26" />,
//       desc: "Static Websites",
//     },
//     {
//       id: "CPP",
//       name: "C++",
//       icon: <div className="text-2xl font-bold text-blue-600">C++</div>,
//       desc: "System Programming",
//     },
//   ];

//   const handleNext = () => {
//     if (!selectedLang) return alert("언어를 선택해주세요.");
//     setStep(2);
//   };

//   const handleSubmit = async () => {
//     if (!formData.name) return alert("프로젝트 이름을 입력해주세요.");

//     try {
//       await createProjectInWorkspaceApi(
//         workspaceId,
//         formData.name,
//         selectedLang,
//         formData.description,
//         formData.gitUrl,
//       );

//       dispatch(
//         writeToTerminal(
//           `[System] Project '${formData.name}' created successfully.\n`,
//         ),
//       );

//       const projectsRoot = await fetchWorkspaceProjectsApi(workspaceId);

//       dispatch(setProjectList(projectsRoot.children || []));
//       dispatch(setWorkspaceTree(projectsRoot));
//       dispatch(setActiveProject(formData.name));
//       dispatch(
//         writeToTerminal(
//           `[System] 시작 프로젝트가 변경되었습니다: ${formData.name}\n`,
//         ),
//       );

//       dispatch(closeProjectModal());
//       setStep(1);
//       setFormData({ name: "", description: "", gitUrl: "" });
//       setSelectedLang(null);
//     } catch (e) {
//       alert("생성 실패: " + e.message);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm font-sans animate-fade-in">
//       <div className="bg-white rounded-xl shadow-2xl w-[700px] h-[500px] flex flex-col overflow-hidden">
//         <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between shrink-0">
//           <div className="flex items-center gap-3">
//             {step === 2 && (
//               <button
//                 onClick={() => setStep(1)}
//                 className="p-1 hover:bg-gray-100 rounded-full transition"
//               >
//                 <VscChevronLeft />
//               </button>
//             )}
//             <div>
//               <h2 className="text-lg font-bold text-gray-800">
//                 {step === 1 ? "새 프로젝트 만들기" : "새 프로젝트 구성"}
//               </h2>
//               <p className="text-xs text-gray-400">
//                 {step === 1
//                   ? "프로젝트에서 사용할 주 언어를 선택하세요"
//                   : "프로젝트 세부 설정을 완료하세요"}
//               </p>
//             </div>
//           </div>
//           <button onClick={() => dispatch(closeProjectModal())}>
//             <VscClose size={24} className="text-gray-400 hover:text-black" />
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa]">
//           {step === 1 ? (
//             <div className="grid grid-cols-1 gap-3">
//               <label className="text-xs font-bold text-gray-500 mb-1 block">
//                 언어 선택 *
//               </label>
//               {languages.map((lang) => (
//                 <div
//                   key={lang.id}
//                   onClick={() => setSelectedLang(lang.id)}
//                   className={`flex items-center p-4 bg-white border rounded-xl cursor-pointer transition-all hover:shadow-md ${
//                     selectedLang === lang.id
//                       ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
//                       : "border-gray-200 hover:border-blue-300"
//                   }`}
//                 >
//                   <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full mr-4 shrink-0">
//                     {lang.icon}
//                   </div>
//                   <div>
//                     <div className="font-bold text-gray-800">{lang.name}</div>
//                     <div className="text-xs text-gray-400">{lang.desc}</div>
//                   </div>
//                   {selectedLang === lang.id && (
//                     <div className="ml-auto text-blue-500 font-bold text-sm">
//                       Selected
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="space-y-6">
//               <div className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold mb-2">
//                 {languages.find((l) => l.id === selectedLang)?.name}
//               </div>
//               <div>
//                 <label className="block text-sm font-bold text-gray-700 mb-2">
//                   프로젝트 이름(J)
//                 </label>
//                 <input
//                   autoFocus
//                   className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
//                   value={formData.name}
//                   onChange={(e) =>
//                     setFormData({ ...formData, name: e.target.value })
//                   }
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-bold text-gray-700 mb-2">
//                   프로젝트 설명
//                 </label>
//                 <input
//                   className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
//                   value={formData.description}
//                   onChange={(e) =>
//                     setFormData({ ...formData, description: e.target.value })
//                   }
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-bold text-gray-700 mb-2">
//                   GitHub 저장소 (선택사항)
//                 </label>
//                 <p className="text-xs text-gray-400 mb-2">
//                   기존 GitHub 저장소와 연결하거나 비워두고 나중에 연결할 수
//                   있습니다
//                 </p>
//                 <input
//                   className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition placeholder-gray-300"
//                   placeholder="https://github.com/username/repository"
//                   value={formData.gitUrl}
//                   onChange={(e) =>
//                     setFormData({ ...formData, gitUrl: e.target.value })
//                   }
//                 />
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="h-16 px-8 border-t border-gray-200 bg-white flex items-center justify-end gap-3 shrink-0">
//           {step === 1 ? (
//             <>
//               <button
//                 onClick={() => dispatch(closeProjectModal())}
//                 className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
//               >
//                 취소
//               </button>
//               <button
//                 onClick={handleNext}
//                 className="px-5 py-2 rounded-lg bg-[#333] text-white text-sm font-bold hover:bg-black transition"
//               >
//                 다음(N)
//               </button>
//             </>
//           ) : (
//             <>
//               <button
//                 onClick={() => setStep(1)}
//                 className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
//               >
//                 뒤로(B)
//               </button>
//               <button
//                 onClick={handleSubmit}
//                 className="px-5 py-2 rounded-lg bg-[#333] text-white text-sm font-bold hover:bg-black transition"
//               >
//                 생성 완료
//               </button>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
