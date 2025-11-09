import { create } from 'zustand';

interface ProfileStore {
  isUploading: boolean;
  uploadProgress: number;
  setUploading: (uploading: boolean) => void;
  setProgress: (progress: number) => void;
  resetProgress: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  isUploading: false,
  uploadProgress: 0,

  setUploading: (uploading) => set({ isUploading: uploading }),

  setProgress: (progress) => set({ uploadProgress: progress }),

  resetProgress: () => set({ uploadProgress: 0, isUploading: false }),
}));
