import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Heart,
  AlertTriangle,
  Pin,
  Flame,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Send,
  Eye,
  Tag,
  Smile,
  Globe,
  Lock,
  EyeOff,
  Clock,
  Play,
  Grid
} from 'lucide-react';
import { TimelinePost, PostComment, PostCategory, PrivacyLevel } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineViewProps {
  posts: TimelinePost[];
  comments: PostComment[];
  isAdmin: boolean;
  adminName: string;
  adminAvatar: string;
  onLikePost: (postId: string) => void;
  onIncrementViews: (postId: string) => void;
  onAddComment: (comment: Omit<PostComment, 'id' | 'timestamp' | 'likes' | 'isReported' | 'status'>) => void;
  onLikeComment: (commentId: string) => void;
  onReportComment: (commentId: string) => void;
  onOpenMedia: (mediaList: { type: 'image' | 'video'; url: string }[], index: number) => void;
  onEditPost?: (post: TimelinePost) => void;
  onDeletePost?: (postId: string) => void;
}

const CATEGORIES: PostCategory[] = [
  'Achievements',
  'Travel',
  'Career',
  'Education',
  'Certifications',
  'Projects',
  'Personal',
  'Events',
  'Memories',
];

const ANONYMOUS_ADJECTIVES = ['Creative', 'Swift', 'Bright', 'Mindful', 'Silent', 'Curious', 'Clever', 'Bold', 'Golden', 'Cosmic'];
const ANONYMOUS_NOUNS = ['Otter', 'Panda', 'Eagle', 'Fox', 'Koala', 'Owl', 'Wolf', 'Dolphin', 'Badger', 'Falcon'];
const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
];

