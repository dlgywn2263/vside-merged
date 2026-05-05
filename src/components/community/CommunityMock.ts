import { CommunityPost } from "./CommunityTypes";

export type UserSummary = {
  id: number;
  nickname: string;
  email: string;
};

export const mockPosts: CommunityPost[] = [
  {
    id: "1",
    title: "React 상태 관리 질문",
    content: "프로젝트가 커지니까 관리가 복잡해짐",
    authorId: "1",
    authorName: "신유",
    category: "Question",
    tags: ["React", "Frontend"],
    views: 124,
    likes: 12,
    createdAt: "2026-05-04",
  },
  {
    id: "2",
    title: "AI 코드 리뷰 기능 써본 후기",
    content: "AI가 코드 냄새를 잡아주는 기능을 테스트해봤는데 꽤 괜찮네요.",
    authorId: "2",
    authorName: "유후",
    category: "AIHelp",
    tags: ["AI", "CodeReview"],
    views: 88,
    likes: 9,
    createdAt: "2026-05-03",
  },
];