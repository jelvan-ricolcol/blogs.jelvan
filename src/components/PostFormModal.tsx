import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash, Image as ImageIcon, Video as VideoIcon, Sparkles, MapPin, Calendar, Lock, Globe, EyeOff, FolderOpen, Heart } from 'lucide-react';
import { TimelinePost, PostCategory, PrivacyLevel } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (post: Omit<TimelinePost, 'views' | 'likes' | 'shareCount'>) => void;
  editingPost?: TimelinePost | null;
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

export default function PostFormModal({
  isOpen,
  onClose,
  onSave,
  editingPost,
}: PostFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory>('Achievements');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('Public');
  const [coverPhoto, setCoverPhoto] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video'; url: string }[]>([]);
  const [mood, setMood] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [cloudinaryUrl, setCloudinaryUrl] = useState('');
  const [cloudinaryType, setCloudinaryType] = useState<'image' | 'video'>('image');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setDescription(editingPost.description);
      setCategory(editingPost.category);
      setDate(editingPost.date);
      setLocation(editingPost.location);
      setTags(editingPost.tags || []);
      setPrivacy(editingPost.privacy);
      setCoverPhoto(editingPost.coverPhoto || '');
      setMedia(editingPost.media || []);
      setMood(editingPost.mood || '');
      setIsPinned(editingPost.isPinned || false);
      setIsDraft(editingPost.isDraft || false);
      setPublishDate(editingPost.publishDate || '');
    } else {
      // Set to current date as default
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setDescription('');
      setCategory('Achievements');
      setDate(today);
      setLocation('');
      setTags([]);
      setPrivacy('Public');
      setCoverPhoto('');
      setMedia([]);
      setMood('');
      setIsPinned(false);
      setIsDraft(false);
      setPublishDate('');
    }
  }, [editingPost, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#/, '');
      if (cleanTag && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const newItem = { type: type as 'image' | 'video', url };
      setMedia((prev) => {
        const updated = [...prev, newItem];
        if (!coverPhoto && type === 'image') {
          setCoverPhoto(url);
        }
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const handleAddVideoLink = () => {
    if (videoUrlInput.trim()) {
      setMedia((prev) => [...prev, { type: 'video', url: videoUrlInput.trim() }]);
      setVideoUrlInput('');
    }
  };

  const handleAddCloudinaryLink = () => {
    if (cloudinaryUrl.trim()) {
      setMedia((prev) => [
        ...prev,
        { type: cloudinaryType, url: cloudinaryUrl.trim() }
      ]);
      // If adding an image and no cover photo is currently selected, set it as cover
      if (cloudinaryType === 'image' && !coverPhoto) {
        setCoverPhoto(cloudinaryUrl.trim());
      }
      setCloudinaryUrl('');
    }
  };

  const handleRemoveMedia = (indexToRemove: number) => {
    const itemToRemove = media[indexToRemove];
    const updatedMedia = media.filter((_, idx) => idx !== indexToRemove);
    setMedia(updatedMedia);
    
    // Reset cover photo if the removed photo was the cover
    if (itemToRemove.url === coverPhoto) {
      const firstImg = updatedMedia.find((m) => m.type === 'image');
      setCoverPhoto(firstImg ? firstImg.url : '');
    }
  };

  const handleSetCover = (url: string) => {
    setCoverPhoto(url);
  };

  const handlePresetCover = (url: string) => {
    setCoverPhoto(url);
    if (!media.some((m) => m.url === url)) {
      setMedia((prev) => [...prev, { type: 'image', url }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    // Use a default cover if none selected
    let finalCover = coverPhoto;
    if (!finalCover) {
      const firstImage = media.find((m) => m.type === 'image');
      finalCover = firstImage ? firstImage.url : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80';
    }

    onSave({
      id: editingPost?.id || 'post_' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      category,
      date,
      location: location.trim() || 'Online / Remote',
      tags,
      privacy,
      coverPhoto: finalCover,
      media,
      mood: mood.trim() || undefined,
      isPinned,
      isDraft,
      publishDate: privacy === 'Scheduled' ? publishDate : undefined,
    });
  };

  // Some beautiful background templates for quick selection
  const SAMPLE_COVERS = [
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'
  ];

  return (
    <div id="post-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
      <motion.div
        id="post-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-sans text-slate-900 dark:text-slate-100">
              {editingPost ? 'Edit Timeline Post' : 'Create Timeline Post'}
            </h2>
          </div>
          <button
            id="close-post-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side: Basic Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Post Title *
                </label>
                <input
                  id="post-title-input"
                  type="text"
                  required
                  placeholder="e.g. Completed AWS Solutions Architect Certification"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      id="post-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PostCategory)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 focus:outline-none appearance-none transition-all duration-200 text-sm"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <FolderOpen className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Event Date *
                  </label>
                  <div className="relative">
                    <input
                      id="post-date-input"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 focus:outline-none transition-all duration-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <div className="relative">
                    <input
                      id="post-location-input"
                      type="text"
                      placeholder="e.g. San Francisco, CA"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm"
                    />
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-450 dark:text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Mood / Activity (Optional)
                  </label>
                  <input
                    id="post-mood-input"
                    type="text"
                    placeholder="e.g. 🚀 Excited & Inspired"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Rich Description
                </label>
                <textarea
                  id="post-desc-input"
                  rows={5}
                  placeholder="Tell your story. Support formatting & detailed documentation here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tags (Press Enter or comma to add)
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[48px] items-center">
                  {tags.map((tag, idx) => (
                    <span
                      key={tag}
                      id={`tag-badge-${tag}`}
                      className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-mono px-2.5 py-1 rounded-lg font-bold"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="post-tag-input"
                    type="text"
                    placeholder={tags.length === 0 ? "e.g. Tech, Cert, AWS" : "Add tag..."}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none text-slate-900 dark:text-slate-200 text-sm py-1 px-2"
                  />
                </div>
              </div>
            </div>

            {/* Right side: Media Uploads & Settings */}
            <div className="space-y-4">
              {/* Media drag-drop zone */}
              <div>
                <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Media Attachments (Images/Videos)
                </label>
                <div
                  id="drag-drop-zone"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[140px] ${
                    dragActive
                      ? 'border-amber-500 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:border-slate-400 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-950/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-slate-450 dark:text-slate-500 mb-2" />
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    Drag & drop files or <span className="text-amber-600 dark:text-amber-400 font-bold">browse</span>
                  </p>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Supports PNG, JPG, GIF, MP4 videos</p>
                </div>
              </div>

              {/* Video URL Add Link */}
              <div>
                <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Or Add Video Link (YouTube or Direct MP4)
                </label>
                <div className="flex gap-2">
                  <input
                    id="video-link-input"
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddVideoLink}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Cloudinary & External Link Section (Zero-Memory Option) */}
              <div className="bg-amber-500/5 dark:bg-amber-500/5 border border-dashed border-amber-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold font-mono text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Cloudinary / External Link <span className="text-amber-600 dark:text-amber-400 font-extrabold text-[10px]">(Zero-Memory Option)</span>
                  </label>
                  <div className="flex gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCloudinaryType('image')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        cloudinaryType === 'image'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      Photo Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setCloudinaryType('video')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        cloudinaryType === 'video'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      Video Link
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    id="cloudinary-link-input"
                    type="text"
                    placeholder={
                      cloudinaryType === 'image'
                        ? 'https://res.cloudinary.com/.../image.jpg'
                        : 'https://res.cloudinary.com/.../video.mp4'
                    }
                    value={cloudinaryUrl}
                    onChange={(e) => setCloudinaryUrl(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCloudinaryLink}
                    className="bg-slate-950 dark:bg-amber-500 hover:bg-slate-900 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-xs px-4 rounded-xl transition-all border border-slate-200 dark:border-slate-800"
                  >
                    Add URL
                  </button>
                </div>
                <p className="text-[10px] font-mono text-slate-550 dark:text-slate-500">
                  Adding directly via URL uses zero local storage space, bypasses file upload limitations completely, and prevents memory limit errors.
                </p>
              </div>

              {/* Media gallery with selection of Cover */}
              {media.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Uploaded Gallery (Click thumbnail to set as Cover Photo)
                  </label>
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[140px] overflow-y-auto">
                    {media.map((item, idx) => (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-lg overflow-hidden border group transition-all cursor-pointer ${
                          coverPhoto === item.url
                            ? 'border-amber-500 ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => item.type === 'image' && handleSetCover(item.url)}
                      >
                        {item.type === 'video' ? (
                          <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                            <VideoIcon className="w-5 h-5 text-slate-450 dark:text-slate-400" />
                            <span className="text-[9px] mt-1 font-mono">Video</span>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Top indicators */}
                        {coverPhoto === item.url && (
                          <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 text-[9px] font-mono px-1 rounded font-bold">
                            Cover
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMedia(idx);
                          }}
                          className="absolute right-1 top-1 bg-red-500/85 hover:bg-red-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-md duration-150"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover presets templates */}
              {media.length === 0 && (
                <div>
                  <label className="block text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Or Choose Template Cover Photo
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMPLE_COVERS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetCover(url)}
                        className={`relative aspect-video rounded-lg overflow-hidden border transition-all ${
                          coverPhoto === url ? 'border-amber-500 scale-102 ring-2 ring-amber-500/10' : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={url}
                          alt="Cover preset"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Pin to Top</span>
                    <span className="text-[10px] text-slate-500">Feature at the top of your feed</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 text-amber-500 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded focus:ring-amber-500 focus:ring-opacity-25"
                  />
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/60 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Save as Draft</span>
                    <span className="text-[10px] text-slate-500">Only visible to you until published</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDraft}
                    onChange={(e) => setIsDraft(e.target.checked)}
                    className="w-4 h-4 text-amber-500 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded focus:ring-amber-500 focus:ring-opacity-25"
                  />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800/60 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300 font-sans">Visibility Setting</span>
                      <span className="text-[10px] text-slate-500">Define access controls for this post</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {(['Public', 'Private', 'Unlisted', 'Scheduled'] as PrivacyLevel[]).map((level) => {
                      const isActive = privacy === level;
                      let Icon = Globe;
                      if (level === 'Private') Icon = Lock;
                      if (level === 'Unlisted') Icon = EyeOff;
                      if (level === 'Scheduled') Icon = Calendar;

                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setPrivacy(level)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all duration-200 ${
                            isActive
                              ? 'border-amber-500/45 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-bold'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 mb-1" />
                          <span className="text-[9px] font-medium font-mono uppercase">{level}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {privacy === 'Scheduled' && (
                  <div className="border-t border-slate-200 dark:border-slate-800/60 pt-3 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                      Schedule Publish Date
                    </label>
                    <input
                      type="date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-slate-950 dark:focus:border-amber-500 text-slate-900 dark:text-slate-200 focus:outline-none text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 z-10 py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 dark:bg-amber-500 dark:hover:bg-amber-600 active:scale-98 text-white dark:text-slate-950 font-bold text-sm transition-all shadow-sm dark:shadow-lg dark:shadow-amber-500/10 flex items-center gap-1.5"
            >
              {editingPost ? 'Update Post' : 'Publish to Timeline'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
