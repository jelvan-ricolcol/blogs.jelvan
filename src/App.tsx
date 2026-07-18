import { useState, useEffect } from 'react';
import { Sparkles, ShieldAlert, Heart, Calendar, Globe, Layers, MessageSquare, Sun, Moon, ExternalLink, Mail } from 'lucide-react';
import { TimelinePost, PostComment, SystemNotification, VisitorStat } from './types';
import { INITIAL_POSTS, INITIAL_COMMENTS, INITIAL_NOTIFICATIONS, VISITOR_STATS, OFFENSIVE_WORDS } from './data/initialData';
import TimelineView from './components/TimelineView';
import DashboardView from './components/DashboardView';
import PostFormModal from './components/PostFormModal';
import MediaLightbox from './components/MediaLightbox';
import { motion, AnimatePresence } from 'motion/react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '简体中文' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' }
];

const TRANSLATIONS: Record<string, { timeline: string; dashboard: string; copyright: string; language: string; portfolio: string }> = {
  en: {
    timeline: 'PUBLIC',
    dashboard: 'Dashboard',
    copyright: 'All rights reserved.',
    language: 'Language',
    portfolio: 'Jelvan® Portfolio'
  },
  es: {
    timeline: 'PÚBLICO',
    dashboard: 'Panel de Control',
    copyright: 'Todos los derechos reservados.',
    language: 'Idioma',
    portfolio: 'Portafolio de Jelvan®'
  },
  fr: {
    timeline: 'PUBLIC',
    dashboard: 'Tableau de bord',
    copyright: 'Tous droits réservés.',
    language: 'Langue',
    portfolio: 'Portfolio de Jelvan®'
  },
  de: {
    timeline: 'ÖFFENTLICH',
    dashboard: 'Dashboard',
    copyright: 'Alle Rechte vorbehalten.',
    language: 'Sprache',
    portfolio: 'Jelvan® Portfolio'
  },
  it: {
    timeline: 'PUBBLICO',
    dashboard: 'Cruscotto',
    copyright: 'Tutti i diritti riservati.',
    language: 'Lingua',
    portfolio: 'Portfolio di Jelvan®'
  },
  pt: {
    timeline: 'PÚBLICO',
    dashboard: 'Painel',
    copyright: 'Todos os direitos reservados.',
    language: 'Idioma',
    portfolio: 'Portfólio de Jelvan®'
  },
  ja: {
    timeline: '公開タイムライン',
    dashboard: 'ダッシュボード',
    copyright: '著作権所有。',
    language: '言語',
    portfolio: 'Jelvan® ポートフォリオ'
  },
  ko: {
    timeline: '공개 타임라인',
    dashboard: '대시보드',
    copyright: '모든 권리 보유.',
    language: '언어',
    portfolio: 'Jelvan® 포트폴리오'
  },
  zh: {
    timeline: '公开时间线',
    dashboard: '控制台',
    copyright: '保留所有权利。',
    language: '语言',
    portfolio: 'Jelvan® 个人作品集'
  },
  ru: {
    timeline: 'ПУБЛИЧНЫЙ',
    dashboard: 'Панель управления',
    copyright: 'Все права защищены.',
    language: 'Язык',
    portfolio: 'Портфолио Jelvan®'
  },
  ar: {
    timeline: 'العامة',
    dashboard: 'لوحة التحكم',
    copyright: 'جميع الحقوق محفوظة.',
    language: 'اللغة',
    portfolio: 'معرض Jelvan®'
  }
};

