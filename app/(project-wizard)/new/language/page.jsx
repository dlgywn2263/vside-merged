"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import WizardShell from "@/components/new/WizardShell";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";

const LANGS = [
  { key: "JAVA", label: "Java", icon: "☕" },
  { key: "JAVASCRIPT", label: "JavaScript", icon: "📜" },
  { key: "HTML", label: "HTML", icon: "🌐" },
  { key: "C", label: "C", icon: "©" },
  { key: "CPP", label: "C++", icon: "⚙️" },
  { key: "CSHARP", label: "C#", icon: "🎯" },
];

export default function Page() {
  const router = useRouter();

  const mode = useWorkspaceWizard((s) => s.mode);
  const language = useWorkspaceWizard((s) => s.language);
  const setLanguage = useWorkspaceWizard((s) => s.setLanguage);

  const goNext = () => {
    if (!language) return;
    router.push("/new/config");
  };

  const goBack = () => router.push("/new/workspace");

  useEffect(() => {
    if (!mode) {
      router.replace("/new/workspace");
    }
  }, [mode, router]);

  if (!mode) {
    return null;
  }

  return (
    <WizardShell>
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-4">
          <div className="rounded-2xl border border-gray-300 p-6 bg-white">
            <div className="font-semibold mb-4">최근 이용한 언어</div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setLanguage("JAVASCRIPT")}
                className="text-left px-4 py-3 rounded-xl border border-gray-300 hover:bg-blue-50 hover:border-blue-300"
              >
                JavaScript
              </button>
              <button
                type="button"
                className="text-left px-4 py-3 rounded-xl border border-gray-300 hover:bg-blue-50 hover:border-blue-300"
              >
                Python
              </button>
              <button
                type="button"
                className="text-left px-4 py-3 rounded-xl border border-gray-300 hover:bg-blue-50 hover:border-blue-300"
              >
                TypeScript
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-8 border border-gray-300 p-6 bg-white rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">
              언어 선택 <span className="text-red-500">*</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                placeholder="검색"
                className="border border-gray-300 rounded-lg px-3 py-2 w-100 hover:border-black"
              />
              <span className="text-gray-500">
                <Search />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {LANGS.map((l) => {
              const isSelected = language === l.key;

              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLanguage(l.key)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border transition ${
                    isSelected
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{l.icon}</div>
                    <div className="text-lg font-semibold">{l.label}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              onClick={goBack}
              className="px-6 py-2 rounded-lg border border-gray-300"
            >
              뒤로(B)
            </button>

            <button
              onClick={goNext}
              disabled={!language}
              className={`px-5 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-black hover:text-white ${
                !language
                  ? "opacity-50 cursor-not-allowed hover:bg-gray-300 hover:text-gray-700"
                  : ""
              }`}
            >
              다음(N)
            </button>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
