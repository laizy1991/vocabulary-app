import { create } from 'zustand';

interface Vocabulary {
  id: string;
  word: string;
  pinyin?: string;
  meaning?: string;
  english_meaning?: string;
  level?: string;
  category?: string;
  status?: string;
  review_count?: number;
  correct_count?: number;
  created_at?: string;
}

interface VocabularyState {
  vocabularies: Vocabulary[];
  loading: boolean;
  error: string | null;
  setVocabularies: (vocabularies: Vocabulary[]) => void;
  addVocabulary: (vocabulary: Vocabulary) => void;
  updateVocabulary: (id: string, data: Partial<Vocabulary>) => void;
  deleteVocabulary: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useVocabularyStore = create<VocabularyState>((set) => ({
  vocabularies: [],
  loading: false,
  error: null,
  
  setVocabularies: (vocabularies) => set({ vocabularies }),
  
  addVocabulary: (vocabulary) => set((state) => ({
    vocabularies: [...state.vocabularies, vocabulary]
  })),
  
  updateVocabulary: (id, data) => set((state) => ({
    vocabularies: state.vocabularies.map(v => 
      v.id === id ? { ...v, ...data } : v
    )
  })),
  
  deleteVocabulary: (id) => set((state) => ({
    vocabularies: state.vocabularies.filter(v => v.id !== id)
  })),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
}));