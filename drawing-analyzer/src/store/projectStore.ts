import { create } from "zustand";
import type { Project } from "../types/project";

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  createProject: (name: string, maker?: string, model?: string, category?: string) => Project;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  createProject: (name, maker = "볼보건설기계", model = "EC60E", category = "⚡ 전기/전장 회로 (Electric)") => {
    const newProj: Project = {
      id: "proj_" + Math.random().toString(36).substring(2, 9),
      name,
      manufacturer: maker,
      model,
      systemCategory: category,
      drawingTitle: name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
      appVersion: "0.1.0",
    };
    set((state) => ({
      projects: [...state.projects, newProj],
      currentProject: newProj,
    }));
    return newProj;
  },
}));