export default function App() {
  // --- Core Theme State ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light'; // default to elegant light mode
  });

  // --- Language State ---
  const [language, setLanguage] = useState<string>(() => {
    const saved = localStorage.getItem('timeline_language');
    return saved && LANGUAGES.some(l => l.code === saved) ? saved : 'en';
  });

  // --- Core Persistent State ---
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [offensiveWords, setOffensiveWords] = useState<string[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStat[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState(() => {
    return localStorage.getItem('timeline_admin_name') || 'Jelvan';
  });
  const [adminAvatar, setAdminAvatar] = useState(() => {
    return localStorage.getItem('timeline_admin_avatar') || '';
  });

  // --- Modal & Navigation States ---
  const [activeTab, setActiveTab] = useState<'timeline' | 'dashboard'>('timeline');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<TimelinePost | null>(null);
  
  // Lightbox States
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ type: 'image' | 'video'; url: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- Initialize and Hydrate from API & LocalStorage ---
  const fetchTimelineData = async () => {
    try {
      const postsRes = await fetch('/api/posts?limit=100');
      if (postsRes.ok) {
        const fetchedPosts: any = await postsRes.json();
        if (fetchedPosts && fetchedPosts.length > 0) {
          setPosts(fetchedPosts);
          localStorage.setItem('timeline_posts', JSON.stringify(fetchedPosts));
        }
      }

      const commentsRes = await fetch('/api/comments?limit=200');
      if (commentsRes.ok) {
        const fetchedComments: any = await commentsRes.json();
        if (fetchedComments && fetchedComments.comments) {
          setComments(fetchedComments.comments);
          localStorage.setItem('timeline_comments', JSON.stringify(fetchedComments.comments));
        }
      }
    } catch (e) {
      console.error('Failed to sync with cloud:', e);
    }
  };

  useEffect(() => {
    // Posts
    const storedPosts = localStorage.getItem('timeline_posts');
    if (storedPosts) {
      setPosts(JSON.parse(storedPosts));
    } else {
      setPosts(INITIAL_POSTS);
      // Wait to save until fetch syncs
    }

    // Comments
    const storedComments = localStorage.getItem('timeline_comments');
    if (storedComments) {
      setComments(JSON.parse(storedComments));
    } else {
      setComments(INITIAL_COMMENTS);
    }

    // Notifications
    const storedNotifs = localStorage.getItem('timeline_notifications');
    if (storedNotifs) {
      setNotifications(JSON.parse(storedNotifs));
    } else {
      setNotifications(INITIAL_NOTIFICATIONS);
      localStorage.setItem('timeline_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    }

    // Offensive words
    const storedWords = localStorage.getItem('timeline_offensive_words');
    if (storedWords) {
      setOffensiveWords(JSON.parse(storedWords));
    } else {
      setOffensiveWords(OFFENSIVE_WORDS);
      localStorage.setItem('timeline_offensive_words', JSON.stringify(OFFENSIVE_WORDS));
    }

    // Visitor Stats
    const storedStats = localStorage.getItem('timeline_visitor_stats');
    if (storedStats) {
      setVisitorStats(JSON.parse(storedStats));
    } else {
      setVisitorStats(VISITOR_STATS);
      localStorage.setItem('timeline_visitor_stats', JSON.stringify(VISITOR_STATS));
    }

    // Admin Auth State
    const sessionAuth = sessionStorage.getItem('timeline_admin_authenticated');
    if (sessionAuth === 'true') {
      setIsAdmin(true);
    }

    fetchTimelineData();
    const intervalId = setInterval(fetchTimelineData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Update DOM class and store preference
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // --- State Synchronization helper ---
  const savePosts = (newPosts: TimelinePost[]) => {
    setPosts(newPosts);
    localStorage.setItem('timeline_posts', JSON.stringify(newPosts));
  };

  const saveComments = (newComments: PostComment[]) => {
    setComments(newComments);
    localStorage.setItem('timeline_comments', JSON.stringify(newComments));
  };

  const saveNotifications = (newNotifs: SystemNotification[]) => {
    setNotifications(newNotifs);
    localStorage.setItem('timeline_notifications', JSON.stringify(newNotifs));
  };

  const saveOffensiveWords = (newWords: string[]) => {
    setOffensiveWords(newWords);
    localStorage.setItem('timeline_offensive_words', JSON.stringify(newWords));
  };

  // --- Admin Authentication triggers ---
  const handleLogin = (token: string, user: any): boolean => {
    setIsAdmin(true);
    sessionStorage.setItem('timeline_admin_authenticated', 'true');
    sessionStorage.setItem('token', token);
    return true;
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('timeline_admin_authenticated');
    setActiveTab('timeline');
  };

  // --- Timeline Actions (Posts) ---
  const getAuthHeader = () => {
    const masterPassword = 
      (import.meta as any).env?.VITE_ADMIN_PASSWORD || 
      localStorage.getItem('timeline_admin_password') || 
      'admin123';
    return 'Bearer ' + masterPassword;
  };

  const handleLikePost = async (postId: string) => {
    const updated = posts.map((post) => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    });
    savePosts(updated);
    try {
      await fetch(`/api/posts?id=${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleIncrementViews = async (postId: string) => {
    const updated = posts.map((post) => {
      if (post.id === postId) {
        return { ...post, views: post.views + 1 };
      }
      return post;
    });
    savePosts(updated);
    try {
      await fetch(`/api/posts?id=${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePost = async (newOrEditedPost: Omit<TimelinePost, 'views' | 'likes' | 'shareCount'>) => {
    const exists = posts.find((p) => p.id === newOrEditedPost.id);
    let updated: TimelinePost[];
    
    let fullPost: TimelinePost;
    if (exists) {
      fullPost = { ...exists, ...newOrEditedPost };
      updated = posts.map((post) => post.id === newOrEditedPost.id ? fullPost : post);
    } else {
      fullPost = {
        ...newOrEditedPost,
        views: 0,
        likes: 0,
        shareCount: 0,
      };
      updated = [fullPost, ...posts];
    }

    savePosts(updated);
    setIsPostModalOpen(false);
    setEditingPost(null);

    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': getAuthHeader() },
        body: JSON.stringify(fullPost)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const updated = posts.filter((p) => p.id !== postId);
    savePosts(updated);
    try {
      await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
    } catch (e) {
      console.error(e);
    }
  };

  // --- Comment Actions & Moderation ---
  const handleAddComment = async (commentData: Omit<PostComment, 'id' | 'timestamp' | 'likes' | 'isReported' | 'status'>) => {
    // Word Filter
    const contentLower = commentData.content.toLowerCase();
    const containsOffensive = offensiveWords.some((word) => contentLower.includes(word));
    
    const newComment: PostComment = {
      id: 'comment_' + Date.now(),
      ...commentData,
      timestamp: new Date().toISOString(),
      likes: 0,
      isReported: containsOffensive,
      status: containsOffensive ? 'pending' : 'approved',
    };

    const updatedComments = [newComment, ...comments];
    saveComments(updatedComments);

    // Create Notification inside dashboard
    const newNotif: SystemNotification = {
      id: 'notif_' + Date.now(),
      type: containsOffensive ? 'report' : 'comment',
      title: containsOffensive ? 'Flagged Comment Queued' : 'New Comment Received',
      message: containsOffensive
        ? `A comment by "${commentData.authorName}" was flagged for offensive content.`
        : `"${commentData.authorName}" left feedback on "${commentData.postTitle}".`,
      timestamp: new Date().toISOString(),
      read: false,
      postId: commentData.postId,
      commentId: newComment.id,
    };

    saveNotifications([newNotif, ...notifications]);

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return { ...c, likes: c.likes + 1 };
      }
      return c;
    });
    saveComments(updated);
    try {
      await fetch(`/api/comments?id=${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReportComment = async (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const updatedComments = comments.map((c) => {
      if (c.id === commentId) {
        return { ...c, isReported: true };
      }
      return c;
    });
    saveComments(updatedComments);

    // Create Notification
    const newNotif: SystemNotification = {
      id: 'notif_' + Date.now(),
      type: 'report',
      title: 'Comment Reported',
      message: `A visitor reported a comment by "${comment.authorName}" on "${comment.postTitle}".`,
      timestamp: new Date().toISOString(),
      read: false,
      postId: comment.postId,
      commentId: comment.id,
    };

    saveNotifications([newNotif, ...notifications]);

    try {
      await fetch(`/api/comments?id=${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateComment = async (commentId: string, updates: Partial<PostComment>) => {
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return { ...c, ...updates };
      }
      return c;
    });
    saveComments(updated);

    try {
      const payload: any = {};
      if (updates.status) payload.isApproved = updates.status === 'approved';
      if (updates.isPinned !== undefined) payload.isPinned = updates.isPinned;
      if (updates.isReported !== undefined) payload.isReported = updates.isReported;

      if (Object.keys(payload).length > 0) {
        await fetch(`/api/comments?id=${commentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': getAuthHeader() },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const updated = comments.filter((c) => c.id !== commentId);
    saveComments(updated);

    try {
      await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
    } catch (e) {
      console.error(e);
    }
  };

  // --- Notifications ---
  const handleMarkNotificationRead = (notifId: string) => {
    const updated = notifications.map((n) => {
      if (n.id === notifId) {
        return { ...n, read: true };
      }
      return n;
    });
    saveNotifications(updated);
  };

  const handleClearNotifications = () => {
    saveNotifications([]);
  };

  // --- Backup restore handler ---
  const handleImportData = (imported: { posts: TimelinePost[]; comments: PostComment[] }) => {
    savePosts(imported.posts);
    saveComments(imported.comments);
  };

  // --- Open Media lightbox helper ---
  const handleOpenMedia = (mediaList: { type: 'image' | 'video'; url: string }[], index: number) => {
    setLightboxMedia(mediaList);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative antialiased transition-colors duration-300 ${
      theme === 'dark' 
        ? 'dark bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950' 
        : 'bg-slate-50 text-slate-900 selection:bg-slate-950 selection:text-white'
    }`}>
      {/* Dynamic Grid Overlay decor */}
      {theme === 'dark' ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none z-0 opacity-80" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-50 pointer-events-none z-0 opacity-80" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none z-0" />
        </>
      )}

      {/* HEADER NAVBAR */}
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 backdrop-blur-md ${
        theme === 'dark' ? 'border-slate-900 bg-slate-950/80' : 'border-slate-200 bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Top Left Logo branding */}
          <div className="flex items-center gap-2">
            <span className={`text-xl font-extrabold tracking-tight font-sans ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
              Jelvan<span className="text-amber-500 dark:text-amber-400">®</span>
            </span>
          </div>

          <nav className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-center ${
                theme === 'dark' 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-850' 
                  : 'bg-white border-slate-200 text-amber-500 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <button
              id="nav-timeline"
              onClick={() => setActiveTab('timeline')}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? theme === 'dark'
                    ? 'bg-slate-900 border border-amber-500/20 text-amber-400 font-bold'
                    : 'bg-slate-950 border border-transparent text-white font-bold shadow-xs'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {TRANSLATIONS[language]?.timeline || 'PUBLIC'}
            </button>

            <button
              id="nav-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? theme === 'dark'
                    ? 'bg-slate-900 border border-amber-500/20 text-amber-400 font-bold'
                    : 'bg-slate-950 border border-transparent text-white font-bold shadow-xs'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {TRANSLATIONS[language]?.dashboard || 'Dashboard'}
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN VIEW AREA CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 z-10 relative">
        <AnimatePresence mode="wait">
          {activeTab === 'timeline' ? (
            <motion.div
              key="timeline-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <TimelineView
                posts={posts}
                comments={comments}
                isAdmin={isAdmin}
                adminName={adminName}
                adminAvatar={adminAvatar}
                onLikePost={handleLikePost}
                onIncrementViews={handleIncrementViews}
                onAddComment={handleAddComment}
                onLikeComment={handleLikeComment}
                onReportComment={handleReportComment}
                onOpenMedia={handleOpenMedia}
                onEditPost={(post) => {
                  setEditingPost(post);
                  setIsPostModalOpen(true);
                }}
                onDeletePost={handleDeletePost}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <DashboardView
                posts={posts}
                comments={comments}
                notifications={notifications}
                visitorStats={visitorStats}
                offensiveWords={offensiveWords}
                adminName={adminName}
                adminAvatar={adminAvatar}
                onUpdateProfile={(name, avatar) => {
                  setAdminName(name);
                  setAdminAvatar(avatar);
                  localStorage.setItem('timeline_admin_name', name);
                  localStorage.setItem('timeline_admin_avatar', avatar);
                }}
                onAddPost={(newPost) => savePosts([newPost, ...posts])}
                onUpdatePost={(updatedPost) => {
                  const updated = posts.map((p) => (p.id === updatedPost.id ? updatedPost : p));
                  savePosts(updated);
                }}
                onDeletePost={handleDeletePost}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                onMarkNotificationRead={handleMarkNotificationRead}
                onClearNotifications={handleClearNotifications}
                onUpdateOffensiveWords={saveOffensiveWords}
                onImportData={handleImportData}
                onOpenCreateModal={() => {
                  setEditingPost(null);
                  setIsPostModalOpen(true);
                }}
                onOpenEditModal={(post) => {
                  setEditingPost(post);
                  setIsPostModalOpen(true);
                }}
                isAuthenticated={isAdmin}
                onLogin={handleLogin}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className={`border-t transition-colors duration-300 py-8 mt-12 z-10 relative ${
        theme === 'dark' ? 'border-slate-900 bg-slate-950/40' : 'border-slate-200 bg-slate-100/40'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Copyright Statement */}
            <div className={`text-xs font-mono transition-colors ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              &copy; 2026 Jelvan<span className="text-amber-500 dark:text-amber-400">®</span>. {TRANSLATIONS[language]?.copyright || 'All rights reserved.'}
            </div>

            {/* Language Selection */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <div className="relative inline-block">
                <select
                  id="footer-language-select"
                  value={language}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setLanguage(newLang);
                    localStorage.setItem('timeline_language', newLang);
                  }}
                  className={`appearance-none bg-transparent pl-2 pr-8 py-1.5 text-xs font-sans font-medium rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all ${
                    theme === 'dark'
                      ? 'border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-850'
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                  style={{ minWidth: '120px' }}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className={theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700'}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Portfolio and Email Button Section */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                id="jelvan-portfolio-link"
                href="https://portfolio.jelvan.pro"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 rounded-xl border text-xs font-sans font-bold tracking-tight transition-all duration-150 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${
                  theme === 'dark'
                    ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:bg-slate-800 hover:text-amber-300 hover:border-amber-500/20 shadow-lg shadow-black/10'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                }`}
                style={{ minHeight: '40px' }}
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Jelvan® Portfolio</span>
              </a>
              
              <a
                id="jelvan-email-link"
                href="mailto:hello@jelvan.pro"
                className={`px-4 py-2 rounded-xl border text-xs font-sans font-medium transition-all duration-150 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${
                  theme === 'dark'
                    ? 'bg-slate-900/40 border-slate-850 text-slate-300 hover:bg-slate-900 hover:text-slate-100 hover:border-slate-800'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50 hover:text-slate-800 hover:border-slate-250'
                }`}
                style={{ minHeight: '40px' }}
              >
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>hello@jelvan.pro</span>
              </a>
            </div>

          </div>
        </div>
      </footer>

      {/* CREATION & EDIT MODAL DIALOG */}
      <AnimatePresence>
        {isPostModalOpen && (
          <PostFormModal
            isOpen={isPostModalOpen}
            onClose={() => {
              setIsPostModalOpen(false);
              setEditingPost(null);
            }}
            onSave={handleSavePost}
            editingPost={editingPost}
          />
        )}
      </AnimatePresence>

      {/* LIGHTBOX SLIDER OVERLAY */}
      <MediaLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        mediaList={lightboxMedia}
        currentIndex={lightboxIndex}
        setCurrentIndex={setLightboxIndex}
      />
    </div>
  );
}
