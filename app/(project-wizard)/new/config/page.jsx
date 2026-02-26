// 새 프로젝트 구성
"use client";

import { useRouter } from "next/navigation";
import { Folder } from "lucide-react";

import WizardShell from "@/components/new/WizardShell";
import WizardHeader from "@/components/layout/WizardHeader";

export default function Page() {
  const router = useRouter();
  const goCreate = () => router.push("/ide"); // IDE로 이동 (필요에 맞게 바꾸기)
  const goBack = () => router.push("/new/language");

  return (
    <>
      <WizardShell>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-300 p-8">
            <div className="inline-block px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-sm mb-6">
              JavaScript
            </div>

            <label className="block mb-4">
              <div className="text-sm text-gray-600 mb-2">프로젝트 이름(J)</div>
              <input
                className="w-full bg-gray-100  rounded-lg px-3 py-2  "
                defaultValue="56655"
              />
            </label>

            <label className="block mb-4">
              <div className="text-sm text-gray-600 mb-2">프로젝트 설명</div>
              <input
                className="w-full bg-gray-100 rounded-lg px-3 py-2"
                defaultValue="56655"
              />
            </label>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="font-semibold mb-2">GitHub 저장소 (선택사항)</div>
              <div className="text-sm text-gray-600 mb-3">
                기존 GitHub 저장소와 연결하거나 비워두고 나중에 연결할 수
                있습니다
              </div>
              <input
                className="w-full  bg-gray-100 rounded-lg px-3 py-2"
                placeholder="https://github.com/username/repository"
              />
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={goBack}
                className="px-5 py-2 rounded-lg  border-gray-300 border"
              >
                뒤로(B)
              </button>
              <button
                onClick={goCreate}
                className="px-5 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-black hover:text-white"
              >
                만들기(C)
              </button>
            </div>
          </div>
        </div>
      </WizardShell>
    </>
  );
}
