import { create } from "zustand";

export interface CategoryData {
  manufacturers: string[];
  modelsByMaker: Record<string, string[]>;
  systemCategories: string[];
}

const DEFAULT_CATEGORIES: CategoryData = {
  manufacturers: ["볼보건설기계", "HD현대건설기계", "두산인프라코어", "캐터필라(CAT)", "코마츠(Komatsu)", "히타치(Hitachi)", "기타 제조사"],
  modelsByMaker: {
    "볼보건설기계": ["EC60E", "EC140E", "EC210D", "EC300E", "EW140E", "EW205D", "기본 기종"],
    "HD현대건설기계": ["HW145A", "HW210A", "HX140A", "HX220A", "HX300A", "기본 기종"],
    "두산인프라코어": ["DX140W", "DX210W", "DX225LCA", "DX300LC", "DX380LC", "기본 기종"],
    "캐터필라(CAT)": ["CAT 320", "CAT 330", "CAT 336", "CAT M315", "기본 기종"],
    "코마츠(Komatsu)": ["PC200-8", "PC300-8", "PW160-8", "기본 기종"],
    "히타치(Hitachi)": ["ZX140W-6", "ZX200-6", "ZX350LC-6", "기본 기종"],
    "기타 제조사": ["범용 기종", "기본 기종"],
  },
  systemCategories: [
    "전기/전장 회로 (Electric)",
    "메인/파일럿 유압 (Hydraulic)",
    "엔진 및 동력 전달 (Engine)",
    "전자 제어/CAN 통신 (Control)",
    "공조/에어컨 시스템 (HVAC)",
    "안전/제동 장치 (Safety)",
    "일반/기타 도면 (General)",
  ],
};

const STORAGE_KEY = "cad_analyzer_categories_v2";

const loadSavedCategories = (): CategoryData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        manufacturers: Array.from(new Set([...(parsed.manufacturers || []), ...DEFAULT_CATEGORIES.manufacturers])),
        modelsByMaker: { ...DEFAULT_CATEGORIES.modelsByMaker, ...(parsed.modelsByMaker || {}) },
        systemCategories: Array.from(new Set([...(parsed.systemCategories || []), ...DEFAULT_CATEGORIES.systemCategories])),
      };
    }
  } catch (e) {
    console.error("Failed to load categories from localStorage:", e);
  }
  return DEFAULT_CATEGORIES;
};

const saveCategoriesToStorage = (data: CategoryData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save categories to localStorage:", e);
  }
};

interface CategoryState {
  categories: CategoryData;
  selectedManufacturer: string;
  selectedModel: string;
  selectedSystemCategory: string;
  drawingTitle: string;

  setSelectedManufacturer: (maker: string) => void;
  setSelectedModel: (model: string) => void;
  setSelectedSystemCategory: (cat: string) => void;
  setDrawingTitle: (title: string) => void;

  // 동적 분류 항목 추가 / 삭제
  addManufacturer: (name: string) => void;
  addModel: (maker: string, modelName: string) => void;
  addSystemCategory: (name: string) => void;
  removeManufacturer: (name: string) => void;
  removeModel: (maker: string, modelName: string) => void;
  removeSystemCategory: (name: string) => void;
  resetToDefaults: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => {
  const initial = loadSavedCategories();

  return {
    categories: initial,
    selectedManufacturer: "",
    selectedModel: "",
    selectedSystemCategory: "",
    drawingTitle: "",

    setSelectedManufacturer: (maker) => {
      const { categories } = get();
      const availableModels = categories.modelsByMaker[maker] || [];
      set({
        selectedManufacturer: maker,
        selectedModel: availableModels[0] || "",
      });
    },

    setSelectedModel: (model) => set({ selectedModel: model }),
    setSelectedSystemCategory: (cat) => set({ selectedSystemCategory: cat }),
    setDrawingTitle: (title) => set({ drawingTitle: title }),

    addManufacturer: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => {
        if (state.categories.manufacturers.includes(trimmed)) return state;
        const newMakers = [...state.categories.manufacturers, trimmed];
        const newModelsByMaker = {
          ...state.categories.modelsByMaker,
          [trimmed]: state.categories.modelsByMaker[trimmed] || ["기본 기종"],
        };
        const nextData = {
          ...state.categories,
          manufacturers: newMakers,
          modelsByMaker: newModelsByMaker,
        };
        saveCategoriesToStorage(nextData);
        return {
          categories: nextData,
          selectedManufacturer: trimmed,
          selectedModel: "기본 기종",
        };
      });
    },

    addModel: (maker, modelName) => {
      const trimmed = modelName.trim();
      if (!trimmed) return;
      set((state) => {
        const currentList = state.categories.modelsByMaker[maker] || [];
        if (currentList.includes(trimmed)) return state;
        const newList = [...currentList, trimmed];
        const nextData = {
          ...state.categories,
          modelsByMaker: {
            ...state.categories.modelsByMaker,
            [maker]: newList,
          },
        };
        saveCategoriesToStorage(nextData);
        return {
          categories: nextData,
          selectedModel: trimmed,
        };
      });
    },

    addSystemCategory: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => {
        if (state.categories.systemCategories.includes(trimmed)) return state;
        const nextList = [...state.categories.systemCategories, trimmed];
        const nextData = {
          ...state.categories,
          systemCategories: nextList,
        };
        saveCategoriesToStorage(nextData);
        return {
          categories: nextData,
          selectedSystemCategory: trimmed,
        };
      });
    },

    removeManufacturer: (name) => {
      set((state) => {
        const nextMakers = state.categories.manufacturers.filter((m) => m !== name);
        const { [name]: _, ...restModels } = state.categories.modelsByMaker;
        const nextData = {
          ...state.categories,
          manufacturers: nextMakers,
          modelsByMaker: restModels,
        };
        saveCategoriesToStorage(nextData);
        return {
          categories: nextData,
          selectedManufacturer: nextMakers[0] || "기타 제조사",
          selectedModel: (nextData.modelsByMaker[nextMakers[0]] || ["기본 기종"])[0],
        };
      });
    },

    removeModel: (maker, modelName) => {
      set((state) => {
        const currentList = state.categories.modelsByMaker[maker] || [];
        const nextList = currentList.filter((m) => m !== modelName);
        const nextData = {
          ...state.categories,
          modelsByMaker: {
            ...state.categories.modelsByMaker,
            [maker]: nextList.length > 0 ? nextList : ["기본 기종"],
          },
        };
        saveCategoriesToStorage(nextData);
        return {
          categories: nextData,
          selectedModel: nextData.modelsByMaker[maker][0],
        };
      });
    },

    removeSystemCategory: (name) => {
      set((state) => {
        const nextList = state.categories.systemCategories.filter((c) => c !== name);
        const nextData = {
          ...state.categories,
          systemCategories: nextList.length > 0 ? nextList : ["일반/기타 도면"],
        };
        saveCategoriesToStorage(nextData);
        return {
          categories: nextData,
          selectedSystemCategory: nextData.systemCategories[0],
        };
      });
    },

    resetToDefaults: () => {
      saveCategoriesToStorage(DEFAULT_CATEGORIES);
      set({
        categories: DEFAULT_CATEGORIES,
        selectedManufacturer: "볼보건설기계",
        selectedModel: "EC60E",
        selectedSystemCategory: "⚡ 전기/전장 회로 (Electric)",
      });
    },
  };
});
