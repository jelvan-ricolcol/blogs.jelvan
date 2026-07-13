import { TimelinePost, PostComment, SystemNotification, VisitorStat } from '../types';

export const INITIAL_POSTS: TimelinePost[] = [
  {
    id: 'p1',
    title: 'AWS Certified Solutions Architect Certification',
    description: 'Passed the Solutions Architect Associate exam with a score of 912! This certification validates my expertise in designing and deploying secure, robust, and scalable systems on cloud technologies.',
    category: 'Certifications',
    date: '2026-06-15',
    location: 'Remote Test Center',
    tags: ['Cloud', 'AWS', 'Architecture', 'DevOps'],
    privacy: 'Public',
    coverPhoto: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80' }
    ],
    mood: '🎓 Accomplished',
    isPinned: true,
    views: 342,
    likes: 85,
    shareCount: 12
  },
  {
    id: 'p2',
    title: 'Exploring Kyoto: Traditional Temples & Bamboo Forests',
    description: 'Spent an unforgettable week exploring Kyoto. Walked through the Fushimi Inari gates at sunrise, walked the Arashiyama bamboo path, and experienced a traditional tea ceremony in Gion. The blend of rich history and serene nature was deeply inspiring.',
    category: 'Travel',
    date: '2026-05-10',
    location: 'Kyoto, Japan',
    tags: ['Travel', 'Adventure', 'Kyoto', 'Japan'],
    privacy: 'Public',
    coverPhoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=80' }
    ],
    mood: '⛩️ Reflected & Peaceful',
    views: 612,
    likes: 142,
    shareCount: 28
  },
  {
    id: 'p3',
    title: 'Joined Acme Corp as Lead Frontend Architect',
    description: 'I’m excited to share that I’ve joined Acme Corp as Lead Frontend Architect! I will be spearheading the transition to a modern React & Tailwind-based micro-frontend architecture and mentoring our engineering teams.',
    category: 'Career',
    date: '2026-04-01',
    location: 'San Francisco, CA',
    tags: ['Career', 'Engineering', 'React', 'Leadership'],
    privacy: 'Public',
    coverPhoto: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80' }
    ],
    mood: '🚀 Fired up!',
    isPinned: false,
    views: 921,
    likes: 218,
    shareCount: 45
  },
  {
    id: 'p4',
    title: 'Completed the Big Sur International Marathon',
    description: 'My first full marathon! Cruising along Highway 1 with the dramatic Pacific coastline as the backdrop was breathtaking. Finished with a personal best of 3:54:12. The final 5 miles were pure mind-over-matter, but crossing that finish line made every single 5 AM training run worth it.',
    category: 'Personal',
    date: '2026-03-22',
    location: 'Big Sur, California',
    tags: ['Marathon', 'Fitness', 'Milestone', 'Running'],
    privacy: 'Public',
    coverPhoto: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80' }
    ],
    mood: '🏃‍♂️ Exhausted but Victorious',
    views: 489,
    likes: 124,
    shareCount: 9
  },
  {
    id: 'p5',
    title: 'NextGen SaaS Dashboard v2 Release',
    description: 'After 3 months of intense design and engineering, we have officially shipped v2 of the NextGen SaaS Dashboard. Built with React 19, Tailwind CSS v4, and D3.js. Performance is improved by 40%, and we added real-time canvas visualizations.',
    category: 'Projects',
    date: '2026-02-18',
    location: 'Remote Workspace',
    tags: ['OpenSource', 'SaaS', 'Tailwind', 'React'],
    privacy: 'Public',
    coverPhoto: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80' }
    ],
    mood: '🎉 Celebrating',
    views: 550,
    likes: 112,
    shareCount: 19
  },
  {
    id: 'p6',
    title: 'Future Ideas & Draft - Personal Brand Revamp',
    description: 'This is a draft outlining the core values, colors, typography, and structure of my new personal portfolio timeline. Keep the palette deep slate and glassmorphism, focus on storytelling.',
    category: 'Personal',
    date: '2026-07-10',
    location: 'Home Office',
    tags: ['Design', 'Notes', 'Draft'],
    privacy: 'Private',
    coverPhoto: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    media: [],
    isDraft: true,
    views: 0,
    likes: 0,
    shareCount: 0
  },
  {
    id: 'p7',
    title: 'Upcoming Tech Keynote: Building for Scale',
    description: 'Excited to announce my upcoming keynote presentation on designing frontend micro-architectures that scale past 100+ engineers. I will go through component decoupling, package virtualization, and cross-team code-sharing mechanisms.',
    category: 'Events',
    date: '2026-08-15',
    location: 'Moscone Center, SF',
    tags: ['TechConf', 'Keynote', 'SoftwareScale'],
    privacy: 'Scheduled',
    coverPhoto: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    media: [],
    publishDate: '2026-08-01',
    views: 0,
    likes: 0,
    shareCount: 0
  }
];

