export interface Channel {
  id: string;
  name: string;
  url: string;
  category: 'News' | 'Entertainment' | 'Sports' | 'Community' | 'Faith' | string;
  color: string;
  logo?: string;
}

export interface AppTool {
  id: string;
  name: string;
  desc: string;
  cat: 'create' | 'media' | 'dev' | 'daily' | 'text' | string;
  ico: string;
  type: string;
}

export interface GameItem {
  id: string;
  name: string;
  desc: string;
  cat: 'puzzle' | 'arcade' | 'board' | 'casual' | string;
  ico: string;
}

export interface MovieItem {
  id: string;
  title: string;
  cleanTitle: string;
  vj: string;
  videoUrl: string;
  poster: string;
  summary: string;
  content: string;
  categories: string[];
  published: string;
  url: string;
}

export interface BlogPost {
  id: string;
  title: string;
  published: string;
  updated?: string;
  content: string;
  summary: string;
  thumbnail: string;
  author: {
    name: string;
    avatar?: string;
  };
  categories: string[];
  url: string;
}

export interface StaticPageData {
  title: string;
  url: string;
  contentHtml: string;
  published?: string;
}

export type TabType = 'home' | 'tv' | 'firimu' | 'blogs' | 'apps' | 'games' | 'jobs' | 'catalogue';
