export type CommunityCategory = "Question" | "Free" | "Info" | "Showcase" | "AIHelp";

export type CommunityAttachment = {
  id: string;
  name: string;
  type: "image" | "file";
  url: string;
};

export type CommunityPost = {
  id: string;
  title: string;
  content: string;

  authorId: string;
  authorName: string;

  category: CommunityCategory;
  tags: string[];
  views: number;
  likes: number;
  createdAt: string;
  attachments?: CommunityAttachment[];
};