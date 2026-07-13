import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: { type: 'image' | 'video'; url: string }[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

export default function MediaLightbox({
  isOpen,
  onClose,
  mediaList,
  currentIndex,
  setCurrentIndex,
}: MediaLightboxProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && mediaList.length > 1) {
        setCurrentIndex((currentIndex + 1) % mediaList.length);
      }
      if (e.key === 'ArrowLeft' && mediaList.length > 1) {
        setCurrentIndex((currentIndex - 1 + mediaList.length) % mediaList.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, mediaList, onClose, setCurrentIndex]);

  if (!isOpen || mediaList.length === 0) return null;

  const currentMedia = mediaList[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((currentIndex - 1 + mediaList.length) % mediaList.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((currentIndex + 1) % mediaList.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        id="lightbox-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
      >
        {/* Top bar with counter and close */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 text-white/80 font-mono text-sm">
          <div>
            Media {currentIndex + 1} / {mediaList.length}
          </div>
          <button
            id="lightbox-close"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Previous Button */}
        {mediaList.length > 1 && (
          <button
            id="lightbox-prev"
            onClick={handlePrev}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10 duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {mediaList.length > 1 && (
          <button
            id="lightbox-next"
            onClick={handleNext}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10 duration-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Content Frame */}
        <motion.div
          id="lightbox-content"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-5xl max-h-[85vh] flex items-center justify-center relative rounded-xl overflow-hidden"
        >
          {currentMedia.type === 'video' ? (
            <div className="relative aspect-video w-full max-w-4xl bg-black rounded-lg overflow-hidden border border-white/10 shadow-2xl">
              {currentMedia.url.includes('youtube.com') || currentMedia.url.includes('youtu.be') ? (
                <iframe
                  id="lightbox-iframe"
                  src={
                    currentMedia.url.includes('embed')
                      ? currentMedia.url
                      : currentMedia.url.replace('watch?v=', 'embed/')
                  }
                  title="Video Player"
                  className="w-full h-full aspect-video"
                  allowFullScreen
                />
              ) : (
                <video
                  id="lightbox-video"
                  src={currentMedia.url}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          ) : (
            <img
              id="lightbox-img"
              src={currentMedia.url}
              alt="Lightbox Content"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-lg border border-white/10 shadow-2xl"
            />
          )}
        </motion.div>

        {/* Thumbnail gallery preview at the bottom */}
        {mediaList.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-full p-2 z-10">
            {mediaList.map((item, idx) => (
              <button
                key={idx}
                id={`lightbox-thumb-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                  currentIndex === idx ? 'border-amber-500 scale-105' : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                    <Play className="w-4 h-4 fill-white" />
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
