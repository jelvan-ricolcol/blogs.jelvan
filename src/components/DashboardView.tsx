import React, { useState, useMemo, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  BarChart3,
  MessageSquare,
  Sparkles,
  Layers,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  Globe,
  Camera,
  Video,
  DraftingCompass,
  Plus,
  Trash,
  Pin,
  Check,
  AlertTriangle,
  MapPin,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { TimelinePost, PostComment, SystemNotification, DashboardStats, PostCategory, VisitorStat } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import AuthForms from './AuthForms';

interface DashboardViewProps {
  posts: TimelinePost[];
  comments: PostComment[];
  notifications: SystemNotification[];
  visitorStats: VisitorStat[];
  offensiveWords: string[];
  adminName: string;
  adminAvatar: string;
  onUpdateProfile: (name: string, avatar: string) => void;
  onAddPost: (post: TimelinePost) => void;
  onUpdatePost: (post: TimelinePost) => void;
  onDeletePost: (postId: string) => void;
  onUpdateComment: (commentId: string, updates: Partial<PostComment>) => void;
  onDeleteComment: (commentId: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
  onUpdateOffensiveWords: (words: string[]) => void;
  onImportData: (data: { posts: TimelinePost[]; comments: PostComment[] }) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (post: TimelinePost) => void;
  
  // Auth state
  isAuthenticated: boolean;
  onLogin: (token: string, user: any) => boolean;
  onLogout: () => void;
}

export default function DashboardView({
  posts,
  comments,
  notifications,
  visitorStats,
  offensiveWords,
  adminName,
  adminAvatar,
  onUpdateProfile,
  onAddPost,
  onUpdatePost,
  onDeletePost,
  onUpdateComment,
  onDeleteComment,
  onMarkNotificationRead,
  onClearNotifications,
  onUpdateOffensiveWords,
  onImportData,
  onOpenCreateModal,
  onOpenEditModal,
  isAuthenticated,
  onLogin,
  onLogout,
}: DashboardViewProps) {
  // Navigation & Authentication
  const [activeTab, setActiveTab] = useState<'analytics' | 'posts' | 'comments' | 'notifications' | 'settings'>('analytics');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [offensiveWordInput, setOffensiveWordInput] = useState('');
  
  // Lockout States (5 attempts, 24 hours lock)
  const [attempts, setAttempts] = useState<number>(() => {
    return Number(localStorage.getItem('timeline_admin_attempts') || '0');
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const stored = localStorage.getItem('timeline_admin_lockout_until');
    return stored ? Number(stored) : null;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Device Identifiers & Trusted Devices (Lockout Bypass)
  const [currentDeviceId] = useState<string>(() => {
    let id = localStorage.getItem('timeline_device_id');
    if (!id) {
      id = 'device-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('timeline_device_id', id);
    }
    return id;
  });

  const [trustedDevices, setTrustedDevices] = useState<string[]>(() => {
    const stored = localStorage.getItem('timeline_trusted_devices');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    // Default this device to be trusted & cannot be locked out
    const myId = localStorage.getItem('timeline_device_id') || 'device-' + Math.random().toString(36).substring(2, 11);
    if (!localStorage.getItem('timeline_device_id')) {
      localStorage.setItem('timeline_device_id', myId);
    }
    const defaultTrust = [myId];
    localStorage.setItem('timeline_trusted_devices', JSON.stringify(defaultTrust));
    return defaultTrust;
  });

  const [newDeviceToTrust, setNewDeviceToTrust] = useState('');

  // Profile edit states
  const [profileNameInput, setProfileNameInput] = useState(adminName);
  const [profileAvatarUrlInput, setProfileAvatarUrlInput] = useState(adminAvatar);

  // Sync profile settings with props
  useEffect(() => {
    setProfileNameInput(adminName);
    setProfileAvatarUrlInput(adminAvatar);
  }, [adminName, adminAvatar]);

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      triggerToast('Error: Image is too large! Please choose an image smaller than 1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdateProfile(profileNameInput, base64);
      setProfileAvatarUrlInput(base64);
      triggerToast('Profile photo updated successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileNameInput.trim() || 'Admin', profileAvatarUrlInput.trim());
    triggerToast('Admin profile details updated!');
  };

  const handleAddTrustedDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const token = newDeviceToTrust.trim();
    if (!token) return;
    if (trustedDevices.includes(token)) {
      triggerToast('This device ID is already trusted.');
      return;
    }
    const updated = [...trustedDevices, token];
    setTrustedDevices(updated);
    localStorage.setItem('timeline_trusted_devices', JSON.stringify(updated));
    setNewDeviceToTrust('');
    triggerToast('Added device to the trusted bypass list.');
  };

  const handleRemoveTrustedDevice = (idToRemove: string) => {
    if (idToRemove === currentDeviceId) {
      triggerToast('For security, you cannot remove trust from your current active device.');
      return;
    }
    const updated = trustedDevices.filter(id => id !== idToRemove);
    setTrustedDevices(updated);
    localStorage.setItem('timeline_trusted_devices', JSON.stringify(updated));
    triggerToast('Device removed from the trusted list.');
  };

  // Countdown clock tick
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      if (now >= lockoutUntil) {
        setLockoutUntil(null);
        setAttempts(0);
        localStorage.removeItem('timeline_admin_attempts');
        localStorage.removeItem('timeline_admin_lockout_until');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isDeviceTrusted = useMemo(() => {
    return trustedDevices.includes(currentDeviceId);
  }, [trustedDevices, currentDeviceId]);

  const isLockedOut = !isDeviceTrusted && lockoutUntil !== null && currentTime < lockoutUntil;

  const remainingLockTime = useMemo(() => {
    if (!lockoutUntil) return '';
    const diff = lockoutUntil - currentTime;
    if (diff <= 0) return '';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  }, [lockoutUntil, currentTime]);

  // Search state inside managers
  const [postsSearch, setPostsSearch] = useState('');
  const [commentsFilter, setCommentsFilter] = useState<'all' | 'pending' | 'reported' | 'hidden' | 'approved'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper toast notifier
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auth handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut) {
      triggerToast(`Too many failed attempts. Locked out for ${remainingLockTime}.`);
      return;
    }

    const success = onLogin(passwordInput, null);
    if (success) {
      setAuthError(false);
      setPasswordInput('');
      setAttempts(0);
      setLockoutUntil(null);
      localStorage.removeItem('timeline_admin_attempts');
      localStorage.removeItem('timeline_admin_lockout_until');
      triggerToast('Logged in successfully! Welcome back.');
    } else {
      setAuthError(true);
      if (isDeviceTrusted) {
        triggerToast('Incorrect password! Lockout bypassed on this trusted device.');
        return;
      }
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      localStorage.setItem('timeline_admin_attempts', String(nextAttempts));
      
      if (nextAttempts >= 5) {
        const lockDuration = 24 * 60 * 60 * 1000; // 24 hours
        const until = Date.now() + lockDuration;
        setLockoutUntil(until);
        localStorage.setItem('timeline_admin_lockout_until', String(until));
        triggerToast('Too many failed attempts! Locked out for 24 hours.');
      } else {
        triggerToast(`Incorrect password! ${5 - nextAttempts} attempts remaining.`);
      }
    }
  };

  // Analytics calculator
  const stats = useMemo<DashboardStats>(() => {
    const totalPosts = posts.length;
    
    let photos = 0;
    let videos = 0;
    posts.forEach((post) => {
      post.media?.forEach((m) => {
        if (m.type === 'image') photos++;
        if (m.type === 'video') videos++;
      });
    });

    const achievements = posts.filter((p) => p.category === 'Achievements').length;
    
    // Extract unique cities/countries
    const countries = new Set(
      posts
        .filter((p) => p.category === 'Travel')
        .map((p) => {
          const split = p.location.split(',');
          return split[split.length - 1].trim();
        })
    );
    const countriesVisited = countries.size || 1; // Fallback to 1 if empty but has travel posts

    const totalComments = comments.length;
    const postViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const draftPosts = posts.filter((p) => p.isDraft).length;

    return {
      totalPosts,
      photos,
      videos,
      achievements,
      countriesVisited,
      totalComments,
      postViews,
      draftPosts,
    };
  }, [posts, comments]);

  // Sorting charts lists
  const topViewedPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.views - a.views).slice(0, 5);
  }, [posts]);

  const mostCommentedPosts = useMemo(() => {
    return [...posts]
      .map((p) => ({
        ...p,
        commentCount: comments.filter((c) => c.postId === p.id).length,
      }))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 5);
  }, [posts, comments]);

  // Filtered lists
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const q = postsSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.privacy.toLowerCase().includes(q)
      );
    });
  }, [posts, postsSearch]);

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      if (commentsFilter === 'all') return true;
      if (commentsFilter === 'pending') return comment.status === 'pending';
      if (commentsFilter === 'reported') return comment.isReported;
      if (commentsFilter === 'hidden') return comment.status === 'hidden';
      if (commentsFilter === 'approved') return comment.status === 'approved';
      return true;
    });
  }, [comments, commentsFilter]);

  // Export as JSON
  const handleExportData = () => {
    const backup = {
      posts,
      comments,
      offensiveWords,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast('JSON Backup downloaded successfully!');
  };

  // Import JSON handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.posts && Array.isArray(data.posts)) {
          onImportData({
            posts: data.posts,
            comments: data.comments || [],
          });
          if (data.offensiveWords) {
            onUpdateOffensiveWords(data.offensiveWords);
          }
          triggerToast('Timeline data successfully restored!');
        } else {
          triggerToast('Invalid backup file format.');
        }
      } catch (err) {
        triggerToast('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Add banned word
  const handleAddOffensiveWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = offensiveWordInput.trim().toLowerCase();
    if (word && !offensiveWords.includes(word)) {
      onUpdateOffensiveWords([...offensiveWords, word]);
      setOffensiveWordInput('');
      triggerToast(`Banned word added: "${word}"`);
    }
  };

  const handleRemoveOffensiveWord = (wordToRemove: string) => {
    onUpdateOffensiveWords(offensiveWords.filter((w) => w !== wordToRemove));
    triggerToast(`Banned word removed: "${wordToRemove}"`);
  };

  // Pin/Unpin comment
  const handleTogglePinComment = (comment: PostComment) => {
    onUpdateComment(comment.id, { isPinned: !comment.isPinned });
    triggerToast(comment.isPinned ? 'Comment unpinned' : 'Comment pinned successfully!');
  };

  // Change password simulation
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput.trim()) {
      localStorage.setItem('timeline_admin_password', newPasswordInput.trim());
      setNewPasswordInput('');
      triggerToast('Password changed successfully!');
    }
  };

  // AUTH SCREEN (Protected Route)
  if (!isAuthenticated) {
    return (
      <div id="auth-container" className="flex items-center justify-center min-h-[70vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md dark:shadow-2xl relative overflow-hidden"
        >
          {/* Subtle decoration */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-2xl" />
          
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-2xl font-bold font-sans text-slate-900 dark:text-white">Private Dashboard</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authentication required. Enter your admin password to view analytics, moderate comments, and manage posts.
            </p>
          </div>

          <AuthForms onLoginSuccess={onLogin} />
        </motion.div>
      </div>
    );
  }

  return (
    <div id="dashboard-layout" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Toast Notifier */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-amber-400 font-mono text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-amber-500" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold font-sans">
              JD
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-sans">Account Owner</div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Live Control Panel
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <button
              id="tab-btn-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-150 ${
                activeTab === 'analytics'
                  ? 'bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs dark:shadow-md dark:shadow-amber-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              Analytics
            </button>

            <button
              id="tab-btn-posts"
              onClick={() => setActiveTab('posts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-150 ${
                activeTab === 'posts'
                  ? 'bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs dark:shadow-md dark:shadow-amber-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              Manage Posts ({posts.length})
            </button>

            <button
              id="tab-btn-comments"
              onClick={() => setActiveTab('comments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-150 ${
                activeTab === 'comments'
                  ? 'bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs dark:shadow-md dark:shadow-amber-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              Moderate Comments ({comments.length})
            </button>

            <button
              id="tab-btn-notifications"
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-150 ${
                activeTab === 'notifications'
                  ? 'bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs dark:shadow-md dark:shadow-amber-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0" />
                Notifications
              </div>
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${activeTab === 'notifications' ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-amber-450' : 'bg-red-500 text-white'}`}>
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            <button
              id="tab-btn-settings"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-150 ${
                activeTab === 'settings'
                  ? 'bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs dark:shadow-md dark:shadow-amber-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              Backup & Settings
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              id="dashboard-logout-btn"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono text-red-500 dark:text-red-400 hover:text-red-650 dark:hover:text-red-300 hover:bg-red-500/5 dark:hover:bg-red-950/20 transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
              Lock Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* MAIN TAB CONTENT DISPLAY */}
      <div className="lg:col-span-3 space-y-6">
        <AnimatePresence mode="wait">
          {/* 1. ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Core Statistics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
                  <div className="text-slate-400 dark:text-slate-500 mb-2 font-mono text-[10px] uppercase font-bold tracking-wider">
                    Total Posts
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalPosts}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">{stats.draftPosts} saved drafts</div>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
                  <div className="text-slate-400 dark:text-slate-500 mb-2 font-mono text-[10px] uppercase font-bold tracking-wider">
                    Post Views
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-amber-400">{stats.postViews.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Organic timeline hits</div>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
                  <div className="text-slate-400 dark:text-slate-500 mb-2 font-mono text-[10px] uppercase font-bold tracking-wider">
                    Total Comments
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalComments}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Anonymous discussions</div>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
                  <div className="text-slate-400 dark:text-slate-500 mb-2 font-mono text-[10px] uppercase font-bold tracking-wider">
                    Media Files
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-amber-400">
                    {stats.photos + stats.videos}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {stats.photos} Photos • {stats.videos} Videos
                  </div>
                </div>
              </div>

              {/* Advanced counts row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-amber-500/10 border border-slate-200 dark:border-amber-500/20 flex items-center justify-center text-slate-800 dark:text-amber-400 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-450 dark:text-slate-500 uppercase font-bold">Achievements</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-200">{stats.achievements} milestones</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-amber-500/10 border border-slate-200 dark:border-amber-500/20 flex items-center justify-center text-slate-800 dark:text-amber-400 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-450 dark:text-slate-500 uppercase font-bold">Places/Countries</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-200">{stats.countriesVisited} unique regions</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-purple-500/10 border border-slate-200 dark:border-purple-500/20 flex items-center justify-center text-slate-800 dark:text-purple-450 shrink-0">
                    <DraftingCompass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-450 dark:text-slate-500 uppercase font-bold">Activity Index</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-200">Excellent • Stable</div>
                  </div>
                </div>
              </div>

              {/* Dynamic SVG views chart / metrics panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SVG Visitor Trend Chart */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Visitor & Views History</h3>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">Monthly timeline hit trends (2026)</p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-slate-800 dark:text-amber-400" />
                  </div>

                  <div className="h-44 flex items-end justify-between gap-2 pt-4 border-b border-slate-200 dark:border-slate-800 relative">
                    {visitorStats.map((item, index) => {
                      const maxViews = Math.max(...visitorStats.map((v) => v.views)) || 1;
                      const pct = (item.views / maxViews) * 100;

                      return (
                        <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group/bar">
                          {/* Views value tip */}
                          <div className="absolute top-0 opacity-0 group-hover/bar:opacity-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[9px] font-mono text-slate-900 dark:text-amber-400 shadow-sm dark:shadow-md transition-all z-10">
                            {item.views} views
                          </div>

                          <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-t-lg overflow-hidden relative" style={{ height: '110px' }}>
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-slate-950 dark:bg-gradient-to-t dark:from-amber-500/30 dark:to-amber-450 rounded-t-md transition-all duration-500"
                              style={{ height: `${pct}%` }}
                            />
                          </div>

                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-full">
                            {item.date.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Viewed Posts Metrics */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                  <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Most Viewed Timeline Posts</h3>
                  
                  <div className="space-y-3.5">
                    {topViewedPosts.map((post) => {
                      const maxViews = topViewedPosts[0]?.views || 1;
                      const pct = (post.views / maxViews) * 100;

                      return (
                        <div key={post.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-700 dark:text-slate-300 font-sans truncate pr-2 font-medium">{post.title}</span>
                            <span className="text-slate-950 dark:text-amber-400 font-bold shrink-0">{post.views} views</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-950 dark:bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 4: Most Commented Posts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                  <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Engagement Metrics: Top Discussed</h3>
                  
                  <div className="space-y-3.5">
                    {mostCommentedPosts.map((post) => {
                      const maxComments = mostCommentedPosts[0]?.commentCount || 1;
                      const pct = (post.commentCount / maxComments) * 100;

                      return (
                        <div key={post.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-700 dark:text-slate-300 font-sans truncate pr-2 font-medium">{post.title}</span>
                            <span className="text-slate-950 dark:text-amber-400 font-bold shrink-0">{post.commentCount} comments</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-950 dark:bg-amber-450 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions box */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Quick Dashboard Actions</h3>
                    <p className="text-xs text-slate-500">Fast tracking triggers for manual adjustments and updates.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button
                      id="dash-quick-create-btn"
                      onClick={onOpenCreateModal}
                      className="p-3 bg-slate-950 hover:bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 dark:hover:bg-amber-600 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm active:scale-97"
                    >
                      <Plus className="w-5 h-5" />
                      Create New Post
                    </button>

                    <button
                      id="dash-quick-export-btn"
                      onClick={handleExportData}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all active:scale-97"
                    >
                      <Download className="w-5 h-5 text-slate-900 dark:text-amber-400" />
                      Backup JSON Data
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. POSTS MANAGER TAB */}
          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <input
                    id="posts-manager-search"
                    type="text"
                    placeholder="Filter posts by title, category, privacy..."
                    value={postsSearch}
                    onChange={(e) => setPostsSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-slate-900 dark:text-slate-200 focus:outline-none transition-all"
                  />
                  <Layers className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>

                <button
                  id="posts-manager-add-btn"
                  onClick={onOpenCreateModal}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-sm dark:shadow-lg dark:shadow-amber-500/5 active:scale-97"
                >
                  <Plus className="w-4 h-4" />
                  Add Timeline Post
                </button>
              </div>

              {/* Table / Grid list of posts */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3">Title & Category</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Privacy</th>
                        <th className="px-6 py-3">Stats</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-750 dark:text-slate-300">
                      {filteredPosts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-mono">
                            No posts found. Create one to begin.
                          </td>
                        </tr>
                      ) : (
                        filteredPosts.map((post) => (
                          <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {post.isPinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                                {post.title}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                                {post.category} {post.isDraft && '• DRAFT'}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {post.date}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                                post.privacy === 'Public'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : post.privacy === 'Private'
                                  ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                                  : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                              }`}>
                                {post.privacy}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              Views: {post.views} • Likes: {post.likes}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1 shrink-0">
                              <button
                                id={`posts-mgr-edit-${post.id}`}
                                onClick={() => onOpenEditModal(post)}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-lg text-[10px] font-semibold font-mono uppercase transition-colors"
                              >
                                Edit
                              </button>

                              <button
                                id={`posts-mgr-pin-${post.id}`}
                                onClick={() => {
                                  onUpdatePost({ ...post, isPinned: !post.isPinned });
                                  triggerToast(post.isPinned ? 'Post unpinned' : 'Post pinned successfully!');
                                }}
                                className={`px-2 py-1.5 border rounded-lg text-[10px] font-semibold font-mono uppercase transition-all ${
                                  post.isPinned
                                    ? 'bg-amber-500/10 text-amber-650 dark:text-amber-400 border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                Pin
                              </button>

                              <button
                                id={`posts-mgr-del-${post.id}`}
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this post permanently?')) {
                                    onDeletePost(post.id);
                                    triggerToast('Post deleted successfully.');
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-semibold font-mono uppercase transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. COMMENTS MODERATOR TAB */}
          {activeTab === 'comments' && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Toolbar filters */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Comments Filter:</span>
                <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {(['all', 'pending', 'reported', 'hidden', 'approved'] as const).map((filter) => (
                    <button
                      key={filter}
                      id={`comments-filter-btn-${filter}`}
                      onClick={() => setCommentsFilter(filter)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-lg uppercase tracking-wider transition-all shrink-0 ${
                        commentsFilter === filter
                          ? 'bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 font-bold'
                          : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments items listing */}
              <div className="space-y-3.5">
                {filteredComments.length === 0 ? (
                  <div className="text-center p-10 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 font-mono text-xs">
                    No comments found matching this moderator status filter.
                  </div>
                ) : (
                  filteredComments.map((comment) => (
                    <div
                      key={comment.id}
                      id={`moderator-comment-${comment.id}`}
                      className={`p-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all relative shadow-xs dark:shadow-md ${
                        comment.isReported ? 'ring-1 ring-red-500/20 bg-red-500/2' : ''
                      }`}
                    >
                      <div className="space-y-2 max-w-xl">
                        {/* Status badging */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                            comment.status === 'approved'
                              ? 'bg-amber-500/10 text-amber-650 dark:text-amber-400'
                              : comment.status === 'hidden'
                              ? 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-450'
                              : 'bg-amber-550/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {comment.status}
                          </span>
                          
                          {comment.isReported && (
                            <span className="bg-red-500/10 text-red-500 dark:text-red-400 text-[8px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Reported
                            </span>
                          )}

                          {comment.isPinned && (
                            <span className="bg-amber-500/10 text-amber-650 dark:text-amber-400 text-[8px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" />
                              Pinned
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                            on "{comment.postTitle}"
                          </span>
                        </div>

                        {/* Author line */}
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${comment.authorAvatar}`}>
                            {comment.authorName[0]}
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{comment.authorName}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(comment.timestamp).toLocaleDateString('en-US')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic pl-8">
                          "{comment.content}"
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-1.5 shrink-0 pl-8 md:pl-0">
                        {comment.status !== 'approved' && (
                          <button
                            id={`mod-approve-${comment.id}`}
                            onClick={() => {
                              onUpdateComment(comment.id, { status: 'approved', isReported: false });
                              triggerToast('Comment approved successfully!');
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/40 text-amber-650 dark:text-amber-400 rounded-lg text-[10px] font-mono uppercase font-bold transition-colors"
                          >
                            Approve
                          </button>
                        )}

                        {comment.status !== 'hidden' && (
                          <button
                            id={`mod-hide-${comment.id}`}
                            onClick={() => {
                              onUpdateComment(comment.id, { status: 'hidden' });
                              triggerToast('Comment hidden from public view.');
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 rounded-lg text-[10px] font-mono uppercase font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                          >
                            Hide
                          </button>
                        )}

                        <button
                          id={`mod-pin-${comment.id}`}
                          onClick={() => handleTogglePinComment(comment)}
                          className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-mono uppercase font-bold transition-all ${
                            comment.isPinned
                              ? 'bg-amber-500/10 text-amber-650 dark:text-amber-400 border-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-950 text-slate-550 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          Pin
                        </button>

                        <button
                          id={`mod-del-${comment.id}`}
                          onClick={() => {
                            if (confirm('Are you sure you want to permanently delete this comment?')) {
                              onDeleteComment(comment.id);
                              triggerToast('Comment permanently deleted.');
                            }
                          }}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-mono uppercase font-bold transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* 4. NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">System Activity Log & Alerts</span>
                {notifications.length > 0 && (
                  <button
                    id="clear-all-notifs"
                    onClick={() => {
                      onClearNotifications();
                      triggerToast('Notifications cleared.');
                    }}
                    className="text-xs font-bold text-red-500 dark:text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {notifications.length === 0 ? (
                  <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-450 dark:text-slate-500 font-mono text-xs">
                    Inbox is completely clear. Outstanding job!
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      id={`notification-item-${notif.id}`}
                      className={`p-4 bg-white dark:bg-slate-900/60 border rounded-2xl flex items-start justify-between gap-4 transition-all shadow-xs dark:shadow-md ${
                        notif.read ? 'border-slate-200 dark:border-slate-800 opacity-60' : 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/2 font-bold'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {notif.type === 'report' ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          ) : notif.type === 'comment' ? (
                            <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span className={`text-xs ${notif.read ? 'text-slate-550 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100 font-bold'}`}>
                            {notif.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                          {notif.message}
                        </p>
                        <span className="block pl-6 text-[9px] font-mono text-slate-450 dark:text-slate-500">
                          {new Date(notif.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {!notif.read && (
                        <button
                          id={`read-notif-${notif.id}`}
                          onClick={() => onMarkNotificationRead(notif.id)}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-mono rounded uppercase font-bold shrink-0"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* 5. SETTINGS & RESTORE TAB */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              
              {/* Account Settings */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Account Security & Notifications</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Manage your Two-Factor Authentication and email notification preferences.
                </p>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/auth/2fa-setup', { method: 'POST', headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') } });
                        const data: any = await res.json();
                        if (data.success) {
                           alert('Scan this QR code in your Authenticator app using this URI: ' + data.uri);
                           const code = prompt('Enter the 6-digit code to enable 2FA:');
                           if (code) {
                               const verifyRes = await fetch('/api/auth/2fa-enable', { method: 'POST', body: JSON.stringify({ code }), headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token'), 'Content-Type': 'application/json' } });
                               const verifyData: any = await verifyRes.json();
                               if (verifyData.success) alert('2FA Enabled Successfully!');
                               else alert('Invalid code.');
                           }
                        } else alert('Failed to setup 2FA');
                      } catch (e) { alert('Error: ' + e); }
                    }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-100 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    Setup Two-Factor Auth (Authenticator App)
                  </button>

                  <button
                    onClick={async () => {
                      const enabled = confirm("Enable email notifications for new comments?");
                      try {
                        const res = await fetch('/api/auth/settings', { method: 'POST', body: JSON.stringify({ notification_comments: enabled }), headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token'), 'Content-Type': 'application/json' } });
                        if (res.ok) alert('Notification preferences updated!');
                      } catch (e) { alert('Error: ' + e); }
                    }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-100 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    Manage Notifications
                  </button>
                </div>
              </div>

              {/* Backups & Persistence */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Local Vault Backup & Recovery</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Avoid browser-cache cleaning losses. Export your customized timeline posts and moderated comments to a portable JSON file, and restore it on any device.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    id="export-data-btn"
                    onClick={handleExportData}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-100 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-4 h-4 text-slate-900 dark:text-amber-400" />
                    Download Backup JSON
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      id="import-backup-file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                    <button
                      id="import-data-btn"
                      onClick={() => document.getElementById('import-backup-file')?.click()}
                      className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800"
                    >
                      <Upload className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                      Restore Backup JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Profile Settings Card */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Admin Profile Settings</h3>
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  Customize the verified author profile displayed on public timeline posts and milestones.
                </p>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850">
                    {/* Visual Avatar Preview with Upload Trigger */}
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-full bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 flex items-center justify-center font-black text-2xl shadow-md border-2 border-white dark:border-slate-800 overflow-hidden">
                        {profileAvatarUrlInput ? (
                          <img src={profileAvatarUrlInput} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          profileNameInput[0]?.toUpperCase() || 'J'
                        )}
                      </div>
                      
                      <label className="absolute inset-0 bg-black/65 text-white text-[10px] font-bold font-mono opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-full cursor-pointer transition-opacity duration-200">
                        <Camera className="w-5 h-5 mb-1" />
                        <span>UPLOAD</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex-1 w-full space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Verified Author Name
                        </label>
                        <input
                          type="text"
                          placeholder="Admin Profile Name"
                          value={profileNameInput}
                          onChange={(e) => setProfileNameInput(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Avatar URL <span className="text-amber-500 font-extrabold">(Cloudinary / External Link)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="https://res.cloudinary.com/... or paste image URL"
                          value={profileAvatarUrlInput}
                          onChange={(e) => setProfileAvatarUrlInput(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {profileAvatarUrlInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileAvatarUrlInput('');
                          onUpdateProfile(profileNameInput, '');
                          triggerToast('Profile image cleared. Reverted to letter fallback.');
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 text-xs rounded-xl font-bold transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        Clear Photo
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs rounded-xl font-bold transition-colors"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>

              {/* Offensive Word Moderation */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Automated Comment Word Filter</h3>
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  Comments containing words added to this blacklist will be automatically flagged as reported and placed in the moderation queue instead of being published immediately.
                </p>

                <form onSubmit={handleAddOffensiveWord} className="flex gap-2">
                  <input
                    id="offensive-word-input"
                    type="text"
                    placeholder="Type a word to blacklist (e.g. crypto, bot)"
                    value={offensiveWordInput}
                    onChange={(e) => setOffensiveWordInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl font-bold border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    Add
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {offensiveWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-550/20 px-2.5 py-1 rounded-lg text-xs font-mono"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => handleRemoveOffensiveWord(word)}
                        className="hover:text-red-750 dark:hover:text-red-300 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Security Credentials Password Reset */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Change Dashboard Password</h3>
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  Set a custom, private access key to lock and secure your dashboard content from local visitors.
                </p>

                <form onSubmit={handleChangePassword} className="flex gap-2 max-w-sm">
                  <input
                    id="new-password-input"
                    type="password"
                    placeholder="Enter new master password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs rounded-xl font-bold transition-colors"
                  >
                    Change
                  </button>
                </form>
              </div>

              {/* Trusted Devices Management Card */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-200">Trusted Devices & Lockout Bypass</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Trusted devices are completely exempted from the 24-hour admin lockout mechanism (triggered by 5 failed password attempts). 
                  Your current active device has been automatically trusted by default.
                </p>

                {/* Current Active Device Display */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-xl border border-slate-150 dark:border-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      This Device ID
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                        Active
                      </span>
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                        Lockout Bypassed
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all break-all">
                      {currentDeviceId}
                    </code>
                    <button
                      id="copy-device-id-btn"
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentDeviceId);
                        triggerToast('Device ID copied to clipboard! Share this with other devices to trust them.');
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold font-mono rounded-lg transition-colors shrink-0"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Form to add other trusted devices */}
                <form onSubmit={handleAddTrustedDevice} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Add Trusted Device by ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="new-device-id-input"
                        type="text"
                        placeholder="Paste device ID from another browser/device (e.g. device-xxxxx)"
                        value={newDeviceToTrust}
                        onChange={(e) => setNewDeviceToTrust(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        id="add-trusted-device-btn"
                        type="submit"
                        className="px-4 py-2 bg-slate-950 hover:bg-slate-900 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs rounded-xl font-bold transition-colors shrink-0"
                      >
                        Trust Device
                      </button>
                    </div>
                  </div>
                </form>

                {/* List of trusted devices */}
                <div className="space-y-2 pt-2">
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Trusted Devices List ({trustedDevices.length})
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-150 dark:divide-slate-850">
                    {trustedDevices.map((id) => (
                      <div key={id} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-950/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                          <code className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-350 truncate break-all">
                            {id}
                          </code>
                          {id === currentDeviceId && (
                            <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={id === currentDeviceId}
                          onClick={() => handleRemoveTrustedDevice(id)}
                          className={`text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg shrink-0 ${
                            id === currentDeviceId ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={id === currentDeviceId ? "Cannot remove current device" : "Remove trust"}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