export default function TimelineView({
  posts,
  comments,
  isAdmin,
  adminName,
  adminAvatar,
  onLikePost,
  onIncrementViews,
  onAddComment,
  onLikeComment,
  onReportComment,
  onOpenMedia,
  onEditPost,
  onDeletePost,
}: TimelineViewProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | 'All'>('All');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Photos' | 'Videos' | 'Achievements' | 'Travel' | 'Events' | 'Certifications'>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  
  // Interactions / UI States
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, { author: string; content: string }>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5); // lazy loading/infinite scroll simulation
  const [commentSorts, setCommentSorts] = useState<Record<string, 'newest' | 'oldest' | 'liked'>>({});

  // Helper to show a fast visual toast message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Generate anonymous nickname
  const generateAnonymousNickname = (postId: string) => {
    const adj = ANONYMOUS_ADJECTIVES[Math.floor(Math.random() * ANONYMOUS_ADJECTIVES.length)];
    const noun = ANONYMOUS_NOUNS[Math.floor(Math.random() * ANONYMOUS_NOUNS.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const name = `${adj} ${noun} #${num}`;
    
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        author: name,
      },
    }));
    triggerToast(`Generated identity: ${name}`);
  };

  // Copy link to clipboard
  const handleCopyLink = (postId: string) => {
    const fakeUrl = `${window.location.origin}/timeline/post/${postId}`;
    navigator.clipboard.writeText(fakeUrl).then(() => {
      triggerToast('Post link copied to clipboard!');
    }).catch(() => {
      triggerToast('Failed to copy. URL: ' + fakeUrl);
    });
  };

  const handleShare = (postTitle: string) => {
    if (navigator.share) {
      navigator.share({
        title: postTitle,
        text: `Check out this post: ${postTitle}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      triggerToast(`Shared: "${postTitle}" via simulated channel`);
    }
  };

  // Filter posts based on public view and search criteria
  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        // Privacy filter
        if (isAdmin) {
          // Admin sees everything
          return true;
        } else {
          // Public users only see Public posts (exclude drafts, scheduled, private, archived)
          return post.privacy === 'Public' && !post.isDraft;
        }
      })
      .filter((post) => {
        // Search filter
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;
        return (
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.location.toLowerCase().includes(query) ||
          post.tags.some((t) => t.toLowerCase().includes(query)) ||
          post.date.startsWith(query)
        );
      })
      .filter((post) => {
        // Category filter
        if (selectedCategory === 'All') return true;
        return post.category === selectedCategory;
      })
      .filter((post) => {
        // Toolbar filter
        if (selectedFilter === 'All') return true;
        if (selectedFilter === 'Photos') return post.media.some((m) => m.type === 'image');
        if (selectedFilter === 'Videos') return post.media.some((m) => m.type === 'video');
        if (selectedFilter === 'Achievements') return post.category === 'Achievements';
        if (selectedFilter === 'Travel') return post.category === 'Travel';
        if (selectedFilter === 'Events') return post.category === 'Events';
        if (selectedFilter === 'Certifications') return post.category === 'Certifications';
        return true;
      })
      .filter((post) => {
        // Year filter
        if (selectedYear === 'All') return true;
        return post.date.startsWith(selectedYear);
      })
      .sort((a, b) => {
        // Pinned posts always stay at the top if they are pinned, otherwise sort by date descending
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [posts, isAdmin, searchTerm, selectedCategory, selectedFilter, selectedYear]);

  // Unique years list for the filter select
  const years = useMemo(() => {
    const list = posts
      .filter((p) => isAdmin || p.privacy === 'Public')
      .map((p) => p.date.substring(0, 4));
    return ['All', ...Array.from(new Set(list))].sort((a, b) => b.localeCompare(a));
  }, [posts, isAdmin]);

  // Get comments for a specific post
  const getPostComments = (postId: string, sort: 'newest' | 'oldest' | 'liked' = 'newest') => {
    const list = comments.filter((c) => c.postId === postId && c.status === 'approved');
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      if (sort === 'liked') return b.likes - a.likes;
      if (sort === 'oldest') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // default newest
    });
  };

  const handlePostCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const input = commentInputs[postId];
    if (!input || !input.content.trim()) return;

    const authorName = input.author.trim() || 'Anonymous Explorer';
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    onAddComment({
      postId,
      postTitle: posts.find((p) => p.id === postId)?.title || 'Timeline Post',
      authorName,
      authorAvatar: randomColor,
      content: input.content.trim(),
    });

    // Clear inputs
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: {
        author: '',
        content: '',
      },
    }));

    triggerToast('Thank you! Your comment was posted successfully.');
  };

  const handleReplySubmit = (postId: string, parentComment: PostComment, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;

    // We can simulate nested replies by adding a post comment directed to the user
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    onAddComment({
      postId,
      postTitle: posts.find((p) => p.id === postId)?.title || 'Timeline Post',
      authorName: 'Anonymous Replier',
      authorAvatar: randomColor,
      content: `@${parentComment.authorName} ${replyInput.trim()}`,
    });

    setReplyInput('');
    setReplyingToCommentId(null);
    triggerToast('Reply posted successfully.');
  };

  // Group filtered posts by year for gorgeous separators
  const groupedPosts = useMemo(() => {
    const groups: Record<string, TimelinePost[]> = {};
    filteredPosts.forEach((post) => {
      const year = post.date.substring(0, 4);
      if (!groups[year]) groups[year] = [];
      groups[year].push(post);
    });
    return groups;
  }, [filteredPosts]);

  // Load more function
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
    triggerToast('Loading more milestones...');
  };

  return (
    <div id="timeline-layout" className="relative space-y-12">
      {/* Toast Notifier */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-amber-400 font-mono text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-slate-900 dark:text-amber-400 font-extrabold" />
            <span className="font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Toolbar Section */}
      <div id="timeline-filters" className="p-5 bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl space-y-4">
        {/* Row 1: Search & Year selection */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <input
              id="search-timeline"
              type="text"
              placeholder="Search achievements, locations, #tags, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-900 dark:focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 text-xs font-mono"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">Year:</span>
            {years.map((year) => (
              <button
                key={year}
                id={`year-btn-${year}`}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedYear === year
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:border-slate-300 dark:hover:text-slate-100 dark:hover:border-slate-700'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Categories Dropdown */}
        <div className="border-t border-slate-150 dark:border-slate-800/60 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 shrink-0">Category Filter:</span>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PostCategory | 'All')}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-250 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer shadow-xs min-w-[160px]"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Core Feature filters (Photos, Videos, etc.) */}
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80">
            {(['All', 'Photos', 'Videos', 'Achievements', 'Travel', 'Events', 'Certifications'] as const).map((filter) => (
              <button
                key={filter}
                id={`feature-filter-${filter}`}
                onClick={() => setSelectedFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono uppercase tracking-wider transition-all shrink-0 ${
                  selectedFilter === filter
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-amber-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Vertical Timeline */}
      {filteredPosts.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">No timeline entries found matching your search filters.</p>
          <button
            id="reset-filters"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setSelectedFilter('All');
              setSelectedYear('All');
            }}
            className="mt-4 text-xs font-mono font-bold text-slate-950 dark:text-amber-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div id="vertical-timeline-container" className="relative pl-0 md:pl-10 space-y-12">
          {/* Vertical Center Line - Hidden on Mobile for Facebook Timeline Look */}
          <div className="hidden md:block absolute left-[39px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-slate-300 via-slate-100 to-transparent dark:from-amber-500/50 dark:via-yellow-500/30 dark:to-transparent pointer-events-none" />

          {/* Grouped Entries */}
          {Object.entries(groupedPosts)
            .sort(([yA], [yB]) => yB.localeCompare(yA))
            .map(([year, yearPosts]) => (
              <div key={year} className="space-y-6 relative">
                {/* Year Separator Badge */}
                <div className="sticky top-20 z-10 ml-0 md:-ml-[10px] flex items-center gap-4 py-2">
                  <div className="bg-slate-900 dark:bg-slate-950 text-white dark:text-amber-400 border border-slate-300 dark:border-amber-500/30 px-4 py-1.5 rounded-full font-mono font-bold text-sm shadow-sm dark:shadow-lg backdrop-blur-md">
                    {year}
                  </div>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800/60" />
                </div>

                {/* Posts within this year */}
                <div className="space-y-8">
                  {(yearPosts as TimelinePost[]).slice(0, visibleCount).map((post) => {
                    const commentsList = getPostComments(post.id, commentSorts[post.id] || 'newest');
                    const isCommentsExpanded = expandedCommentsPostId === post.id;
                    const commentInput = commentInputs[post.id] || { author: '', content: '' };

                      return (
                      <motion.div
                        key={post.id}
                        id={`post-card-${post.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.4 }}
                        className="relative pl-0 md:pl-10 group"
                      >
                        {/* Bullet Marker Node (Visible on Desktop) */}
                        <div className="hidden md:flex absolute left-[-35px] top-6 w-5 h-5 rounded-full border-4 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-900 group-hover:bg-amber-400 dark:group-hover:bg-amber-400 transition-colors duration-200 items-center justify-center shadow-lg z-10">
                          {post.isPinned && <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-500/20" />}
                        </div>

                        {/* Timeline Main Card Content */}
                        <div className="bg-white dark:bg-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/60 transition-all duration-300 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl hover:shadow-md dark:hover:shadow-amber-950/5 hover:border-slate-300 dark:hover:border-slate-700/80">
                          
                          {/* Post Header (Facebook & Figma/Flutter Style) */}
                          <div className="flex items-center justify-between p-4 md:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/40">
                            <div className="flex items-center gap-3">
                              {/* Author Avatar circle */}
                              <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 flex items-center justify-center font-black font-mono shadow-xs border border-slate-200 dark:border-transparent text-sm shrink-0 overflow-hidden">
                                {adminAvatar ? (
                                  <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  adminName[0]?.toUpperCase() || 'J'
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white hover:underline cursor-pointer">
                                    {adminName}
                                  </span>
                                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-sans text-[8px] font-bold" title="Verified Author">
                                    ✓
                                  </span>
                                  {post.isPinned && (
                                    <span className="inline-flex items-center gap-0.5 bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                                      Pinned
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  <span>
                                    {new Date(post.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span title={post.privacy} className="flex items-center">
                                    {post.privacy === 'Public' ? <Globe className="w-3 h-3 text-slate-400" /> : <Lock className="w-3 h-3 text-slate-400" />}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Floating category badge on the right of header */}
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-100 dark:bg-amber-500/10 text-slate-800 dark:text-amber-400 border border-slate-200 dark:border-amber-500/20 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg">
                                {post.category}
                              </span>
                              {post.mood && (
                                <span className="hidden sm:inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-1 rounded-lg">
                                  {post.mood}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Banner cover image (if any) */}
                          {post.coverPhoto && (
                            <div className="relative h-48 md:h-64 overflow-hidden bg-slate-100 dark:bg-slate-950">
                              <img
                                src={post.coverPhoto}
                                alt={post.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-white/20 dark:from-slate-950 via-transparent to-transparent" />
                            </div>
                          )}

                          {/* Post Text & Gallery Body */}
                          <div className="p-4 md:p-6 space-y-4">
                            <div className="space-y-1">
                              {/* Location Line */}
                              {post.location && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{post.location}</span>
                                </div>
                              )}

                              <h3 className="text-lg md:text-xl font-bold font-sans text-slate-900 dark:text-white group-hover:text-slate-950 dark:group-hover:text-amber-400 transition-colors duration-200">
                                {post.title}
                              </h3>
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                              {post.description}
                            </p>

                            {/* Post Multiple media Gallery layout */}
                            {post.media && post.media.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                {post.media.map((item, idx) => (
                                  <div
                                    key={idx}
                                    id={`media-thumb-${post.id}-${idx}`}
                                    onClick={() => {
                                      onIncrementViews(post.id);
                                      onOpenMedia(post.media, idx);
                                    }}
                                    className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group/thumb bg-slate-50 dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-700 transition-all duration-200"
                                  >
                                    {item.type === 'video' ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                        <Play className="w-8 h-8 text-slate-900 dark:text-amber-400 fill-slate-900/10 dark:fill-amber-500/10 group-hover/thumb:scale-115 transition-transform" />
                                        <span className="text-[10px] font-mono mt-1 text-slate-400">Play Video</span>
                                      </div>
                                    ) : (
                                      <img
                                        src={item.url}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-slate-950/5 group-hover/thumb:bg-transparent transition-colors" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tags list */}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {post.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-950 dark:hover:text-amber-400 cursor-pointer transition-colors"
                                    onClick={() => setSearchTerm(`#${tag}`)}
                                  >
                                    <Tag className="w-3 h-3 text-slate-400" />
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Engagement Stat Indicators Row */}
                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5" title="Views">
                                  <Eye className="w-4 h-4 text-slate-400" />
                                  {post.views}
                                </span>
                                <button
                                  id={`like-post-${post.id}`}
                                  onClick={() => onLikePost(post.id)}
                                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group/like"
                                >
                                  <Heart className="w-4 h-4 text-slate-400 group-hover/like:text-rose-500 group-hover/like:fill-rose-500" />
                                  {post.likes}
                                </button>
                                <button
                                  id={`toggle-comments-${post.id}`}
                                  onClick={() => {
                                    setExpandedCommentsPostId(isCommentsExpanded ? null : post.id);
                                    onIncrementViews(post.id);
                                  }}
                                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-amber-400 transition-colors font-bold"
                                >
                                  <MessageSquare className="w-4 h-4 text-slate-400" />
                                  {commentsList.length} comments
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  id={`copy-link-${post.id}`}
                                  onClick={() => handleCopyLink(post.id)}
                                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all hover:border-slate-400 dark:hover:border-slate-700"
                                  title="Copy Link"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`share-post-${post.id}`}
                                  onClick={() => handleShare(post.title)}
                                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all hover:border-slate-400 dark:hover:border-slate-700"
                                  title="Share"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>

                                {isAdmin && (
                                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2 ml-1">
                                    <button
                                      id={`edit-post-${post.id}`}
                                      onClick={() => onEditPost?.(post)}
                                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-amber-950/50 hover:bg-slate-200 dark:hover:bg-amber-900/50 border border-slate-200 dark:border-amber-900/40 text-slate-900 dark:text-amber-400 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      id={`delete-post-${post.id}`}
                                      onClick={() => onDeletePost?.(post.id)}
                                      className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Comments Drawer section with high fidelity features */}
                          <AnimatePresence>
                            {isCommentsExpanded && (
                              <motion.div
                                id={`comments-drawer-${post.id}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
                              >
                                <div className="p-4 md:p-6 space-y-6">
                                  {/* Title & Comment Sorter */}
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold font-sans text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                      Comments ({commentsList.length})
                                    </h4>

                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
                                      {(['newest', 'oldest', 'liked'] as const).map((sort) => (
                                        <button
                                          key={sort}
                                          id={`comment-sort-${post.id}-${sort}`}
                                          onClick={() => setCommentSorts((prev) => ({ ...prev, [post.id]: sort }))}
                                          className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${
                                            (commentSorts[post.id] || 'newest') === sort
                                              ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-amber-400 font-bold shadow-xs'
                                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                          }`}
                                        >
                                          {sort === 'liked' ? 'Most Liked' : sort === 'oldest' ? 'Oldest' : 'Newest'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* List of Comments */}
                                  {commentsList.length === 0 ? (
                                    <p className="text-xs text-slate-500 font-mono py-4 text-center">
                                      No comments yet. Start the conversation below!
                                    </p>
                                  ) : (
                                    <div className="space-y-4">
                                      {commentsList.map((comment) => (
                                        <div
                                          key={comment.id}
                                          id={`comment-${comment.id}`}
                                          className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/20 space-y-2 relative transition-all ${
                                            comment.isPinned ? 'ring-1 ring-amber-500/30 bg-amber-500/2 dark:bg-amber-500/2' : ''
                                          }`}
                                        >
                                          {/* Pinned Indicator badge */}
                                          {comment.isPinned && (
                                            <div className="absolute top-2.5 right-3 flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-mono px-2 py-0.5 rounded">
                                              <Pin className="w-2.5 h-2.5 fill-amber-400/20" />
                                              Pinned Comment
                                            </div>
                                          )}

                                          {/* Header: Author & Timestamp */}
                                          <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${comment.authorAvatar}`}>
                                              {comment.authorName[0].toUpperCase()}
                                            </div>
                                            <div>
                                              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                                                {comment.authorName}
                                              </div>
                                              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(comment.timestamp).toLocaleDateString('en-US', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Comment Content */}
                                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-10">
                                            {comment.content}
                                          </p>

                                          {/* Actions: Like, Reply, Report */}
                                          <div className="flex items-center gap-4 pl-10 text-[10px] font-mono text-slate-500">
                                            <button
                                              id={`like-comment-${comment.id}`}
                                              onClick={() => onLikeComment(comment.id)}
                                              className="flex items-center gap-1 hover:text-rose-500 transition-colors"
                                            >
                                              <Heart className="w-3.5 h-3.5" />
                                              Like ({comment.likes})
                                            </button>
                                            
                                            <button
                                              id={`reply-comment-${comment.id}`}
                                              onClick={() => {
                                                setReplyingToCommentId(comment.id);
                                                setReplyInput('');
                                              }}
                                              className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-amber-400 transition-colors"
                                            >
                                              <CornerDownRight className="w-3.5 h-3.5" />
                                              Reply
                                            </button>

                                            <button
                                              id={`report-comment-${comment.id}`}
                                              onClick={() => {
                                                onReportComment(comment.id);
                                                triggerToast('Comment reported for moderation.');
                                              }}
                                              className="flex items-center gap-1 hover:text-amber-500 transition-colors ml-auto"
                                            >
                                              <AlertTriangle className="w-3.5 h-3.5 text-slate-400 hover:text-amber-500" />
                                              Report
                                            </button>
                                          </div>

                                          {/* Inline Reply Input */}
                                          {replyingToCommentId === comment.id && (
                                            <form
                                              onSubmit={(e) => handleReplySubmit(post.id, comment, e)}
                                              className="pl-10 pt-3 space-y-2 border-t border-slate-100 dark:border-slate-800/40"
                                            >
                                              <div className="flex gap-2">
                                                <input
                                                  id="reply-input"
                                                  type="text"
                                                  required
                                                  placeholder={`Reply to @${comment.authorName}...`}
                                                  value={replyInput}
                                                  onChange={(e) => setReplyInput(e.target.value)}
                                                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-amber-500"
                                                />
                                                <button
                                                  type="submit"
                                                  className="px-3 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 text-xs rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-all font-semibold"
                                                >
                                                  Post
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setReplyingToCommentId(null)}
                                                  className="px-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 text-xs"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </form>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Create New Comment form */}
                                  {!post.commentsDisabled ? (
                                    <form
                                      onSubmit={(e) => handlePostCommentSubmit(post.id, e)}
                                      className="space-y-3 bg-slate-100/40 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800/60"
                                    >
                                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                                        <div className="relative w-full sm:w-1/3">
                                          <input
                                            id={`comment-author-${post.id}`}
                                            type="text"
                                            placeholder="Nickname (e.g. Alex River)"
                                            value={commentInput.author}
                                            onChange={(e) =>
                                              setCommentInputs((prev) => ({
                                                ...prev,
                                                [post.id]: {
                                                  ...commentInput,
                                                  author: e.target.value,
                                                },
                                              }))
                                            }
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-900 dark:focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                                          />
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => generateAnonymousNickname(post.id)}
                                          className="text-[10px] font-mono font-bold text-slate-900 dark:text-amber-400 bg-slate-100 dark:bg-amber-500/10 hover:bg-slate-200 dark:hover:bg-amber-500/20 border border-slate-300 dark:border-amber-500/20 px-3 py-2 rounded-lg transition-all flex items-center gap-1 shrink-0"
                                        >
                                          <Smile className="w-3.5 h-3.5" />
                                          Generate Anon Nickname
                                        </button>
                                        <span className="hidden sm:inline text-xs font-mono text-slate-450 dark:text-slate-600">or type own</span>
                                      </div>

                                      <div className="relative">
                                        <textarea
                                          id={`comment-content-${post.id}`}
                                          required
                                          rows={2}
                                          placeholder="Join the discussion... Type your anonymous feedback respectfully."
                                          value={commentInput.content}
                                          onChange={(e) =>
                                            setCommentInputs((prev) => ({
                                              ...prev,
                                              [post.id]: {
                                                ...commentInput,
                                                content: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-900 dark:focus:border-amber-500 rounded-xl pl-4 pr-12 py-3 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all resize-none"
                                        />
                                        <button
                                          type="submit"
                                          id={`submit-comment-${post.id}`}
                                          className="absolute right-3.5 bottom-3 p-1.5 rounded-lg bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 active:scale-95 transition-all duration-150"
                                        >
                                          <Send className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="text-center py-4 bg-red-500/5 dark:bg-red-950/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-500 dark:text-red-400 font-mono text-xs">
                                      Commenting has been disabled for this specific timeline entry by the author.
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Infinite Scroll / Pagination Simulator Button */}
      {filteredPosts.length > visibleCount && (
        <div className="text-center pt-4">
          <button
            id="load-more-timeline"
            onClick={handleLoadMore}
            className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-medium font-sans text-xs hover:border-slate-400 dark:hover:border-slate-700 transition-all flex items-center gap-2 mx-auto"
          >
            Show More Milestones
            <ChevronDown className="w-4 h-4 text-slate-950 dark:text-amber-400" />
          </button>
        </div>
      )}
    </div>
  );
}
