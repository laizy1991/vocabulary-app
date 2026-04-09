export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  created_at?: string;
  last_login_at?: string;
}

export interface Vocabulary {
  id: string;
  user_id?: string;
  word: string;
  pinyin?: string;
  meaning?: string;
  english_meaning?: string;
  detail?: string;
  phrases?: string;
  sentences?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  status?: 'new' | 'learning' | 'mastered';
  review_count?: number;
  correct_count?: number;
  last_reviewed_at?: string;
  language?: string;
  ai_generated?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  count?: number;
}

export interface Exercise {
  id: string;
  user_id?: string;
  type: 'choice' | 'fill' | 'match';
  title?: string;
  questions?: any[];
  vocabulary_ids?: string[];
  completed?: boolean;
  score?: number;
}

export interface WrongAnswer {
  id: string;
  vocabulary_id: string;
  exercise_id?: string;
  question_type?: string;
  user_answer?: string;
  correct_answer?: string;
  solved?: boolean;
}