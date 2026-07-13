/**
 * Types for My Timeline and Private Dashboard
 */

export type PostCategory =
  | 'Achievements'
  | 'Travel'
  | 'Career'
  | 'Education'
  | 'Certifications'
  | 'Projects'
  | 'Personal'
  | 'Events'
  | 'Memories';

export type PrivacyLevel = 'Public' | 'Private' | 'Unlisted' | 'Scheduled' | 'Archived';

export interface PostComment {
  id: string;
  postId: string;
  postTitle: string;
  authorName: string;
  authorAvatar: string; // custom avatar placeholder color or letter
  content: string;
  timestamp: string; // ISO string
  likes: number;
  isReported: boolean;
  status: 'approved' | 'pending' | 'hidden';
  isPinned?: boolean;
}

export interface TimelinePost {
  id: string;
  title: string;
  description: string;
  category: PostCategory;
  date: string; // YYYY-MM-DD
  location: string;
  tags: string[];
  privacy: PrivacyLevel;
  coverPhoto: string;
  media: {
    type: 'image' | 'video';
    url: string;
  }[];
  mood?: string;
  isPinned?: boolean;
  featuredOrder?: number;
  isDraft?: boolean;
  
  // Engagement
  views: number;
  likes: number;
  shareCount: number;
  commentsDisabled?: boolean;
  publishDate?: string; // for scheduled posts
}

export interface DashboardStats {
  totalPosts: number;
  photos: number;
  videos: number;
  achievements: number;
  countriesVisited: number;
  totalComments: number;
  postViews: number;
  draftPosts: number;
}

export interface SystemNotification {
  id: string;
  type: 'comment' | 'report' | 'scheduled_published' | 'upload_fail';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  postId?: string;
  commentId?: string;
}

export interface VisitorStat {
  date: string; // YYYY-MM
  views: number;
  visitors: number;
}