export const INITIAL_COMMENTS: PostComment[] = [
  {
    id: 'c1',
    postId: 'p1',
    postTitle: 'AWS Certified Solutions Architect Certification',
    authorName: 'Alex River',
    authorAvatar: 'bg-indigo-500',
    content: 'Huge congratulations! The score is incredible! I am planning to take mine next month, do you have any tips on mock exams?',
    timestamp: '2026-06-15T14:30:22.000Z',
    likes: 5,
    isReported: false,
    status: 'approved',
    isPinned: true
  },
  {
    id: 'c2',
    postId: 'p1',
    postTitle: 'AWS Certified Solutions Architect Certification',
    authorName: 'Sarah K.',
    authorAvatar: 'bg-emerald-500',
    content: 'Awesome job! AWS is no joke. Welcome to the certified club! ☁️',
    timestamp: '2026-06-15T16:15:10.000Z',
    likes: 3,
    isReported: false,
    status: 'approved'
  },
  {
    id: 'c3',
    postId: 'p2',
    postTitle: 'Exploring Kyoto: Traditional Temples & Bamboo Forests',
    authorName: 'Sophia G.',
    authorAvatar: 'bg-pink-500',
    content: 'Kyoto is magical! Your photos captured the atmosphere perfectly. Did you visit the Golden Pavilion as well?',
    timestamp: '2026-05-11T09:12:00.000Z',
    likes: 8,
    isReported: false,
    status: 'approved'
  },
  {
    id: 'c4',
    postId: 'p2',
    postTitle: 'Exploring Kyoto: Traditional Temples & Bamboo Forests',
    authorName: 'SpammyBot',
    authorAvatar: 'bg-amber-500',
    content: 'Get rich fast! Visit http://shady-link-fake-casino.com to make $1000/day work from home guaranteed!!!',
    timestamp: '2026-05-11T12:05:44.000Z',
    likes: 0,
    isReported: true,
    status: 'hidden'
  },
  {
    id: 'c5',
    postId: 'p3',
    postTitle: 'Joined Acme Corp as Lead Frontend Architect',
    authorName: 'Michael Chen',
    authorAvatar: 'bg-blue-500',
    content: 'Acme is extremely lucky to have you. Can’t wait to see the amazing architecture you build there! Let’s catch up over coffee soon.',
    timestamp: '2026-04-01T10:02:15.000Z',
    likes: 12,
    isReported: false,
    status: 'approved'
  },
  {
    id: 'c6',
    postId: 'p3',
    postTitle: 'Joined Acme Corp as Lead Frontend Architect',
    authorName: 'Anonymous Wanderer',
    authorAvatar: 'bg-slate-500',
    content: 'This post is stupid and you are a terrible programmer.',
    timestamp: '2026-04-01T11:40:00.000Z',
    likes: 0,
    isReported: true,
    status: 'pending'
  }
];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'n1',
    type: 'comment',
    title: 'New Comment Recieved',
    message: 'Alex River commented on "AWS Certified Solutions Architect Certification".',
    timestamp: '2026-06-15T14:30:22.000Z',
    read: false,
    postId: 'p1',
    commentId: 'c1'
  },
  {
    id: 'n2',
    type: 'report',
    title: 'Comment Reported',
    message: 'A visitor reported a comment by "SpammyBot" on "Exploring Kyoto". Reason: Link Spam.',
    timestamp: '2026-05-11T12:10:00.000Z',
    read: true,
    postId: 'p2',
    commentId: 'c4'
  },
  {
    id: 'n3',
    type: 'scheduled_published',
    title: 'Post Published',
    message: 'Your scheduled post "Future of Serverless Web Frameworks" was successfully published.',
    timestamp: '2026-03-01T08:00:00.000Z',
    read: true,
    postId: 'p5'
  }
];

export const VISITOR_STATS: VisitorStat[] = [
  { date: 'Feb 2026', views: 820, visitors: 340 },
  { date: 'Mar 2026', views: 1200, visitors: 480 },
  { date: 'Apr 2026', views: 2450, visitors: 980 },
  { date: 'May 2026', views: 3100, visitors: 1150 },
  { date: 'Jun 2026', views: 4200, visitors: 1600 },
  { date: 'Jul 2026', views: 4800, visitors: 1950 }
];

export const OFFENSIVE_WORDS = ['stupid', 'idiot', 'casino', 'bitcoin', 'scam', 'shady', 'fuck', 'shit', 'asshole'];
