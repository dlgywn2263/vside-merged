"use client";

import { useRef, useState } from "react";
import { Paperclip, Tag, X, UploadCloud, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/components/community/CommunityUtil";
import { createPost, updatePost, uploadFile } from "@/lib/communityApi"; // 💡 uploadFile 임포트

interface PostEditorProps {
  mode: "create" | "edit";
  initialData?: any;
  postId?: number;
}

export default function PostEditor({ mode, initialData, postId }: PostEditorProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [category, setCategory] = useState(initialData?.category || "Question");
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [files, setFiles] = useState<File[]>([]); 

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (tags.includes(value)) return;
    setTags((prev) => [...prev, value]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  // 💡 백엔드로 데이터 전송 (작성 or 수정)
  const handleSubmit = async () => {
    const user = getCurrentUser();
    if (!user) return alert("로그인이 필요합니다.");
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.");

    setIsSubmitting(true);
    
    try {
      // 🚀 1. 선택된 파일들을 먼저 백엔드에 업로드해서 '진짜 URL'들을 받아옵니다.
      const attachmentRequests = await Promise.all(
        files.map(async (file) => {
          const realUrl = await uploadFile(file); // 백엔드 통신
          return {
            name: file.name,
            type: file.type.startsWith("image/") ? "image" : "file",
            url: realUrl // 💡 가짜 URL 대신 진짜 URL 삽입!
          };
        })
      );

      // 수정 모드일 때 기존에 있던 파일 데이터 보존을 위한 합치기 로직
      const existingAttachments = initialData?.attachments || [];
      const finalAttachments = [...existingAttachments, ...attachmentRequests];

      // 🚀 2. 받아온 진짜 URL들을 게시글 데이터에 담습니다.
      const postData = {
        title,
        content,
        category,
        tags,
        authorId: user.id,
        authorName: user.nickname ?? user.name ?? user.email ?? "사용자",
        attachments: finalAttachments.length > 0 ? finalAttachments : undefined
      };

      // 🚀 3. 게시글 최종 등록!
      if (mode === "create") {
        const newPostId = await createPost(postData);
        alert("성공적으로 등록되었습니다!");
        router.push(`/community/${newPostId}`);
      } else {
        await updatePost(postId!, postData);
        alert("성공적으로 수정되었습니다!");
        router.push(`/community/${postId}`);
      }
    } catch (error) {
      console.error(error);
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-[0_18px_45px_rgba(37,99,235,0.08)]">
      <div className="space-y-5">
        
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">카테고리</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full md:w-48 rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="Question">질문</option>
            <option value="Free">자유</option>
            <option value="Info">정보</option>
            <option value="AIHelp">AI 도움</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Tag size={16} className="text-blue-600" />
            태그
          </label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="예: React, 오류해결, AI"
              className="flex-1 rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              추가
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="rounded-full hover:bg-blue-200">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요. 코드나 에러 메시지도 함께 적어보세요."
            className="min-h-[300px] w-full resize-none rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Paperclip size={16} className="text-blue-600" />
            첨부 파일
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <UploadCloud size={32} className="mb-2 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">클릭해서 파일 업로드</span>
            <span className="mt-1 text-xs text-slate-500">이미지, 문서, 코드 파일 등을 첨부할 수 있어요</span>
          </button>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div key={file.name} className="flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm">
                  <span className="truncate text-slate-700">{file.name}</span>
                  <button type="button" onClick={() => removeFile(file.name)} className="text-slate-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
          <button 
            type="button" 
            onClick={() => router.back()} 
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === "create" ? "등록" : "수정"}
          </button>
        </div>

      </div>
    </div>
  );
}