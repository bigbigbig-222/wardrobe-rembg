const CATEGORY_LIST = ["短袖上衣", "长袖上衣", "短裤", "长裤", "鞋履", "配饰"];
const SEASON_LIST = ["春秋", "夏季", "冬季", "四季"];
const COLOR_LIST = ["黑色", "白色", "灰色", "蓝色", "绿色", "红色", "米色", "棕色", "黄色", "紫色", "粉色"];

// GitHub 同步配置 - 默认 Worker URL 已配置，用户可在设置中覆盖
const GITHUB_SYNC_CONFIG = {
  // 默认 Worker URL（来自 Cloudflare Worker）
  DEFAULT_WORKER_URL: 'https://wardrobe-sync.454268258.workers.dev/',
  
  getWorkerUrl: function() {
    // 优先使用 localStorage 中的设置，否则使用默认 URL
    return localStorage.getItem('githubSyncWorkerUrl') || this.DEFAULT_WORKER_URL;
  },
  
  setWorkerUrl: function(url) {
    if (url) {
      localStorage.setItem('githubSyncWorkerUrl', url);
    } else {
      localStorage.removeItem('githubSyncWorkerUrl');
    }
  },
  
  isEnabled: function() {
    return !!this.getWorkerUrl();
  }
};

// AI 背景去除配置（本地 MediaPipe 分割，无需服务器）
const REMBG_CONFIG = {
  isLocalMode: true, // 使用本地处理，无需远程 API
  
  // 保留这些方法以兼容旧代码，但在本地模式下不使用
  getApiUrl: function() {
    return localStorage.getItem('rembgApiUrl') || '';
  },
  
  setApiUrl: function(url) {
    if (url) {
      localStorage.setItem('rembgApiUrl', url);
    } else {
      localStorage.removeItem('rembgApiUrl');
    }
  },
  
  isEnabled: function() {
    return true; // 本地模式总是启用
  }
};

// 主要品牌（精简常用，不预置过多）
const MAJOR_BRAND_LIST = [
  "Uniqlo",
  "MUJI",
  "ZARA",
  "H&M",
  "GAP",
  "Levi's",
  "Nike",
  "Adidas",
  "Puma",
  "New Balance",
  "Converse",
  "Vans",
  "Skechers",
  "ANTA",
  "Li-Ning",
  "FILA",
  "The North Face",
  "Columbia",
  "Lululemon",
  "Massimo Dutti",
];

const OUTDOOR_BRAND_LIST = [
  "mont-bell",
  "Arc'teryx",
  "KEEN",
  "Nanamica",
  "Patagonia",
  "The North Face",
  "Columbia",
  "Mammut",
  "Salomon",
  "Merrell",
  "HOKA",
  "On",
  "Black Diamond",
  "Snow Peak",
  "Deuter",
  "Osprey",
  "Jack Wolfskin",
];

const PRESET_LOGO_BRANDS = [...new Set([...MAJOR_BRAND_LIST, ...OUTDOOR_BRAND_LIST])];

// 服装和配饰尺码（除鞋履外）
const SIZE_CLOTHING = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

// 鞋履尺码
const SIZE_SHOES = ["35", "35.5", "36", "36.5", "37", "37.5", "38", "38.5", "39", "39.5", "40", "40.5", "41", "41.5", "42", "42.5", "43", "43.5", "44", "44.5", "45", "45.5", "46"];

const STORAGE_KEY = "virtual-wardrobe-items-v3";
const FAVORITE_LOOKS_KEY = "virtual-wardrobe-favorite-looks-v1";
const BRAND_CATALOG_KEY = "virtual-wardrobe-brand-catalog-v1";
const BRAND_LOGOS_KEY = "virtual-wardrobe-brand-logos-v1";
const ACTIVE_USER_KEY = "virtual-wardrobe-active-user-v1";
const KNOWN_USERS_KEY = "virtual-wardrobe-known-users-v1";
const LEGACY_USER_MIGRATION_KEY = "virtual-wardrobe-legacy-user-migrated-v1";
const BLANK_BRAND_LOGO =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#fff9ef" stroke="#d8c9af"/><path d="M6 16l4-4 3 3 5-5" stroke="#ccb998" stroke-width="1.4" fill="none"/></svg>'
  );
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e7dcc8"/><path d="M34 85V36h52v49z" fill="#c4ae8a"/><circle cx="60" cy="54" r="10" fill="#e7dcc8"/></svg>'
  );

const state = {
  items: loadItems(),
  favoriteLooks: loadFavoriteLooks(),
  brandCatalog: loadBrandCatalog(),
  brandLogos: loadBrandLogos(),
  currentUsername: loadPersistedActiveUsername(),
  imageDataList: [],
  coverImageIndex: 0,
  editingId: "",
  activeView: "wardrobe",
  activeCategory: "all",
  importMode: "merge",
  importFileType: "json",
  importScope: "items",
  currentRecommendations: [],
  manualLookDraft: {
    topId: "",
    bottomId: "",
    shoesId: "",
    accessoryId: "",
  },
  manualLookPickerTarget: "",
  pendingDeleteLookId: "",
  conflictResolver: null,
  conflictStrategy: "ask",
  brandLibraryMultiSelectMode: false,
  brandLibrarySearchQuery: "",
};

const imageEditorState = {
  sourceCanvas: document.createElement("canvas"),
  rotation: 0,
  activeTool: null,
  isCropMode: false,
  isDragging: false,
  cropRect: null,
  dragStart: null,
  eraserSize: 18,
  eraserCursorPos: null,
  history: [],
  historyIndex: -1,
  cutoutMode: false,
  markMode: null, // "fg" | "bg" | null
  markRadius: 14,
  fgPoints: [], // {x, y}
  bgPoints: [],
};

let imageEditorRenderScheduled = false;
let pendingAppConfirmAction = null;
let pendingAppPromptSubmit = null;
let pendingSyncDecisionContext = null;
let userMenuOpen = false;
let pendingAppConfirmResolve = null;
let pendingAppPromptResolve = null;

const refs = {
        editorDoCutoutBtn: document.getElementById("editorDoCutoutBtn"),
        editorExitCutoutBtn: document.getElementById("editorExitCutoutBtn"),
      cutoutMarkBtns: document.getElementById("cutoutMarkBtns"),
    editorFgMarkBtn: document.getElementById("editorFgMarkBtn"),
    editorBgMarkBtn: document.getElementById("editorBgMarkBtn"),
  editorMarkControl: document.getElementById("editorMarkControl"),
  editorMarkSlider: document.getElementById("editorMarkSlider"),
  editorMarkSize: document.getElementById("editorMarkSize"),
  categoryGrid: document.getElementById("categoryGrid"),
  totalCount: document.getElementById("totalCount"),
  resultCount: document.getElementById("resultCount"),
  categoryViewLabel: document.getElementById("categoryViewLabel"),
  clearCategoryView: document.getElementById("clearCategoryView"),
  filterForm: document.getElementById("filterForm"),
  filterCategory: document.getElementById("filterCategory"),
  filterBrand: document.getElementById("filterBrand"),
  filterBrandWrap: document.getElementById("brandFilterWrap"),
  filterBrandTrigger: document.getElementById("filterBrandTrigger"),
  filterBrandMenu: document.getElementById("filterBrandMenu"),
  filterColor: document.getElementById("filterColor"),
  filterSeason: document.getElementById("filterSeason"),
  filterPriceRange: document.getElementById("filterPriceRange"),
  sortOrder: document.getElementById("sortOrder"),
  searchInput: document.getElementById("searchInput"),
  clearCurrentFilters: document.getElementById("clearCurrentFilters"),
  resetFilters: document.getElementById("resetFilters"),
  clothesList: document.getElementById("clothesList"),
  cardTemplate: document.getElementById("clothingCardTemplate"),
  recommendCardTemplate: document.getElementById("recommendCardTemplate"),
  recommendList: document.getElementById("recommendList"),
  recommendCount: document.getElementById("recommendCount"),
  favoriteList: document.getElementById("favoriteList"),
  favoriteCount: document.getElementById("favoriteCount"),
  openManualLookBtn: document.getElementById("openManualLookBtn"),
  manualLookDialog: document.getElementById("manualLookDialog"),
  manualLookForm: document.getElementById("manualLookForm"),
  closeManualLookDialog: document.getElementById("closeManualLookDialog"),
  cancelManualLook: document.getElementById("cancelManualLook"),
  manualLookTitle: document.getElementById("manualLookTitle"),
  pickManualTopBtn: document.getElementById("pickManualTopBtn"),
  pickManualBottomBtn: document.getElementById("pickManualBottomBtn"),
  pickManualShoesBtn: document.getElementById("pickManualShoesBtn"),
  pickManualAccessoryBtn: document.getElementById("pickManualAccessoryBtn"),
  manualLookTopPreview: document.getElementById("manualLookTopPreview"),
  manualLookBottomPreview: document.getElementById("manualLookBottomPreview"),
  manualLookShoesPreview: document.getElementById("manualLookShoesPreview"),
  manualLookAccessoryPreview: document.getElementById("manualLookAccessoryPreview"),
  manualLookPickerDialog: document.getElementById("manualLookPickerDialog"),
  manualLookPickerTitle: document.getElementById("manualLookPickerTitle"),
  manualLookPickerList: document.getElementById("manualLookPickerList"),
  closeManualLookPickerDialog: document.getElementById("closeManualLookPickerDialog"),
  clearManualLookPickerBtn: document.getElementById("clearManualLookPickerBtn"),
  weatherSelect: document.getElementById("weatherSelect"),
  sceneSelect: document.getElementById("sceneSelect"),
  lockTopSelect: document.getElementById("lockTopSelect"),
  lockBottomSelect: document.getElementById("lockBottomSelect"),
  lockAccessorySelect: document.getElementById("lockAccessorySelect"),
  refreshRecommend: document.getElementById("refreshRecommend"),
  addDialog: document.getElementById("addDialog"),
  addForm: document.getElementById("addForm"),
  addBrandWrap: document.getElementById("addBrandWrap"),
  addBrandInput: document.getElementById("addBrandInput"),
  addBrandTrigger: document.getElementById("addBrandTrigger"),
  addBrandMenu: document.getElementById("addBrandMenu"),
  createBrandDialog: document.getElementById("createBrandDialog"),
  createBrandForm: document.getElementById("createBrandForm"),
  closeCreateBrandDialog: document.getElementById("closeCreateBrandDialog"),
  cancelCreateBrand: document.getElementById("cancelCreateBrand"),
  newBrandNameInput: document.getElementById("newBrandNameInput"),
  newBrandLogoInput: document.getElementById("newBrandLogoInput"),
  brandLogoPreview: document.getElementById("brandLogoPreview"),
  brandLogoPreviewWrap: document.getElementById("brandLogoPreviewWrap"),
  clearBrandLogoBtn: document.getElementById("clearBrandLogoBtn"),
  editBrandDialog: document.getElementById("editBrandDialog"),
  editBrandForm: document.getElementById("editBrandForm"),
  closeEditBrandDialog: document.getElementById("closeEditBrandDialog"),
  cancelEditBrand: document.getElementById("cancelEditBrand"),
  editBrandNameInput: document.getElementById("editBrandNameInput"),
  editBrandLogoInput: document.getElementById("editBrandLogoInput"),
  editBrandLogoPreview: document.getElementById("editBrandLogoPreview"),
  editBrandLogoPreviewWrap: document.getElementById("editBrandLogoPreviewWrap"),
  clearEditBrandLogoBtn: document.getElementById("clearEditBrandLogoBtn"),
  brandLibraryDialog: document.getElementById("brandLibraryDialog"),
  closeBrandLibraryDialog: document.getElementById("closeBrandLibraryDialog"),
  brandLibrarySearchInput: document.getElementById("brandLibrarySearchInput"),
  brandLibraryList: document.getElementById("brandLibraryList"),
  toggleBrandMultiSelectBtn: document.getElementById("toggleBrandMultiSelectBtn"),
  deleteSelectedBrandsBtn: document.getElementById("deleteSelectedBrandsBtn"),
  openCreateBrandFromLibrary: document.getElementById("openCreateBrandFromLibrary"),
  addCategory: document.getElementById("addCategory"),
  addSize: document.getElementById("addSize"),
  addSeason: document.getElementById("addSeason"),
  addColor: document.getElementById("addColor"),
  customColorInput: document.getElementById("customColorInput"),
  imageInput: document.getElementById("imageInput"),
  previewWrap: document.getElementById("previewWrap"),
  previewImage: document.getElementById("previewImage"),
  imageGallery: document.getElementById("imageGallery"),
  openImageEditorBtn: document.getElementById("openImageEditorBtn"),
  imageEditorDialog: document.getElementById("imageEditorDialog"),
  closeImageEditorDialog: document.getElementById("closeImageEditorDialog"),
  cancelImageEditorBtn: document.getElementById("cancelImageEditorBtn"),
  applyImageEditorBtn: document.getElementById("applyImageEditorBtn"),
  editorCropModeBtn: document.getElementById("editorCropModeBtn"),
  editorEraserModeBtn: document.getElementById("editorEraserModeBtn"),
  editorApplyCropBtn: document.getElementById("editorApplyCropBtn"),
  editorRotateModeBtn: document.getElementById("editorRotateModeBtn"),
  editorUndoBtn: document.getElementById("editorUndoBtn"),
  editorRedoBtn: document.getElementById("editorRedoBtn"),
  editorCutoutBtn: document.getElementById("editorCutoutBtn"),
  editorRemoveBgBtn: document.getElementById("editorRemoveBgBtn"),
  editorToolbarCrop: document.getElementById("editorToolbarCrop"),
  editorToolbarRotate: document.getElementById("editorToolbarRotate"),
  editorEraserControl: document.getElementById("editorEraserControl"),
  editorEraserSlider: document.getElementById("editorEraserSlider"),
  editorEraserSize: document.getElementById("editorEraserSize"),
  editorMirrorBtn: document.getElementById("editorMirrorBtn"),
  editorApplyRotateBtn: document.getElementById("editorApplyRotateBtn"),
  imageEditorHint: document.getElementById("imageEditorHint"),
  editorUnsavedBanner: document.getElementById("editorUnsavedBanner"),
  editorUnsavedCancelBtn: document.getElementById("editorUnsavedCancelBtn"),
  editorUnsavedConfirmBtn: document.getElementById("editorUnsavedConfirmBtn"),
  imageEditorCanvasWrap: document.getElementById("imageEditorCanvasWrap"),
  imageEditorCanvas: document.getElementById("imageEditorCanvas"),
  openAddFromHero: document.getElementById("openAddFromHero"),
  openBrandLibraryBtn: document.getElementById("openBrandLibraryBtn"),
  openSyncDataBtn: document.getElementById("openSyncDataBtn"),
  openAddFab: document.getElementById("openAddFab"),
  closeDialog: document.getElementById("closeDialog"),
  cancelAdd: document.getElementById("cancelAdd"),
  addUnsavedBanner: document.getElementById("addUnsavedBanner"),
  addUnsavedCancelBtn: document.getElementById("addUnsavedCancelBtn"),
  addUnsavedConfirmBtn: document.getElementById("addUnsavedConfirmBtn"),
  dialogTitle: document.getElementById("addDialogTitle"),
  submitButton: document.getElementById("saveClothBtn"),
  tabWardrobe: document.getElementById("tabWardrobe"),
  tabRecommend: document.getElementById("tabRecommend"),
  wardrobePanel: document.getElementById("wardrobePanel"),
  filterPanel: document.getElementById("filterPanel"),
  listPanel: document.getElementById("listPanel"),
  recommendPanel: document.getElementById("recommendPanel"),
  wardrobeActions: document.getElementById("wardrobeActions"),
  ioMenu: document.getElementById("ioMenu"),
  userMenuWrap: document.getElementById("userMenuWrap"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  userMenuPanel: document.getElementById("userMenuPanel"),
  currentUsernameText: document.getElementById("currentUsernameText"),
  logoutUserBtn: document.getElementById("logoutUserBtn"),
  weatherInfo: document.getElementById("weatherInfo"),
  weatherIcon: document.getElementById("weatherIcon"),
  refreshWeatherBtn: document.getElementById("refreshWeatherBtn"),
  importModeDialog: document.getElementById("importModeDialog"),
  importModeHint: document.getElementById("importModeHint"),
  importScopeField: document.getElementById("importScopeField"),
  importScopeSelect: document.getElementById("importScopeSelect"),
  closeImportModeDialog: document.getElementById("closeImportModeDialog"),
  chooseImportMerge: document.getElementById("chooseImportMerge"),
  chooseImportOverwrite: document.getElementById("chooseImportOverwrite"),
  exportScopeDialog: document.getElementById("exportScopeDialog"),
  exportScopeHint: document.getElementById("exportScopeHint"),
  closeExportScopeDialog: document.getElementById("closeExportScopeDialog"),
  chooseExportFull: document.getElementById("chooseExportFull"),
  chooseExportItems: document.getElementById("chooseExportItems"),
  chooseExportCsv: document.getElementById("chooseExportCsv"),
  conflictDialog: document.getElementById("conflictDialog"),
  closeConflictDialog: document.getElementById("closeConflictDialog"),
  existingConflictImage: document.getElementById("existingConflictImage"),
  existingConflictMeta: document.getElementById("existingConflictMeta"),
  incomingConflictImage: document.getElementById("incomingConflictImage"),
  incomingConflictMeta: document.getElementById("incomingConflictMeta"),
  keepExistingBtn: document.getElementById("keepExistingBtn"),
  keepIncomingBtn: document.getElementById("keepIncomingBtn"),
  keepAllConflictsBtn: document.getElementById("keepAllConflictsBtn"),
  replaceAllConflictsBtn: document.getElementById("replaceAllConflictsBtn"),
  favoriteDeleteConfirmDialog: document.getElementById("favoriteDeleteConfirmDialog"),
  closeFavoriteDeleteConfirmDialog: document.getElementById("closeFavoriteDeleteConfirmDialog"),
  cancelFavoriteDeleteBtn: document.getElementById("cancelFavoriteDeleteBtn"),
  confirmFavoriteDeleteBtn: document.getElementById("confirmFavoriteDeleteBtn"),
  appMessageDialog: document.getElementById("appMessageDialog"),
  appMessageTitle: document.getElementById("appMessageTitle"),
  appMessageText: document.getElementById("appMessageText"),
  closeAppMessageDialog: document.getElementById("closeAppMessageDialog"),
  confirmAppMessageBtn: document.getElementById("confirmAppMessageBtn"),
  appConfirmDialog: document.getElementById("appConfirmDialog"),
  appConfirmTitle: document.getElementById("appConfirmTitle"),
  appConfirmText: document.getElementById("appConfirmText"),
  closeAppConfirmDialog: document.getElementById("closeAppConfirmDialog"),
  cancelAppConfirmBtn: document.getElementById("cancelAppConfirmBtn"),
  confirmAppConfirmBtn: document.getElementById("confirmAppConfirmBtn"),
  syncDecisionDialog: document.getElementById("syncDecisionDialog"),
  syncDiffSummaryText: document.getElementById("syncDiffSummaryText"),
  closeSyncDecisionDialog: document.getElementById("closeSyncDecisionDialog"),
  cancelSyncDecisionBtn: document.getElementById("cancelSyncDecisionBtn"),
  chooseLocalSyncBtn: document.getElementById("chooseLocalSyncBtn"),
  chooseRemoteSyncBtn: document.getElementById("chooseRemoteSyncBtn"),
  appPromptDialog: document.getElementById("appPromptDialog"),
  appPromptTitle: document.getElementById("appPromptTitle"),
  appPromptText: document.getElementById("appPromptText"),
  appPromptInput: document.getElementById("appPromptInput"),
  closeAppPromptDialog: document.getElementById("closeAppPromptDialog"),
  cancelAppPromptBtn: document.getElementById("cancelAppPromptBtn"),
  confirmAppPromptBtn: document.getElementById("confirmAppPromptBtn"),
  importJsonBtn: document.getElementById("importJsonBtn"),
  importCsvBtn: document.getElementById("importCsvBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importJsonInput: document.getElementById("importJsonInput"),
};

function normalizeUsername(value) {
  return String(value || "").trim().slice(0, 20);
}

function isValidUsername(username) {
  return /^[\u4e00-\u9fa5A-Za-z0-9_-]{1,20}$/u.test(String(username || ""));
}

function loadPersistedActiveUsername() {
  const username = normalizeUsername(localStorage.getItem(ACTIVE_USER_KEY));
  return isValidUsername(username) ? username : "";
}

function loadKnownUsernames() {
  try {
    const raw = localStorage.getItem(KNOWN_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    const seen = new Set();
    const result = [];
    for (const value of parsed) {
      const username = normalizeUsername(value);
      const key = username.toLowerCase();
      if (!isValidUsername(username) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(username);
    }
    return result;
  } catch {
    return [];
  }
}

function saveKnownUsernames(usernames) {
  localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(usernames));
}

function findKnownUsername(username) {
  const target = normalizeUsername(username).toLowerCase();
  if (!target) {
    return "";
  }
  const users = loadKnownUsernames();
  return users.find((entry) => entry.toLowerCase() === target) || "";
}

function ensureKnownUsername(username) {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    return "";
  }
  const users = loadKnownUsernames();
  const hit = users.find((entry) => entry.toLowerCase() === normalized.toLowerCase());
  if (hit) {
    return hit;
  }
  users.push(normalized);
  saveKnownUsernames(users);
  return normalized;
}

function getActiveUsername() {
  const stored = loadPersistedActiveUsername();
  if (!stored) {
    return "";
  }
  return findKnownUsername(stored) || stored;
}

function setActiveUsername(username) {
  const normalized = ensureKnownUsername(username);
  if (!normalized) {
    return false;
  }
  localStorage.setItem(ACTIVE_USER_KEY, normalized);
  migrateLegacyDataToUser(normalized);
  state.currentUsername = normalized;
  updateUserMenuUi();
  return true;
}

function clearActiveUsername() {
  localStorage.removeItem(ACTIVE_USER_KEY);
  state.currentUsername = "";
  updateUserMenuUi();
}

function buildScopedStorageKey(baseKey) {
  const username = getActiveUsername();
  return username ? buildScopedStorageKeyForUsername(baseKey, username) : `${baseKey}::guest`;
}

function buildScopedStorageKeyForUsername(baseKey, username) {
  const normalized = normalizeUsername(username).toLowerCase();
  return `${baseKey}::user::${normalized}`;
}

function migrateLegacyDataToUser(username) {
  const migrationDone = localStorage.getItem(LEGACY_USER_MIGRATION_KEY) === "1";
  if (migrationDone) {
    return;
  }

  const normalized = normalizeUsername(username);
  if (!normalized) {
    return;
  }

  const baseKeys = [STORAGE_KEY, FAVORITE_LOOKS_KEY, BRAND_CATALOG_KEY, BRAND_LOGOS_KEY];
  const hasLegacyData = baseKeys.some((baseKey) => localStorage.getItem(baseKey));
  if (!hasLegacyData) {
    localStorage.setItem(LEGACY_USER_MIGRATION_KEY, "1");
    return;
  }

  for (const baseKey of baseKeys) {
    const scopedKey = buildScopedStorageKeyForUsername(baseKey, normalized);
    const scopedExists = localStorage.getItem(scopedKey);
    if (scopedExists) {
      continue;
    }
    const legacyValue = localStorage.getItem(baseKey);
    if (legacyValue) {
      localStorage.setItem(scopedKey, legacyValue);
    }
  }

  localStorage.setItem(LEGACY_USER_MIGRATION_KEY, "1");
}

function updateUserMenuUi() {
  const username = getActiveUsername();
  if (refs.currentUsernameText) {
    refs.currentUsernameText.textContent = username || "未登录";
  }
}

function toggleUserMenu(forceOpen) {
  if (!refs.userMenuPanel || !refs.userMenuBtn) {
    return;
  }
  const nextOpen = typeof forceOpen === "boolean" ? forceOpen : !userMenuOpen;
  userMenuOpen = nextOpen;
  refs.userMenuBtn.setAttribute("aria-expanded", nextOpen ? "true" : "false");

  if (nextOpen) {
    const r = refs.userMenuBtn.getBoundingClientRect();
    refs.userMenuPanel.style.top = (r.bottom + 6) + "px";
    refs.userMenuPanel.style.right = (window.innerWidth - r.right) + "px";
    refs.userMenuPanel.style.left = "auto";
    refs.userMenuPanel.style.margin = "0";
    if (typeof refs.userMenuPanel.showPopover === "function") {
      try { refs.userMenuPanel.showPopover(); } catch (e) { refs.userMenuPanel.hidden = false; }
    } else {
      refs.userMenuPanel.hidden = false;
    }
  } else {
    if (typeof refs.userMenuPanel.hidePopover === "function") {
      try { refs.userMenuPanel.hidePopover(); } catch (e) { refs.userMenuPanel.hidden = true; }
    } else {
      refs.userMenuPanel.hidden = true;
    }
  }
}

function closeUserMenu() {
  toggleUserMenu(false);
}

function reloadStateForActiveUser() {
  state.items = loadItems();
  state.favoriteLooks = loadFavoriteLooks();
  state.brandCatalog = loadBrandCatalog();
  state.brandLogos = loadBrandLogos();
  state.currentRecommendations = [];
  state.activeCategory = "all";
  state.manualLookDraft = {
    topId: "",
    bottomId: "",
    shoesId: "",
    accessoryId: "",
  };
  state.manualLookPickerTarget = "";
  state.brandLibrarySearchQuery = "";
  state.brandLibraryMultiSelectMode = false;
}

function refreshAllByActiveUser() {
  initOptions();
  syncBrandCatalogFromItems(state.items);
  purgeBlockedBrands();
  renderBrandOptions();
  renderAddBrandTrigger();
  renderCategories();
  renderClothes();
  renderLockOptions();
  renderRecommendations();
  renderFavoriteLooks();
  updateUserMenuUi();
}

function normalizeItem(raw) {
  const category = CATEGORY_LIST.includes(raw.category) ? raw.category : CATEGORY_LIST[0];
  const season = SEASON_LIST.includes(raw.season) ? raw.season : "四季";
  const color = String(raw.color || "");
  const images = Array.isArray(raw.images)
    ? raw.images.map((img) => String(img || "")).filter(Boolean)
    : raw.image
      ? [String(raw.image)]
      : [];
  const cover = String(raw.image || images[0] || "");
  return {
    id: raw.id || `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: String(raw.name || "").trim(),
    brand: String(raw.brand || "").trim(),
    size: String(raw.size || "").trim(),
    price: Number(raw.price || 0),
    category,
    season,
    color,
    image: cover,
    images,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function loadItems() {
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(STORAGE_KEY));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeItem).filter((item) => item.name && item.brand && item.size);
  } catch {
    return [];
  }
}

function loadFavoriteLooks() {
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(FAVORITE_LOOKS_KEY));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItems(options = {}) {
  try {
    localStorage.setItem(buildScopedStorageKey(STORAGE_KEY), JSON.stringify(state.items));
    if (!options.skipSync) {
      scheduleGitHubSync();
    }
    return true;
  } catch {
    return false;
  }
}

function saveFavoriteLooks(options = {}) {
  localStorage.setItem(buildScopedStorageKey(FAVORITE_LOOKS_KEY), JSON.stringify(state.favoriteLooks));
  if (!options.skipSync) {
    scheduleGitHubSync();
  }
}

function normalizeBrandName(value) {
  return String(value || "").trim();
}

function isBlockedBrand(brandName) {
  return normalizeBrandName(brandName).toLowerCase() === "a";
}

function getAvailableBrands() {
  return dedupeBrands(state.brandCatalog).filter((brand) => !isBlockedBrand(brand));
}

function dedupeBrands(brandList) {
  const output = [];
  const seen = new Set();
  for (const item of brandList || []) {
    const brand = normalizeBrandName(item);
    const key = brand.toLowerCase();
    if (!brand || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(brand);
  }
  return output.sort((a, b) => a.localeCompare(b));
}

function normalizeBrandKey(brandName) {
  return normalizeBrandName(brandName).toLowerCase();
}

function getBrandInitials(brandName) {
  const words = normalizeBrandName(brandName)
    .replaceAll("'", " ")
    .replaceAll("-", " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return "?";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function pickLogoColor(brandName) {
  const palette = ["#1f6f5f", "#2a5d86", "#8a4f2a", "#6a3a7e", "#4d6f2b", "#7a2f2f"];
  const key = normalizeBrandKey(brandName);
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 997;
  }
  return palette[hash % palette.length];
}

function buildOfflineBrandLogo(brandName) {
  const initials = getBrandInitials(brandName);
  const accent = pickLogoColor(brandName);
  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#fff" stroke="#d8c9af"/><text x="12" y="15" text-anchor="middle" font-size="8" font-family="Arial, sans-serif" fill="${accent}" font-weight="700">${initials}</text></svg>`
    )
  );
}

function buildPresetBrandLogos() {
  const result = {};
  for (const brand of PRESET_LOGO_BRANDS) {
    const key = normalizeBrandKey(brand);
    // Prefer local static logo package; fallback to deterministic offline SVG.
    result[key] = PRESET_BRAND_LOGOS_CDN[key] || buildOfflineBrandLogo(brand);
  }
  return result;
}

function loadBrandCatalog() {
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(BRAND_CATALOG_KEY));
    const parsed = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed : [];
    return dedupeBrands([...MAJOR_BRAND_LIST, ...OUTDOOR_BRAND_LIST, ...stored]);
  } catch {
    return dedupeBrands([...MAJOR_BRAND_LIST, ...OUTDOOR_BRAND_LIST]);
  }
}

function saveBrandCatalog(options = {}) {
  localStorage.setItem(buildScopedStorageKey(BRAND_CATALOG_KEY), JSON.stringify(dedupeBrands(state.brandCatalog)));
  if (!options.skipSync) {
    scheduleGitHubSync();
  }
}

function loadBrandLogos() {
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(BRAND_LOGOS_KEY));
    const parsed = raw ? JSON.parse(raw) : {};
    const stored = parsed && typeof parsed === "object" ? parsed : {};
    const preset = buildPresetBrandLogos();
    return {
      ...stored,
      ...preset,
    };
  } catch {
    return buildPresetBrandLogos();
  }
}

function saveBrandLogos(options = {}) {
  localStorage.setItem(buildScopedStorageKey(BRAND_LOGOS_KEY), JSON.stringify(state.brandLogos));
  if (!options.skipSync) {
    scheduleGitHubSync();
  }
}

function getBrandLogo(brandName) {
  const key = normalizeBrandKey(brandName);
  return state.brandLogos[key] || buildOfflineBrandLogo(brandName);
}

function setBrandLogo(brandName, logoUrl) {
  const key = normalizeBrandKey(brandName);
  if (!key || !logoUrl) {
    return;
  }
  state.brandLogos[key] = String(logoUrl);
  saveBrandLogos();
}

function ensureBrandInCatalog(brandName) {
  const brand = normalizeBrandName(brandName);
  if (!brand || isBlockedBrand(brand)) {
    return false;
  }

  const exists = state.brandCatalog.some((entry) => entry.toLowerCase() === brand.toLowerCase());
  if (exists) {
    return false;
  }

  state.brandCatalog = dedupeBrands([...state.brandCatalog, brand]);
  saveBrandCatalog();
  renderAddBrandMenu();
  return true;
}

function syncBrandCatalogFromItems(itemList = state.items) {
  const brandsFromItems = (itemList || [])
    .map((item) => normalizeBrandName(item.brand))
    .filter((brand) => brand && !isBlockedBrand(brand));
  const nextCatalog = dedupeBrands([...state.brandCatalog, ...brandsFromItems]);
  const changed = nextCatalog.length !== state.brandCatalog.length;
  state.brandCatalog = nextCatalog;
  if (changed) {
    saveBrandCatalog();
  }
  renderAddBrandMenu();
}

function purgeBlockedBrands() {
  const nextCatalog = state.brandCatalog.filter((brand) => !isBlockedBrand(brand));
  if (nextCatalog.length !== state.brandCatalog.length) {
    state.brandCatalog = nextCatalog;
    saveBrandCatalog();
  }

  const blockKey = normalizeBrandKey("A");
  if (state.brandLogos[blockKey]) {
    delete state.brandLogos[blockKey];
    saveBrandLogos();
  }
}

function renderBrandLibrary() {
  refs.brandLibraryList.innerHTML = "";
  const brands = getAvailableBrands();
  const keyword = String(state.brandLibrarySearchQuery || "").trim().toLowerCase();
  const filteredBrands = keyword
    ? brands.filter((brand) => fuzzyBrandMatch(brand, keyword))
    : brands;

  if (!brands.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "暂无品牌，请先添加一个品牌。";
    refs.brandLibraryList.append(empty);
    updateBrandLibrarySelectionState();
    return;
  }

  if (!filteredBrands.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "未找到匹配品牌，请尝试其他关键词。";
    refs.brandLibraryList.append(empty);
    updateBrandLibrarySelectionState();
    return;
  }

  for (const brand of filteredBrands) {
    const row = document.createElement("div");
    row.className = "brand-library-item";
    row.dataset.brand = brand;
    row.innerHTML = `
      <div class="brand-library-item-left">
        <input class="brand-library-check" type="checkbox" data-brand-check="${brand}" aria-label="选择品牌 ${brand}" ${
          state.brandLibraryMultiSelectMode ? "" : "hidden"
        } />
        <img class="brand-inline-logo" src="${getBrandLogo(brand)}" alt="" data-brand-logo data-brand-key="${normalizeBrandKey(brand)}" />
        <span>${brand}</span>
      </div>
      <div class="brand-action-buttons">
        <button class="btn btn--ghost btn--compact brand-edit-btn" type="button" data-action="edit-brand" aria-label="编辑品牌">✏️</button>
        <button class="btn btn--ghost btn--compact brand-delete-btn" type="button" data-action="delete-brand" aria-label="删除品牌">🗑️</button>
      </div>
    `;
    const image = row.querySelector("img");
    if (image) {
      image.addEventListener("error", onBrandLogoError);
    }
    const editBtn = row.querySelector('[data-action="edit-brand"]');
    if (editBtn) {
      editBtn.addEventListener("click", () => openEditBrandDialog(brand));
    }
    refs.brandLibraryList.append(row);
  }

  updateBrandLibrarySelectionState();
}

function fuzzyBrandMatch(brand, keyword) {
  const target = String(brand || "").toLowerCase();
  if (!keyword) {
    return true;
  }

  // Fast path: direct containment.
  if (target.includes(keyword)) {
    return true;
  }

  // Fuzzy path: subsequence match (e.g. "nk" matches "nike").
  let i = 0;
  for (let j = 0; j < target.length && i < keyword.length; j += 1) {
    if (target[j] === keyword[i]) {
      i += 1;
    }
  }
  return i === keyword.length;
}

function setBrandLibraryMultiSelectMode(enabled) {
  state.brandLibraryMultiSelectMode = Boolean(enabled);
  if (refs.toggleBrandMultiSelectBtn) {
    refs.toggleBrandMultiSelectBtn.setAttribute("aria-pressed", state.brandLibraryMultiSelectMode ? "true" : "false");
  }
  refs.deleteSelectedBrandsBtn.hidden = !state.brandLibraryMultiSelectMode;
  if (!state.brandLibraryMultiSelectMode) {
    refs.deleteSelectedBrandsBtn.disabled = true;
  }
}

function deleteBrand(brandName) {
  const brand = normalizeBrandName(brandName);
  if (!brand) {
    return;
  }

  openAppConfirm(`是否确认删除该品牌：${brand}？`, () => {
    state.brandCatalog = state.brandCatalog.filter((entry) => entry.toLowerCase() !== brand.toLowerCase());
    const key = normalizeBrandKey(brand);
    if (state.brandLogos[key]) {
      delete state.brandLogos[key];
      saveBrandLogos();
    }
    saveBrandCatalog();

    renderBrandOptions();
    renderBrandLibrary();
  }, "删除品牌");
}

function openEditBrandDialog(brandName) {
  const brand = normalizeBrandName(brandName);
  if (!brand) {
    return;
  }

  refs.editBrandNameInput.value = brand;
  refs.editBrandLogoInput.value = "";
  
  // 显示当前品牌的Logo
  const currentLogo = getBrandLogo(brand);
  refs.editBrandLogoPreview.src = currentLogo;
  refs.editBrandLogoPreviewWrap.style.display = "block";
  
  refs.editBrandDialog.dataset.editingBrand = brand;
  refs.editBrandDialog.showModal();
}

function clearEditBrandLogo() {
  refs.editBrandLogoInput.value = "";
  refs.editBrandLogoPreviewWrap.style.display = "none";
  refs.editBrandLogoPreview.src = "";
}

async function onEditBrandLogoChange(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    clearEditBrandLogo();
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    refs.editBrandLogoPreview.src = dataUrl;
    refs.editBrandLogoPreviewWrap.style.display = "block";
  } catch {
    clearEditBrandLogo();
  }
}

function closeEditBrandDialog() {
  if (refs.editBrandDialog.open) {
    refs.editBrandDialog.close();
  }
  refs.editBrandDialog.dataset.editingBrand = "";
}

async function onEditBrandSubmit(event) {
  event.preventDefault();
  const oldBrand = String(refs.editBrandDialog.dataset.editingBrand || "").trim();
  const newBrandName = normalizeBrandName(refs.editBrandNameInput.value);
  const [file] = refs.editBrandLogoInput.files ?? [];

  if (!oldBrand || !newBrandName) {
    return;
  }

  if (isBlockedBrand(newBrandName)) {
    return;
  }

  // 处理品牌名称变更
  if (oldBrand.toLowerCase() !== newBrandName.toLowerCase()) {
    // 检查新品牌名是否已存在
    if (state.brandCatalog.some((entry) => entry.toLowerCase() === newBrandName.toLowerCase())) {
      showAppMessage("该品牌已存在，请使用其他名称。", "品牌重复");
      return;
    }

    // 替换品牌名称
    state.brandCatalog = state.brandCatalog.map((entry) =>
      entry.toLowerCase() === oldBrand.toLowerCase() ? newBrandName : entry
    );

    // 移动品牌Logo
    const oldKey = normalizeBrandKey(oldBrand);
    const newKey = normalizeBrandKey(newBrandName);
    if (state.brandLogos[oldKey]) {
      state.brandLogos[newKey] = state.brandLogos[oldKey];
      delete state.brandLogos[oldKey];
    }

    saveBrandCatalog();
    saveBrandLogos();
  }

  // 处理Logo变更
  if (file) {
    try {
      const logoData = await readFileAsDataUrl(file);
      setBrandLogo(newBrandName, logoData);
    } catch {
      showAppMessage("品牌Logo上传失败，请重试。", "上传失败");
      return;
    }
  }

  renderBrandOptions();
  renderBrandLibrary();
  closeEditBrandDialog();
  showAppMessage("品牌信息已更新。", "更新成功");
}

function getSelectedBrandsInLibrary() {
  const checks = refs.brandLibraryList.querySelectorAll("input[data-brand-check]:checked");
  return Array.from(checks)
    .map((input) => normalizeBrandName(input.getAttribute("data-brand-check")))
    .filter(Boolean);
}

function updateBrandLibrarySelectionState() {
  if (!refs.deleteSelectedBrandsBtn) {
    return;
  }
  const selected = getSelectedBrandsInLibrary();
  refs.deleteSelectedBrandsBtn.disabled = selected.length === 0;
}

function deleteSelectedBrands() {
  const selectedBrands = getSelectedBrandsInLibrary();
  if (!selectedBrands.length) {
    return;
  }

  const preview = selectedBrands.slice(0, 4).join("、");
  const suffix = selectedBrands.length > 4 ? " 等" : "";
  openAppConfirm(`是否确认删除该品牌（共 ${selectedBrands.length} 个）：${preview}${suffix}？`, () => {
    const removedSet = new Set(selectedBrands.map((brand) => normalizeBrandKey(brand)));
    state.brandCatalog = state.brandCatalog.filter((entry) => !removedSet.has(normalizeBrandKey(entry)));
    for (const key of removedSet) {
      if (state.brandLogos[key]) {
        delete state.brandLogos[key];
      }
    }
    saveBrandCatalog();
    saveBrandLogos();

    renderBrandOptions();
    renderBrandLibrary();
  }, "批量删除品牌");
}

function openBrandLibraryDialog() {
  setBrandLibraryMultiSelectMode(false);
  state.brandLibrarySearchQuery = "";
  if (refs.brandLibrarySearchInput) {
    refs.brandLibrarySearchInput.value = "";
  }
  renderBrandLibrary();
  refs.brandLibraryDialog.showModal();
}

function closeBrandLibraryDialog() {
  if (refs.brandLibraryDialog.open) {
    refs.brandLibraryDialog.close();
  }
  setBrandLibraryMultiSelectMode(false);
  state.brandLibrarySearchQuery = "";
}

function buildBackupPayload(scope = "items") {
  const snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope,
    items: state.items.map((item) => ({
      ...item,
      images: Array.isArray(item.images) ? [...item.images] : item.image ? [item.image] : [],
      image: item.image || item.images?.[0] || "",
    })),
  };

  if (scope === "full") {
    snapshot.favoriteLooks = state.favoriteLooks.map((look) => ({ ...look }));
    snapshot.config = {
      categories: [...CATEGORY_LIST],
      seasons: [...SEASON_LIST],
      colors: [...COLOR_LIST],
      clothingSizes: [...SIZE_CLOTHING],
      shoeSizes: [...SIZE_SHOES],
      brands: [...state.brandCatalog],
      brandLogos: { ...state.brandLogos },
    };
  }

  return snapshot;
}

function normalizeFavoriteLook(raw) {
  return {
    id: String(raw?.id || `look-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    title: String(raw?.title || "我的收藏穿搭").trim() || "我的收藏穿搭",
    top: String(raw?.top || "未选择上装").trim() || "未选择上装",
    bottom: String(raw?.bottom || "未选择下装").trim() || "未选择下装",
    shoes: String(raw?.shoes || "鞋履：可自由搭配").trim() || "鞋履：可自由搭配",
    accessory: String(raw?.accessory || "未选择配饰").trim() || "未选择配饰",
    topImage: String(raw?.topImage || ""),
    bottomImage: String(raw?.bottomImage || ""),
    pinned: Boolean(raw?.pinned),
    createdAt: raw?.createdAt || new Date().toISOString(),
  };
}

function mergeFavoriteLooks(importedLooks) {
  const merged = [...state.favoriteLooks];
  for (const look of importedLooks) {
    const normalizedLook = normalizeFavoriteLook(look);
    const existingIndex = merged.findIndex((entry) => {
      const sameId = entry.id === normalizedLook.id;
      const sameContent =
        entry.title === normalizedLook.title &&
        entry.top === normalizedLook.top &&
        entry.bottom === normalizedLook.bottom &&
        entry.shoes === normalizedLook.shoes &&
        entry.accessory === normalizedLook.accessory;
      return sameId || sameContent;
    });

    if (existingIndex === -1) {
      merged.unshift(normalizedLook);
      continue;
    }

    merged[existingIndex] = {
      ...merged[existingIndex],
      ...normalizedLook,
      id: merged[existingIndex].id,
    };
  }

  return merged;
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "¥0.00";
  }
  return `¥${number.toFixed(2)}`;
}

function showAppMessage(message, title = "提示") {
  if (refs.appMessageTitle) {
    refs.appMessageTitle.textContent = title;
  }
  if (refs.appMessageText) {
    refs.appMessageText.textContent = String(message || "");
  }
  refs.appMessageDialog?.showModal();
}

function closeAppMessageDialog() {
  refs.appMessageDialog?.close();
}

function openAppConfirm(message, onConfirm, title = "请确认") {
  pendingAppConfirmAction = typeof onConfirm === "function" ? onConfirm : null;
  if (refs.appConfirmTitle) {
    refs.appConfirmTitle.textContent = title;
  }
  if (refs.appConfirmText) {
    refs.appConfirmText.textContent = String(message || "");
  }
  refs.appConfirmDialog?.showModal();
}

function closeAppConfirmDialog(confirmed = false) {
  pendingAppConfirmAction = null;
  const resolve = pendingAppConfirmResolve;
  pendingAppConfirmResolve = null;
  refs.appConfirmDialog?.close();
  if (resolve) {
    resolve(Boolean(confirmed));
  }
}

function confirmAppConfirmDialog() {
  const action = pendingAppConfirmAction;
  closeAppConfirmDialog(true);
  if (action) {
    action();
  }
}

function openAppConfirmAsync(message, title = "请确认") {
  return new Promise((resolve) => {
    pendingAppConfirmResolve = resolve;
    openAppConfirm(message, null, title);
  });
}

function openAppPrompt(message, defaultValue, onSubmit, title = "输入内容") {
  pendingAppPromptSubmit = typeof onSubmit === "function" ? onSubmit : null;
  if (refs.appPromptTitle) {
    refs.appPromptTitle.textContent = title;
  }
  if (refs.appPromptText) {
    refs.appPromptText.textContent = String(message || "");
  }
  if (refs.appPromptInput) {
    refs.appPromptInput.value = String(defaultValue || "");
  }
  refs.appPromptDialog?.showModal();
}

function closeAppPromptDialog(resultValue = null) {
  pendingAppPromptSubmit = null;
  const resolve = pendingAppPromptResolve;
  pendingAppPromptResolve = null;
  refs.appPromptDialog?.close();
  if (resolve) {
    resolve(resultValue);
  }
}

function confirmAppPromptDialog() {
  const submit = pendingAppPromptSubmit;
  const value = String(refs.appPromptInput?.value || "");
  closeAppPromptDialog(value);
  if (submit) {
    submit(value);
  }
}

function openAppPromptAsync({
  title = "输入内容",
  message = "",
  defaultValue = "",
  placeholder = "",
  maxLength = 20,
  inputType = "text",
} = {}) {
  const input = refs.appPromptInput;
  if (!input) {
    return Promise.resolve(null);
  }

  const prevType = input.type;
  const prevPlaceholder = input.placeholder;
  const prevMaxLength = input.maxLength;

  input.type = inputType === "password" ? "password" : "text";
  input.placeholder = String(placeholder || "");
  input.maxLength = Number(maxLength) || 20;

  return new Promise((resolve) => {
    pendingAppPromptResolve = (result) => {
      input.type = prevType;
      input.placeholder = prevPlaceholder;
      input.maxLength = prevMaxLength;
      resolve(result);
    };
    openAppPrompt(message, defaultValue, null, title);
    refs.appPromptInput?.focus();
  });
}

async function ensureActiveUserReady() {
  const current = getActiveUsername();
  if (current) {
    ensureKnownUsername(current);
    state.currentUsername = current;
    updateUserMenuUi();
    return true;
  }

  while (true) {
    const input = await openAppPromptAsync({
      title: "进入衣柜",
      message: "请输入用户名（首次进入必须输入）",
      placeholder: "例如：小明",
      maxLength: 20,
    });

    const username = normalizeUsername(input);
    if (!username) {
      showAppMessage("需要输入用户名才能进入。", "请输入用户名");
      continue;
    }

    if (!isValidUsername(username)) {
      showAppMessage("用户名仅支持中文、字母、数字、下划线和短横线，且长度不超过20位。", "用户名无效");
      continue;
    }

    const existing = findKnownUsername(username);
    if (existing) {
      setActiveUsername(existing);
      return true;
    }

    const shouldCreate = await openAppConfirmAsync(`用户名“${username}”不存在，是否新建该用户？`, "新建用户");
    if (!shouldCreate) {
      continue;
    }

    setActiveUsername(username);
    return true;
  }
}

async function logoutCurrentUser() {
  const current = getActiveUsername();
  if (!current) {
    return;
  }

  const shouldLogout = await openAppConfirmAsync(`确认退出当前用户“${current}”？`, "退出当前用户");
  if (!shouldLogout) {
    return;
  }

  closeUserMenu();
  clearActiveUsername();
  await ensureActiveUserReady();
  reloadStateForActiveUser();
  refreshAllByActiveUser();
}

function allowedSeasonsForWeather(weather) {
  const map = {
    any: SEASON_LIST,
    hot: ["夏季", "四季"],
    mild: ["春秋", "四季"],
    cold: ["冬季", "四季"],
  };
  return map[weather] || ["四季"];
}

function weatherCodeLabel(code) {
  const map = {
    0: "晴",
    1: "大体晴",
    2: "多云",
    3: "阴",
    45: "雾",
    48: "雾凇",
    51: "小毛雨",
    53: "毛雨",
    55: "强毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    80: "阵雨",
    81: "强阵雨",
    82: "暴雨",
    95: "雷暴",
  };
  return map[Number(code)] || "未知天气";
}

function updateWeatherText(text) {
  refs.weatherInfo.textContent = text;
}

function weatherIconPath(weatherCode) {
  const code = Number(weatherCode);
  if (code === 0 || code === 1) {
    return "assets/weather-sun.svg";
  }
  if (code >= 80 || [51, 53, 55, 61, 63, 65].includes(code)) {
    return "assets/weather-rain.svg";
  }
  if ([71, 73, 75].includes(code)) {
    return "assets/weather-snow.svg";
  }
  if (code === 95) {
    return "assets/weather-thunder.svg";
  }
  return "assets/weather-cloud.svg";
}

function fetchWeatherByLocation(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  return fetch(url).then((response) => response.json());
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("not-supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      enableHighAccuracy: false,
      maximumAge: 300000,
    });
  });
}

async function loadCurrentWeather() {
  try {
    updateWeatherText("天气加载中...");
    const position = await getCurrentPosition();
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const payload = await fetchWeatherByLocation(latitude, longitude);
    const temperature = payload?.current?.temperature_2m;
    const weatherCode = payload?.current?.weather_code;
    if (typeof temperature !== "number") {
      throw new Error("invalid-weather");
    }
    refs.weatherIcon.src = weatherIconPath(weatherCode);
    updateWeatherText(`${temperature.toFixed(1)}°C · ${weatherCodeLabel(weatherCode)}`);
  } catch {
    refs.weatherIcon.src = "assets/weather-cloud.svg";
    updateWeatherText("天气获取失败，请允许定位后重试");
  }
}

function initOptions() {
  refs.addCategory.innerHTML = "";
  refs.filterCategory.innerHTML = '<option value="all">全部分类</option>';

  for (const category of CATEGORY_LIST) {
    const addOpt = document.createElement("option");
    addOpt.value = category;
    addOpt.textContent = category;
    refs.addCategory.append(addOpt);

    const filterOpt = document.createElement("option");
    filterOpt.value = category;
    filterOpt.textContent = category;
    refs.filterCategory.append(filterOpt);
  }

  refs.addSeason.innerHTML = '<option value="" selected disabled>请选择季节</option>';
  refs.filterSeason.innerHTML = '<option value="all">全部季节</option>';
  for (const season of SEASON_LIST) {
    const addOpt = document.createElement("option");
    addOpt.value = season;
    addOpt.textContent = season;
    refs.addSeason.append(addOpt);

    const filterOpt = document.createElement("option");
    filterOpt.value = season;
    filterOpt.textContent = season;
    refs.filterSeason.append(filterOpt);
  }

  refs.addColor.innerHTML = '<option value="">未选择</option>';
  refs.filterColor.innerHTML = '<option value="all">全部颜色</option>';
  for (const color of COLOR_LIST) {
    const addOpt = document.createElement("option");
    addOpt.value = color;
    addOpt.textContent = color;
    refs.addColor.append(addOpt);

    const filterOpt = document.createElement("option");
    filterOpt.value = color;
    filterOpt.textContent = color;
    refs.filterColor.append(filterOpt);
  }
  refs.addColor.value = "";

  // 初始化尺码选项（默认为服装尺码）
  updateSizeOptions(CATEGORY_LIST[0]);
}

function updateSizeOptions(category) {
  refs.addSize.innerHTML = '<option value="" selected disabled>请选择尺码</option>';
  const sizeList = category === "鞋履" ? SIZE_SHOES : SIZE_CLOTHING;
  for (const size of sizeList) {
    const opt = document.createElement("option");
    opt.value = size;
    opt.textContent = size;
    refs.addSize.append(opt);
  }
  refs.addSize.value = "";
}

function getScopedItems() {
  if (state.activeCategory === "all") {
    return state.items;
  }
  return state.items.filter((item) => item.category === state.activeCategory);
}

function renderBrandOptions() {
  const current = refs.filterBrand.value || "all";
  const brands = getAvailableBrands();

  refs.filterBrand.innerHTML = '<option value="all">全部品牌</option>';
  refs.filterBrandMenu.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "brand-filter-option";
  allButton.dataset.value = "all";
  allButton.textContent = "全部品牌";
  refs.filterBrandMenu.append(allButton);

  for (const brand of brands) {
    const opt = document.createElement("option");
    opt.value = brand;
    opt.textContent = brand;
    refs.filterBrand.append(opt);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "brand-filter-option";
    button.dataset.value = brand;
    button.innerHTML = `<img src="${getBrandLogo(brand)}" alt="" data-brand-logo data-brand-key="${normalizeBrandKey(brand)}" />${brand}`;
    const image = button.querySelector("img");
    if (image) {
      image.addEventListener("error", onBrandLogoError);
    }
    refs.filterBrandMenu.append(button);
  }

  refs.filterBrand.value = brands.includes(current) ? current : "all";
  renderFilterBrandTrigger();
  renderAddBrandMenu();
}

function renderFilterBrandTrigger() {
  const value = refs.filterBrand.value || "all";
  const label = value === "all" ? "全部品牌" : value;
  if (value === "all") {
    refs.filterBrandTrigger.textContent = label;
    return;
  }

  const logo = getBrandLogo(value);
  refs.filterBrandTrigger.innerHTML = `<img src="${logo}" alt="" data-brand-logo data-brand-key="${normalizeBrandKey(value)}" />${label}`;
  const image = refs.filterBrandTrigger.querySelector("img");
  if (image) {
    image.addEventListener("error", onBrandLogoError);
  }
}

function toggleFilterBrandMenu(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : refs.filterBrandMenu.hidden;
  refs.filterBrandMenu.hidden = !shouldOpen;
  refs.filterBrandTrigger.setAttribute("aria-expanded", String(shouldOpen));
}

function renderAddBrandTrigger() {
  const brand = normalizeBrandName(refs.addBrandInput.value);
  if (!brand) {
    refs.addBrandTrigger.textContent = "请选择品牌";
    return;
  }
  refs.addBrandTrigger.innerHTML = `<img src="${getBrandLogo(brand)}" alt="" data-brand-logo data-brand-key="${normalizeBrandKey(brand)}" />${brand}`;
  const image = refs.addBrandTrigger.querySelector("img");
  if (image) {
    image.addEventListener("error", onBrandLogoError);
  }
}

function setAddBrandValue(brand) {
  refs.addBrandInput.value = normalizeBrandName(brand);
  renderAddBrandTrigger();
}

function toggleAddBrandMenu(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : refs.addBrandMenu.hidden;
  refs.addBrandMenu.hidden = !shouldOpen;
  refs.addBrandTrigger.setAttribute("aria-expanded", String(shouldOpen));
}

function renderAddBrandMenu() {
  const brands = getAvailableBrands();
  refs.addBrandMenu.innerHTML = "";

  for (const brand of brands) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "brand-filter-option";
    button.dataset.value = brand;
    button.innerHTML = `<img src="${getBrandLogo(brand)}" alt="" data-brand-logo data-brand-key="${normalizeBrandKey(brand)}" />${brand}`;
    const image = button.querySelector("img");
    if (image) {
      image.addEventListener("error", onBrandLogoError);
    }
    refs.addBrandMenu.append(button);
  }

  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.className = "brand-filter-option brand-filter-option--create";
  createButton.dataset.action = "create-brand";
  createButton.textContent = "+ 新增品牌";
  refs.addBrandMenu.append(createButton);

  const current = normalizeBrandName(refs.addBrandInput.value);
  if (!current || !brands.includes(current)) {
    setAddBrandValue("");
  } else {
    renderAddBrandTrigger();
  }
}

function onBrandLogoError(event) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) {
    return;
  }
  const rawKey = target.dataset.brandKey || target.closest("[data-brand]")?.getAttribute("data-brand") || "";
  const brandKey = normalizeBrandKey(rawKey);
  const fallbackLogo = brandKey ? buildOfflineBrandLogo(brandKey) : BLANK_BRAND_LOGO;

  // Prevent repeat error loops.
  target.removeEventListener("error", onBrandLogoError);
  target.src = fallbackLogo;

  // Persist fallback so subsequent renders no longer try unreachable URLs.
  if (brandKey) {
    state.brandLogos[brandKey] = fallbackLogo;
    saveBrandLogos({ skipSync: true });
  }
}

function renderCategories() {
  refs.categoryGrid.innerHTML = "";
  CATEGORY_LIST.forEach((category) => {
    const card = document.createElement("div");
    card.className = "category-card";

    const button = document.createElement("button");
    button.className = "category-card__btn";
    button.dataset.category = category;

    const name = document.createElement("p");
    name.className = "category-card__name";
    name.textContent = category;

    const count = document.createElement("p");
    count.className = "category-card__count";
    // 根据items中该分类的数量来计算
    const categoryCount = state.items.filter((item) => item.category === category).length;
    count.textContent = `${categoryCount} 件`;

    button.append(name, count);
    card.append(button);
    refs.categoryGrid.append(card);
  });
}

function setCategoryMode(category) {
  state.activeCategory = category;
  if (category === "all") {
    refs.filterCategory.disabled = false;
    refs.filterCategory.value = "all";
    refs.clearCategoryView.hidden = true;
    refs.categoryViewLabel.hidden = true;
    refs.categoryViewLabel.textContent = "";
  } else {
    refs.filterCategory.disabled = true;
    refs.filterCategory.value = category;
    refs.clearCategoryView.hidden = false;
    refs.categoryViewLabel.hidden = false;
    refs.categoryViewLabel.textContent = `当前正在查看：${category}`;
  }

  renderBrandOptions();
  renderClothes();
}

function getFilters() {
  return {
    category: refs.filterCategory.value,
    brand: refs.filterBrand.value,
    color: refs.filterColor.value,
    season: refs.filterSeason.value,
    priceRange: refs.filterPriceRange.value,
    sortOrder: refs.sortOrder.value,
    search: refs.searchInput.value.trim().toLowerCase(),
  };
}

function matchPriceRange(price, rangeValue) {
  const value = Number(price);
  if (!Number.isFinite(value) || !rangeValue || rangeValue === "all") {
    return true;
  }
  if (rangeValue.endsWith("+")) {
    const min = Number(rangeValue.replace("+", ""));
    return value >= min;
  }
  const [minRaw, maxRaw] = rangeValue.split("-");
  const min = Number(minRaw);
  const max = Number(maxRaw);
  return value >= min && value <= max;
}

function getFilteredItems() {
  const filters = getFilters();

  const filtered = state.items.filter((item) => {
    const byCategory = filters.category === "all" || item.category === filters.category;
    const byBrand = filters.brand === "all" || item.brand === filters.brand;
    const byColor = filters.color === "all" || item.color === filters.color;
    const bySeason = filters.season === "all" || item.season === filters.season;
    const byPriceRange = matchPriceRange(item.price, filters.priceRange);
    const searchable = `${item.name} ${item.brand} ${item.size} ${item.color}`.toLowerCase();
    const bySearch = !filters.search || searchable.includes(filters.search);
    return byCategory && byBrand && byColor && bySeason && byPriceRange && bySearch;
  });

  if (filters.sortOrder === "oldest") {
    return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  if (filters.sortOrder === "price-asc") {
    return filtered.sort((a, b) => Number(a.price) - Number(b.price));
  }
  if (filters.sortOrder === "price-desc") {
    return filtered.sort((a, b) => Number(b.price) - Number(a.price));
  }
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function renderClothes() {
  const items = getFilteredItems();
  refs.clothesList.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "没有匹配的衣物，换个条件试试。";
    refs.clothesList.append(empty);
  } else {
    for (const item of items) {
      const clone = refs.cardTemplate.content.firstElementChild.cloneNode(true);
      clone.dataset.itemId = item.id;
      const coverImage = item.image || item.images?.[0] || PLACEHOLDER_IMAGE;
      clone.querySelector(".clothing-card__img").src = coverImage;
      clone.querySelector(".clothing-card__img").alt = `${item.name} 照片`;
      clone.querySelector(".clothing-card__category").textContent = item.category;
      clone.querySelector(".clothing-card__name").textContent = item.name;
      const meta = clone.querySelector(".clothing-card__meta");
      meta.textContent = "";
      const brandLogoImage = document.createElement("img");
      brandLogoImage.className = "brand-inline-logo";
      brandLogoImage.src = getBrandLogo(item.brand);
      brandLogoImage.alt = "";
      brandLogoImage.dataset.brandKey = normalizeBrandKey(item.brand);
      meta.append(brandLogoImage);
      meta.append(document.createTextNode(`${item.brand} · 尺码 ${item.size} · ${item.color} · ${item.season}`));
      if (brandLogoImage) {
        brandLogoImage.addEventListener("error", onBrandLogoError);
      }
      clone.querySelector(".clothing-card__price").textContent = formatPrice(item.price);
      refs.clothesList.append(clone);
    }
  }

  refs.resultCount.textContent = `显示 ${items.length} 件`;
}

function renderFavoriteLooks() {
  refs.favoriteList.innerHTML = "";

  const orderedLooks = [...state.favoriteLooks].sort((a, b) => {
    const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDiff !== 0) {
      return pinDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (orderedLooks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "还没有收藏的穿搭，先生成并收藏一套吧。";
    refs.favoriteList.append(empty);
  } else {
    for (const look of orderedLooks) {
      const card = refs.recommendCardTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.favoriteId = look.id;
      const lines = card.querySelectorAll(".recommend-card__line");
      const pinPrefix = look.pinned ? "[置顶] " : "";
      card.querySelector(".recommend-card__title").textContent = `${pinPrefix}${look.title}`;
      lines[0].textContent = look.top;
      lines[1].textContent = look.bottom;
      lines[2].textContent = look.shoes || "鞋履：可自由搭配";
      lines[3].textContent = look.accessory;
      // 设置图片
      const imgTop = card.querySelector(".recommend-card__img--top");
      const imgBottom = card.querySelector(".recommend-card__img--bottom");
      if (imgTop) imgTop.src = look.topImage || "";
      if (imgBottom) imgBottom.src = look.bottomImage || "";
      const actionWrap = card.querySelector(".card-actions");
      actionWrap.innerHTML = `
        <button class="btn btn--ghost card-btn" data-action="pin-look" type="button">${
          look.pinned ? "取消置顶" : "置顶"
        }</button>
        <button class="btn btn--ghost card-btn" data-action="rename-look" type="button">重命名</button>
        <button class="btn btn--ghost card-btn card-btn--danger" data-action="delete-look" type="button">取消收藏</button>
      `;
      refs.favoriteList.append(card);
    }
  }

  refs.favoriteCount.textContent = `收藏 ${state.favoriteLooks.length} 套`;
}

function setView(view) {
  state.activeView = view;
  const isWardrobe = view === "wardrobe";
  refs.wardrobePanel.hidden = !isWardrobe;
  refs.filterPanel.hidden = !isWardrobe;
  refs.listPanel.hidden = !isWardrobe;
  refs.recommendPanel.hidden = isWardrobe;
  refs.wardrobeActions.classList.toggle("is-hidden", !isWardrobe);
  refs.tabWardrobe.classList.toggle("is-active", isWardrobe);
  refs.tabRecommend.classList.toggle("is-active", !isWardrobe);
  refs.tabWardrobe.setAttribute("aria-selected", String(isWardrobe));
  refs.tabRecommend.setAttribute("aria-selected", String(!isWardrobe));

  if (!isWardrobe) {
    renderLockOptions();
    renderRecommendations();
  }
}

function openAddDialog() {
  resetAddForm();
  if (refs.addUnsavedBanner) {
    refs.addUnsavedBanner.hidden = true;
  }
  refs.addDialog.showModal();
}

function openEditDialog(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  state.editingId = itemId;
  refs.dialogTitle.textContent = "编辑服装";
  refs.submitButton.textContent = "保存修改";
  refs.addForm.elements.name.value = item.name;
  setAddBrandValue(item.brand);
  toggleAddBrandMenu(false);
  refs.addForm.elements.size.value = item.size;
  refs.addForm.elements.price.value = Number(item.price);
  refs.addCategory.value = item.category;
  updateSizeOptions(item.category);
  refs.addForm.elements.size.value = item.size;
  refs.addSeason.value = item.season;
  
  // 处理颜色：如果在预设颜色列表中则使用select，否则使用自定义颜色
  if (COLOR_LIST.includes(item.color)) {
    refs.addColor.value = item.color;
    refs.customColorInput.value = "";
  } else {
    refs.addColor.value = "";
    refs.customColorInput.value = item.color;
  }
  
  state.imageDataList = Array.isArray(item.images) && item.images.length ? [...item.images] : item.image ? [item.image] : [];
  state.coverImageIndex = Math.max(0, state.imageDataList.findIndex((img) => img === item.image));
  renderImageGallery();
  if (refs.addUnsavedBanner) {
    refs.addUnsavedBanner.hidden = true;
  }
  refs.addDialog.showModal();
}

function hasUnsavedAddFormData() {
  const name = String(refs.addForm.elements.name?.value || "").trim();
  const brand = String(refs.addBrandInput?.value || "").trim();
  const price = String(refs.addForm.elements.price?.value || "").trim();
  const season = String(refs.addSeason?.value || "").trim();
  return Boolean(name || brand || price || season || state.imageDataList.length > 0);
}

function requestCloseAddDialog() {
  const shouldWarn = !state.editingId && hasUnsavedAddFormData();
  if (shouldWarn) {
    if (refs.addUnsavedBanner) {
      refs.addUnsavedBanner.hidden = false;
    }
    return;
  }
  forceCloseAddDialog();
}

function forceCloseAddDialog() {
  if (refs.addUnsavedBanner) {
    refs.addUnsavedBanner.hidden = true;
  }
  refs.addDialog.close();
  resetAddForm();
}

function clearImagePreview() {
  state.imageDataList = [];
  state.coverImageIndex = 0;
  refs.previewImage.src = "";
  refs.previewWrap.hidden = true;
  refs.previewWrap.classList.remove("show");
  refs.imageGallery.innerHTML = "";
  refs.imageGallery.hidden = true;
  if (refs.openImageEditorBtn) {
    refs.openImageEditorBtn.hidden = true;
  }
  refs.imageInput.value = "";
}

function renderImageGallery() {
  refs.imageGallery.innerHTML = "";
  const images = state.imageDataList;
  const isEditing = Boolean(state.editingId);

  if (!images.length) {
    refs.previewImage.src = "";
    refs.previewWrap.classList.remove("show");
    refs.previewWrap.hidden = true;
    refs.imageGallery.hidden = true;
    if (refs.openImageEditorBtn) {
      refs.openImageEditorBtn.hidden = true;
    }
    return;
  }

  const safeIndex = Math.min(Math.max(0, state.coverImageIndex), images.length - 1);
  state.coverImageIndex = safeIndex;
  refs.previewImage.src = images[safeIndex];

  refs.previewWrap.hidden = false;
  refs.previewWrap.classList.add("show");
  refs.imageGallery.hidden = false;
  if (refs.openImageEditorBtn) {
    refs.openImageEditorBtn.hidden = false;
  }

  images.forEach((img, index) => {
    const thumb = document.createElement("div");
    thumb.className = `image-thumb${index === safeIndex ? " image-thumb--cover" : ""}`;
    const deleteBtn = isEditing ? `<button class="image-thumb__delete-btn" type="button" data-delete-index="${index}" title="删除此图片">✕</button>` : "";
    thumb.innerHTML = `
      <img src="${img}" alt="上传图片 ${index + 1}" />
      <button class="image-thumb__btn" type="button" data-cover-index="${index}">${
        index === safeIndex ? "当前封面" : "设为封面"
      }</button>
      ${deleteBtn}
    `;
    refs.imageGallery.append(thumb);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * 智能压缩图片：
 * - 如果有透明像素（PNG等），保留PNG
 * - 如果无透明像素，转换为JPEG 90%压缩
 */
function compressDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      // 创建临时canvas加载图片，检查透明度
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = image.naturalWidth || image.width;
      tempCanvas.height = image.naturalHeight || image.height;
      const ctx = tempCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // 检测是否有透明像素
      const pixels = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
      let hasTransparentPixel = false;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 255) {
          hasTransparentPixel = true;
          break;
        }
      }
      
      // 格式决策：无透明 → JPEG 90%，有透明 → PNG
      const compressedUrl = hasTransparentPixel
        ? tempCanvas.toDataURL("image/png")
        : tempCanvas.toDataURL("image/jpeg", 0.90);
      
      resolve(compressedUrl);
    };
    image.onerror = () => resolve(dataUrl); // 加载失败则返回原图
    image.src = dataUrl;
  });
}

function resetAddForm() {
  refs.addForm.reset();
  refs.addCategory.value = CATEGORY_LIST[0];
  updateSizeOptions(CATEGORY_LIST[0]);
  refs.addSeason.value = "";
  refs.addColor.value = "";
  refs.customColorInput.value = "";
  renderAddBrandMenu();
  toggleAddBrandMenu(false);
  clearImagePreview();
  state.editingId = "";
  refs.dialogTitle.textContent = "添加新服装";
  refs.submitButton.textContent = "保存到衣柜";
}

async function onImageChange(event) {
  const [file] = event.target.files ?? [];
  const files = Array.from(event.target.files ?? []);
  if (!file || files.length === 0) {
    return;
  }

  try {
    // 读取图片并压缩
    const dataUrls = await Promise.all(files.map((item) => readFileAsDataUrl(item)));
    const compressedUrls = await Promise.all(dataUrls.map((url) => compressDataUrl(url)));
    // 追加新图片而不是替换（如果是新增模式且列表为空则不追加）
    if (state.imageDataList.length === 0) {
      state.imageDataList = compressedUrls;
      state.coverImageIndex = 0;
    } else {
      state.imageDataList.push(...compressedUrls);
    }
    renderImageGallery();
  } catch {
    clearImagePreview();
  }
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-load-failed"));
    image.src = dataUrl;
  });
}

function saveEditorHistoryState() {
  const sourceCanvas = imageEditorState.sourceCanvas;
  const snapshot = {
    imageData: sourceCanvas.toDataURL("image/png"),
    rotation: imageEditorState.rotation,
    activeTool: imageEditorState.activeTool,
    isCropMode: imageEditorState.isCropMode,
    cropRect: imageEditorState.cropRect ? { ...imageEditorState.cropRect } : null,
    cutoutMode: imageEditorState.cutoutMode,
    markMode: imageEditorState.markMode,
    fgPoints: imageEditorState.fgPoints.map((point) => ({ ...point })),
    bgPoints: imageEditorState.bgPoints.map((point) => ({ ...point })),
  };
  const currentSnapshot = imageEditorState.history[imageEditorState.historyIndex];
  if (currentSnapshot && isEditorHistorySnapshotEqual(currentSnapshot, snapshot)) {
    updateUndoRedoButtons();
    return;
  }
  imageEditorState.historyIndex += 1;
  imageEditorState.history = imageEditorState.history.slice(0, imageEditorState.historyIndex);
  imageEditorState.history.push(snapshot);
  updateUndoRedoButtons();
}

function isEditorHistorySnapshotEqual(left, right) {
  if (!left || !right) {
    return false;
  }

  return (
    left.imageData === right.imageData &&
    left.rotation === right.rotation &&
    left.activeTool === right.activeTool &&
    left.isCropMode === right.isCropMode &&
    areCropRectsEqual(left.cropRect, right.cropRect) &&
    left.cutoutMode === right.cutoutMode &&
    left.markMode === right.markMode &&
    arePointSetsEqual(left.fgPoints, right.fgPoints) &&
    arePointSetsEqual(left.bgPoints, right.bgPoints)
  );
}

function arePointSetsEqual(left, right) {
  const a = Array.isArray(left) ? left : [];
  const b = Array.isArray(right) ? right : [];
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index].x !== b[index].x || a[index].y !== b[index].y) {
      return false;
    }
  }
  return true;
}

function areCropRectsEqual(left, right) {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }

  return left.x === right.x && left.y === right.y && left.w === right.w && left.h === right.h;
}

async function restoreEditorHistoryState(index) {
  if (index < 0 || index >= imageEditorState.history.length) {
    return;
  }
  const snapshot = imageEditorState.history[index];
  imageEditorState.historyIndex = index;
  imageEditorState.rotation = snapshot.rotation;
  imageEditorState.activeTool = snapshot.activeTool || null;
  imageEditorState.isCropMode = Boolean(snapshot.isCropMode && snapshot.cropRect);
  imageEditorState.cropRect = snapshot.cropRect ? { ...snapshot.cropRect } : null;
  imageEditorState.cutoutMode = Boolean(snapshot.cutoutMode);
  imageEditorState.markMode = snapshot.markMode || null;
  imageEditorState.fgPoints = Array.isArray(snapshot.fgPoints) ? snapshot.fgPoints.map((point) => ({ ...point })) : [];
  imageEditorState.bgPoints = Array.isArray(snapshot.bgPoints) ? snapshot.bgPoints.map((point) => ({ ...point })) : [];
  imageEditorState.isDragging = false;
  imageEditorState.dragStart = null;
  await loadImageIntoEditor(snapshot.imageData);
  if (refs.cutoutMarkBtns) {
    refs.cutoutMarkBtns.style.display = imageEditorState.cutoutMode ? "inline" : "none";
  }
  if (refs.editorMarkControl) {
    refs.editorMarkControl.hidden = !imageEditorState.cutoutMode;
  }
  if (refs.editorMarkSlider) {
    refs.editorMarkSlider.value = String(imageEditorState.markRadius);
  }
  if (refs.editorMarkSize) {
    refs.editorMarkSize.textContent = String(imageEditorState.markRadius);
  }
  refs.editorFgMarkBtn?.classList.toggle("is-active", imageEditorState.markMode === "fg");
  refs.editorBgMarkBtn?.classList.toggle("is-active", imageEditorState.markMode === "bg");
  syncImageEditorToolUi();
  renderImageEditorCanvas();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  if (refs.editorUndoBtn) {
    refs.editorUndoBtn.disabled = imageEditorState.historyIndex <= 0;
  }
  if (refs.editorRedoBtn) {
    refs.editorRedoBtn.disabled = imageEditorState.historyIndex >= imageEditorState.history.length - 1;
  }
}

async function loadImageIntoEditor(dataUrl) {
  const image = await loadImageElement(dataUrl);
  const sourceCanvas = imageEditorState.sourceCanvas;
  sourceCanvas.width = image.naturalWidth || image.width;
  sourceCanvas.height = image.naturalHeight || image.height;
  const ctx = sourceCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  ctx.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
}

function setImageEditorHint(text = "") {
  if (refs.imageEditorHint) {
    refs.imageEditorHint.textContent = text;
  }
}

function syncImageEditorToolUi() {
  const activeTool = imageEditorState.activeTool;

  if (refs.editorToolbarCrop) {
    refs.editorToolbarCrop.hidden = !(activeTool === "crop" && imageEditorState.isCropMode);
  }
  if (refs.editorToolbarRotate) {
    refs.editorToolbarRotate.hidden = activeTool !== "rotate";
  }
  if (refs.editorEraserControl) {
    refs.editorEraserControl.hidden = activeTool !== "eraser";
  }

  refs.editorCropModeBtn?.setAttribute("aria-pressed", String(activeTool === "crop"));
  refs.editorRotateModeBtn?.setAttribute("aria-pressed", String(activeTool === "rotate"));
  refs.editorEraserModeBtn?.setAttribute("aria-pressed", String(activeTool === "eraser"));

  if (refs.imageEditorCanvas) {
    refs.imageEditorCanvas.style.cursor = activeTool === "eraser" ? "none" : "default";
  }

  if (activeTool !== "eraser") {
    imageEditorState.eraserCursorPos = null;
  }
}

function renderImageEditorCanvas() {

  if (!refs.imageEditorCanvas) return;
  const sourceCanvas = imageEditorState.sourceCanvas;
  const displayCanvas = refs.imageEditorCanvas;
  const rotation = imageEditorState.rotation;
  let srcWidth = Math.max(1, sourceCanvas.width);
  let srcHeight = Math.max(1, sourceCanvas.height);

  // 旋转90/270度时交换宽高
  const isRotated90 = rotation === 90 || rotation === 270;
  let drawWidth = isRotated90 ? srcHeight : srcWidth;
  let drawHeight = isRotated90 ? srcWidth : srcHeight;

  // 计算最大显示区域（容器最大宽高）
  const maxW = Math.min(window.innerWidth * 0.95, 520); // 最大宽度
  const maxH = Math.min(window.innerHeight * 0.6, 420); // 最大高度
  let scale = Math.min(1, maxW / drawWidth, maxH / drawHeight);

  // canvas像素尺寸 = 实际绘制尺寸（原图或等比缩小）
  displayCanvas.width = Math.round(drawWidth * scale);
  displayCanvas.height = Math.round(drawHeight * scale);
  // CSS宽高与像素一致，防止缩放
  displayCanvas.style.width = displayCanvas.width + "px";
  displayCanvas.style.height = displayCanvas.height + "px";
  displayCanvas.style.transform = "none";
  displayCanvas.style.transformOrigin = "center center";

  const ctx = displayCanvas.getContext("2d");
  ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  ctx.save();
  ctx.translate(displayCanvas.width / 2, displayCanvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // 绘制时也要缩放
  ctx.drawImage(
    sourceCanvas,
    -srcWidth / 2 * scale,
    -srcHeight / 2 * scale,
    srcWidth * scale,
    srcHeight * scale
  );

  // 在restore之前绘制裁剪框，这样才能应用正确的变换
  if (imageEditorState.cropRect && imageEditorState.isCropMode) {
    const rect = imageEditorState.cropRect;
    
    // 图片在变换后坐标系中的范围
    const imgLeft = -srcWidth / 2 * scale;
    const imgTop = -srcHeight / 2 * scale;
    const imgRight = srcWidth / 2 * scale;
    const imgBottom = srcHeight / 2 * scale;
    
    // 裁剪框的坐标
    const cropLeft = rect.x * scale + imgLeft;
    const cropTop = rect.y * scale + imgTop;
    const cropRight = (rect.x + rect.w) * scale + imgLeft;
    const cropBottom = (rect.y + rect.h) * scale + imgTop;
    const cropWidth = rect.w * scale;
    const cropHeight = rect.h * scale;
    
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000000";
    
    // 左暗区：从图片左边到裁剪框左边
    if (cropLeft > imgLeft) {
      ctx.fillRect(imgLeft, imgTop, cropLeft - imgLeft, imgBottom - imgTop);
    }
    
    // 右暗区：从裁剪框右边到图片右边
    if (cropRight < imgRight) {
      ctx.fillRect(cropRight, imgTop, imgRight - cropRight, imgBottom - imgTop);
    }
    
    // 上暗区：从图片上边到裁剪框上边（只在裁剪框宽度范围内）
    if (cropTop > imgTop) {
      ctx.fillRect(cropLeft, imgTop, cropWidth, cropTop - imgTop);
    }
    
    // 下暗区：从裁剪框下边到图片下边（只在裁剪框宽度范围内）
    if (cropBottom < imgBottom) {
      ctx.fillRect(cropLeft, cropBottom, cropWidth, imgBottom - cropBottom);
    }
    
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#1f6f5f";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(cropLeft, cropTop, cropWidth, cropHeight);
    ctx.restore();
  }

  ctx.restore();

  if (imageEditorState.activeTool === "eraser" && imageEditorState.eraserCursorPos) {
    const cur = imageEditorState.eraserCursorPos;
    const displayRadius = (imageEditorState.eraserSize / 2) * scale;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cur.x * scale, cur.y * scale, displayRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cur.x * scale, cur.y * scale, displayRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (imageEditorState.cutoutMode) {
    const markerRadius = Math.max(2, Math.min(22, imageEditorState.markRadius * scale * 0.35));
    if (imageEditorState.fgPoints.length) {
      ctx.save();
      ctx.fillStyle = "#1f6f5f";
      for (const pt of imageEditorState.fgPoints) {
        ctx.beginPath();
        ctx.arc(pt.x * scale, pt.y * scale, markerRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (imageEditorState.bgPoints.length) {
      ctx.save();
      ctx.fillStyle = "#c94f2c";
      for (const pt of imageEditorState.bgPoints) {
        ctx.beginPath();
        ctx.arc(pt.x * scale, pt.y * scale, markerRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

function requestRenderImageEditorCanvas() {
  if (imageEditorRenderScheduled) {
    return;
  }
  imageEditorRenderScheduled = true;
  window.requestAnimationFrame(() => {
    imageEditorRenderScheduled = false;
    renderImageEditorCanvas();
  });
}

function getEditorCanvasPoint(event) {
  const canvas = refs.imageEditorCanvas;
  const rect = canvas.getBoundingClientRect();
  const source = event.touches?.[0] || event.changedTouches?.[0] || event;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (source.clientX - rect.left) * scaleX,
    y: (source.clientY - rect.top) * scaleY,
  };
}

function openImageEditorDialog() {
  const activeImage = state.imageDataList[state.coverImageIndex];
  if (!activeImage) {
    return;
  }

  loadImageIntoEditor(activeImage)
    .then(() => {
      imageEditorState.rotation = 0;
      imageEditorState.activeTool = null;
      imageEditorState.isCropMode = false;
      imageEditorState.isDragging = false;
      imageEditorState.cropRect = null;
      imageEditorState.dragStart = null;
      imageEditorState.history = [];
      imageEditorState.historyIndex = -1;
      imageEditorState.cutoutMode = false;
      imageEditorState.markMode = null;
      imageEditorState.fgPoints = [];
      imageEditorState.bgPoints = [];
      if (refs.editorMarkSlider) {
        refs.editorMarkSlider.value = String(imageEditorState.markRadius);
      }
      if (refs.editorMarkSize) {
        refs.editorMarkSize.textContent = String(imageEditorState.markRadius);
      }
      if (refs.editorMarkControl) {
        refs.editorMarkControl.hidden = true;
      }
      if (refs.cutoutMarkBtns) {
        refs.cutoutMarkBtns.style.display = "none";
      }
      syncImageEditorToolUi();
      saveEditorHistoryState();
      updateUndoRedoButtons();
      if (refs.editorUnsavedBanner) refs.editorUnsavedBanner.hidden = true;
      renderImageEditorCanvas();
      refs.imageEditorDialog?.showModal();
    })
    .catch(() => {});
}

function hasUnappliedEditorChanges() {
  if (imageEditorState.history.length <= 1) {
    return false;
  }
  return imageEditorState.historyIndex > 0;
}

function closeImageEditorDialog() {
  if (hasUnappliedEditorChanges()) {
    if (refs.editorUnsavedBanner) {
      refs.editorUnsavedBanner.hidden = false;
    }
    return;
  }
  forceCloseImageEditorDialog();
}

function forceCloseImageEditorDialog() {
  if (refs.editorUnsavedBanner) {
    refs.editorUnsavedBanner.hidden = true;
  }
  refs.imageEditorDialog?.close();
  imageEditorState.isDragging = false;
  imageEditorState.dragStart = null;
}

function toggleImageCropMode() {
  const willEnable = imageEditorState.activeTool !== "crop";
  imageEditorState.activeTool = willEnable ? "crop" : null;
  imageEditorState.isCropMode = willEnable;
  imageEditorState.isDragging = false;
  imageEditorState.dragStart = null;

  if (!willEnable) {
    imageEditorState.cropRect = null;
  } else {
    // 根据源图片大小初始化裁剪框，而不是显示canvas的大小
    const sourceCanvas = imageEditorState.sourceCanvas;
    const displayCanvas = refs.imageEditorCanvas;
    const srcWidth = Math.max(1, sourceCanvas.width);
    const srcHeight = Math.max(1, sourceCanvas.height);
    const displayWidth = Math.max(1, displayCanvas?.width || srcWidth);
    const displayHeight = Math.max(1, displayCanvas?.height || srcHeight);
    
    // 计算显示canvas到源canvas的缩放比例
    const scale = {
      x: srcWidth / displayWidth,
      y: srcHeight / displayHeight
    };
    
    imageEditorState.cropRect = {
      x: 0,
      y: 0,
      w: srcWidth,      // 使用源图片的实际宽度
      h: srcHeight,     // 使用源图片的实际高度
    };
    saveEditorHistoryState();
  }
  syncImageEditorToolUi();
  renderImageEditorCanvas();
}

function toggleImageRotateMode() {
  imageEditorState.activeTool = imageEditorState.activeTool === "rotate" ? null : "rotate";
  imageEditorState.isCropMode = false;
  imageEditorState.cropRect = null;
  imageEditorState.isDragging = false;
  imageEditorState.dragStart = null;
  syncImageEditorToolUi();
  renderImageEditorCanvas();
}

function toggleImageEraserMode() {
  imageEditorState.activeTool = imageEditorState.activeTool === "eraser" ? null : "eraser";
  imageEditorState.isCropMode = false;
  imageEditorState.cropRect = null;
  imageEditorState.isDragging = false;
  imageEditorState.dragStart = null;
  syncImageEditorToolUi();
  renderImageEditorCanvas();
}

function rotateImageEditor(degrees) {
  imageEditorState.rotation = (imageEditorState.rotation + degrees) % 360;
  saveEditorHistoryState();
  renderImageEditorCanvas();
}

function mirrorImageHorizontal() {
  const sourceCanvas = imageEditorState.sourceCanvas;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sourceCanvas.width;
  tempCanvas.height = sourceCanvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.translate(sourceCanvas.width, 0);
  tempCtx.scale(-1, 1);
  tempCtx.drawImage(sourceCanvas, 0, 0);
  const ctx = sourceCanvas.getContext("2d");
  ctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  ctx.drawImage(tempCanvas, 0, 0);
  saveEditorHistoryState();
  renderImageEditorCanvas();
}

function applyImageCrop() {
  const rect = imageEditorState.cropRect;
  if (!rect || rect.w < 4 || rect.h < 4) {
    return;
  }

  const sourceCanvas = imageEditorState.sourceCanvas;
  const sourceCtx = sourceCanvas.getContext("2d");
  const sx = Math.max(0, Math.floor(rect.x));
  const sy = Math.max(0, Math.floor(rect.y));
  const sw = Math.max(1, Math.floor(rect.w));
  const sh = Math.max(1, Math.floor(rect.h));
  const clampedW = Math.min(sw, sourceCanvas.width - sx);
  const clampedH = Math.min(sh, sourceCanvas.height - sy);

  if (clampedW <= 0 || clampedH <= 0) {
    return;
  }

  // 像素级裁剪，避免drawImage插值导致额外像素变化
  const croppedData = sourceCtx.getImageData(sx, sy, clampedW, clampedH);

  const nextCanvas = document.createElement("canvas");
  nextCanvas.width = clampedW;
  nextCanvas.height = clampedH;
  const nextCtx = nextCanvas.getContext("2d");
  nextCtx.putImageData(croppedData, 0, 0);

  sourceCanvas.width = clampedW;
  sourceCanvas.height = clampedH;
  sourceCanvas.getContext("2d").putImageData(croppedData, 0, 0);

  imageEditorState.cropRect = null;
  imageEditorState.isCropMode = false;
  imageEditorState.activeTool = null;
  imageEditorState.rotation = 0;
  syncImageEditorToolUi();
  saveEditorHistoryState();
  renderImageEditorCanvas();
}

function setImageEraserSize(sliderValue) {
  imageEditorState.eraserSize = Math.round(sliderValue);
  if (refs.editorEraserSize) {
    refs.editorEraserSize.textContent = imageEditorState.eraserSize;
  }
  if (imageEditorState.eraserCursorPos) {
    requestRenderImageEditorCanvas();
  }
}

function setImageMarkSize(sliderValue) {
  imageEditorState.markRadius = Math.round(sliderValue);
  if (refs.editorMarkSize) {
    refs.editorMarkSize.textContent = String(imageEditorState.markRadius);
  }
  // 总是重新渲染以显示标记大小的变化
  requestRenderImageEditorCanvas();
}

function undoImageEditorAction() {
  if (imageEditorState.historyIndex > 0) {
    restoreEditorHistoryState(imageEditorState.historyIndex - 1);
  }
}

function redoImageEditorAction() {
  if (imageEditorState.historyIndex < imageEditorState.history.length - 1) {
    restoreEditorHistoryState(imageEditorState.historyIndex + 1);
  }
}

function applySmartCutout() {
  // --- 点引导 + K-means 混合抠图 ---
  const sourceCanvas = imageEditorState.sourceCanvas;
  const ctx = sourceCanvas.getContext("2d");
  const { width, height } = sourceCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  if (!width || !height) {
    return;
  }

  function distSq(rgbA, rgbB) {
    const dr = rgbA[0] - rgbB[0];
    const dg = rgbA[1] - rgbB[1];
    const db = rgbA[2] - rgbB[2];
    return dr * dr + dg * dg + db * db;
  }

  function meanRgb(list) {
    if (!list.length) {
      return null;
    }
    let r = 0;
    let g = 0;
    let b = 0;
    for (const rgb of list) {
      r += rgb[0];
      g += rgb[1];
      b += rgb[2];
    }
    const count = Math.max(1, list.length);
    return [r / count, g / count, b / count];
  }

  function nearestCenterIndex(rgb, centers) {
    let minDist = Number.POSITIVE_INFINITY;
    let minIndex = 0;
    for (let centerIndex = 0; centerIndex < centers.length; centerIndex += 1) {
      const distance = distSq(rgb, centers[centerIndex]);
      if (distance < minDist) {
        minDist = distance;
        minIndex = centerIndex;
      }
    }
    return minIndex;
  }

  function pointColors(points, radius = 2) {
    const result = [];
    for (const point of points) {
      const cx = Math.min(width - 1, Math.max(0, Math.round(point.x)));
      const cy = Math.min(height - 1, Math.max(0, Math.round(point.y)));
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          const x = cx + ox;
          const y = cy + oy;
          if (x < 0 || x >= width || y < 0 || y >= height) {
            continue;
          }
          const idx = (y * width + x) * 4;
          result.push([pixels[idx], pixels[idx + 1], pixels[idx + 2]]);
        }
      }
    }
    return result;
  }

  function shrinkPalette(colors, maxCount = 28) {
    if (colors.length <= maxCount) {
      return colors;
    }
    const result = [];
    const stride = colors.length / maxCount;
    for (let i = 0; i < maxCount; i += 1) {
      result.push(colors[Math.floor(i * stride)]);
    }
    return result;
  }

  function minDistanceToPalette(rgb, palette) {
    let min = Number.POSITIVE_INFINITY;
    for (const color of palette) {
      const distance = distSq(rgb, color);
      if (distance < min) {
        min = distance;
      }
    }
    return Math.sqrt(min);
  }

  // 采样像素点（降采样加速）
  const samples = [];
  const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 120));
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4;
      samples.push([pixels[idx], pixels[idx + 1], pixels[idx + 2]]);
    }
  }

  const markSampleRadius = Math.max(1, Math.floor(imageEditorState.markRadius * 0.22));
  const fgPointColors = shrinkPalette(pointColors(imageEditorState.fgPoints || [], markSampleRadius), 36);
  const bgPointColors = shrinkPalette(pointColors(imageEditorState.bgPoints || [], markSampleRadius), 36);
  const fgGuideFromPoints = meanRgb(fgPointColors);
  const bgGuideFromPoints = meanRgb(bgPointColors);

  // K-means聚类（K=2，前景/背景）
  function kmeans(data, k = 2, maxIter = 8) {
    const centers = [
      bgGuideFromPoints || data[0],
      fgGuideFromPoints || data[Math.floor(data.length / 2)],
    ];
    let labels = new Array(data.length).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      // 分配标签
      for (let i = 0; i < data.length; i++) {
        let minDist = 1e9, minIdx = 0;
        for (let c = 0; c < k; c++) {
          const dr = data[i][0] - centers[c][0];
          const dg = data[i][1] - centers[c][1];
          const db = data[i][2] - centers[c][2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < minDist) {
            minDist = dist;
            minIdx = c;
          }
        }
        labels[i] = minIdx;
      }
      // 更新中心
      const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
      for (let i = 0; i < data.length; i++) {
        const l = labels[i];
        sums[l][0] += data[i][0];
        sums[l][1] += data[i][1];
        sums[l][2] += data[i][2];
        sums[l][3] += 1;
      }
      for (let c = 0; c < k; c++) {
        if (sums[c][3] > 0) {
          centers[c] = [
            sums[c][0] / sums[c][3],
            sums[c][1] / sums[c][3],
            sums[c][2] / sums[c][3],
          ];
        }
      }
    }
    return { centers, labels };
  }

  const { centers } = kmeans(samples, 2, 8);

  // 用点标记优先决定前景/背景聚类
  let fgIdx = 1;
  let bgIdx = 0;

  const fgVotes = [0, 0];
  for (const rgb of fgPointColors) {
    fgVotes[nearestCenterIndex(rgb, centers)] += 1;
  }
  const bgVotes = [0, 0];
  for (const rgb of bgPointColors) {
    bgVotes[nearestCenterIndex(rgb, centers)] += 1;
  }

  if (bgPointColors.length) {
    bgIdx = bgVotes[0] >= bgVotes[1] ? 0 : 1;
    fgIdx = bgIdx === 0 ? 1 : 0;
  } else if (fgPointColors.length) {
    fgIdx = fgVotes[0] >= fgVotes[1] ? 0 : 1;
    bgIdx = fgIdx === 0 ? 1 : 0;
  }

  // 没有标记点时回退边缘采样
  let edgeCounts = [0, 0];
  if (!fgPointColors.length && !bgPointColors.length) {
    for (let x = 0; x < width; x += sampleStep) {
      let idx = x * 4;
      let rgb = [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
      edgeCounts[nearestCenterIndex(rgb, centers)] += 1;
      idx = ((height - 1) * width + x) * 4;
      rgb = [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
      edgeCounts[nearestCenterIndex(rgb, centers)] += 1;
    }
    for (let y = 0; y < height; y += sampleStep) {
      let idx = y * width * 4;
      let rgb = [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
      edgeCounts[nearestCenterIndex(rgb, centers)] += 1;
      idx = (y * width + (width - 1)) * 4;
      rgb = [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
      edgeCounts[nearestCenterIndex(rgb, centers)] += 1;
    }
    bgIdx = edgeCounts[0] > edgeCounts[1] ? 0 : 1;
    fgIdx = bgIdx === 0 ? 1 : 0;
  }

  const fgGuide = fgGuideFromPoints || centers[fgIdx];
  const bgGuide = bgGuideFromPoints || centers[bgIdx];
  const hasFgPoints = fgPointColors.length > 0;
  const hasBgPoints = bgPointColors.length > 0;
  const keepRatio = hasFgPoints || hasBgPoints ? 0.90 : 0.88;
  const dropRatio = hasFgPoints || hasBgPoints ? 1.01 : 1.12;
  const edgeBand = Math.max(10, Math.floor(Math.min(width, height) * 0.05));

  // 抠图：点标记 + 聚类中心双引导
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const rgb = [pixels[idx], pixels[idx + 1], pixels[idx + 2]];

      const dFgGuide = Math.sqrt(distSq(rgb, fgGuide));
      const dBgGuide = Math.sqrt(distSq(rgb, bgGuide));
      const dFgCenter = Math.sqrt(distSq(rgb, centers[fgIdx]));
      const dBgCenter = Math.sqrt(distSq(rgb, centers[bgIdx]));
      const dFgPoint = hasFgPoints ? minDistanceToPalette(rgb, fgPointColors) : dFgGuide;
      const dBgPoint = hasBgPoints ? minDistanceToPalette(rgb, bgPointColors) : dBgGuide;

      // 优化权重配置，更加注重标记点信息
      let fgScore = dFgGuide * 0.08 + dFgCenter * 0.16 + dFgPoint * 0.76;
      let bgScore = dBgGuide * 0.08 + dBgCenter * 0.16 + dBgPoint * 0.76;

      if (hasFgPoints && !hasBgPoints) {
        bgScore *= 1.12;
      }
      if (hasBgPoints && !hasFgPoints) {
        fgScore *= 1.12;
      }

      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (edgeDistance < edgeBand) {
        const t = (edgeBand - edgeDistance) / edgeBand;
        bgScore *= 1 - 0.22 * t;
      }

      const ratio = fgScore / Math.max(1, bgScore);
      if (ratio >= dropRatio) {
        pixels[idx + 3] = 0;
      } else if (ratio > keepRatio) {
        const transition = (dropRatio - ratio) / Math.max(0.0001, dropRatio - keepRatio);
        pixels[idx + 3] = Math.round(pixels[idx + 3] * transition);
      }
    }
  }

  // 明确标记点强约束
  const forceRadius = Math.max(3, Math.round(imageEditorState.markRadius * 0.55));
  for (const point of imageEditorState.fgPoints) {
    const cx = Math.round(point.x);
    const cy = Math.round(point.y);
    for (let oy = -forceRadius; oy <= forceRadius; oy += 1) {
      for (let ox = -forceRadius; ox <= forceRadius; ox += 1) {
        if (ox * ox + oy * oy > forceRadius * forceRadius) continue;
        const x = cx + ox;
        const y = cy + oy;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const idx = (y * width + x) * 4;
        pixels[idx + 3] = 255;
      }
    }
  }
  for (const point of imageEditorState.bgPoints) {
    const cx = Math.round(point.x);
    const cy = Math.round(point.y);
    for (let oy = -forceRadius; oy <= forceRadius; oy += 1) {
      for (let ox = -forceRadius; ox <= forceRadius; ox += 1) {
        if (ox * ox + oy * oy > forceRadius * forceRadius) continue;
        const x = cx + ox;
        const y = cy + oy;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const idx = (y * width + x) * 4;
        pixels[idx + 3] = 0;
      }
    }
  }

  // 从背景种子进行连通传播，尽可能清除与背景同类且连通的区域
  if (hasBgPoints) {
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    function push(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = y * width + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      queue[tail++] = idx;
    }

    for (const point of imageEditorState.bgPoints) {
      const cx = Math.round(point.x);
      const cy = Math.round(point.y);
      const seedRadius = Math.max(2, Math.round(forceRadius * 0.5));
      for (let oy = -seedRadius; oy <= seedRadius; oy += 1) {
        for (let ox = -seedRadius; ox <= seedRadius; ox += 1) {
          if (ox * ox + oy * oy > seedRadius * seedRadius) continue;
          push(cx + ox, cy + oy);
        }
      }
    }

    while (head < tail) {
      const linear = queue[head++];
      const x = linear % width;
      const y = Math.floor(linear / width);
      const p = linear * 4;

      const rgb = [pixels[p], pixels[p + 1], pixels[p + 2]];
      const dFgPoint = hasFgPoints ? minDistanceToPalette(rgb, fgPointColors) : Math.sqrt(distSq(rgb, fgGuide));
      const dBgPoint = minDistanceToPalette(rgb, bgPointColors);
      const bgLike = dBgPoint <= dFgPoint * 1.06;
      if (bgLike || pixels[p + 3] === 0) {
        pixels[p + 3] = 0;
        push(x - 1, y);
        push(x + 1, y);
        push(x, y - 1);
        push(x, y + 1);
      }
    }
  }

  // 轻量平滑边缘
  const smoothedAlpha = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            sum += pixels[idx + 3];
            count += 1;
          }
        }
      }
      smoothedAlpha[y * width + x] = Math.round(sum / Math.max(1, count));
    }
  }

  // === 方案1：颜色污染清除（防止白色残留） ===
  // 检测半透明区域是否混有背景色污染，自动清理
  function removeColorContamination() {
    const contaminationRadius = 2;
    const tempAlpha = new Uint8ClampedArray(smoothedAlpha);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const alpha = smoothedAlpha[idx];
        
        // 只处理半透明像素（30-225范围内）
        if (alpha > 30 && alpha < 225) {
          const pixelIdx = idx * 4;
          const currentColor = [pixels[pixelIdx], pixels[pixelIdx + 1], pixels[pixelIdx + 2]];
          
          // 检查周围像素，找最常见的非半透明颜色
          const surroundingColors = [];
          for (let oy = -contaminationRadius; oy <= contaminationRadius; oy++) {
            for (let ox = -contaminationRadius; ox <= contaminationRadius; ox++) {
              if (ox === 0 && oy === 0) continue;
              const nx = x + ox, ny = y + oy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              
              const nidx = ny * width + nx;
              const nAlpha = smoothedAlpha[nidx];
              if (nAlpha > 225 || nAlpha < 30) { // 完全透明或完全不透明
                const npixelIdx = nidx * 4;
                surroundingColors.push([
                  pixels[npixelIdx],
                  pixels[npixelIdx + 1],
                  pixels[npixelIdx + 2]
                ]);
              }
            }
          }
          
          // 如果周围有很多背景色（接近白色或黑色），则降低该像素alpha
          if (surroundingColors.length > 2) {
            const avgColor = meanRgb(surroundingColors);
            const isLightBg = avgColor[0] > 200 && avgColor[1] > 200 && avgColor[2] > 200;
            const isDarkBg = avgColor[0] < 50 && avgColor[1] < 50 && avgColor[2] < 50;
            
            if (isLightBg || isDarkBg) {
              const colorSimilarity = Math.sqrt(distSq(currentColor, avgColor)) / 255;
              if (colorSimilarity < 0.3) { // 颜色接近背景
                tempAlpha[idx] = Math.round(alpha * 0.6); // 削弱alpha
              }
            }
          }
        }
      }
    }
    
    return tempAlpha;
  }
  
  const cleanedAlpha = removeColorContamination();

  // === 方案2：Otsu自适应阈值（自动计算最优分割点） ===
  function computeOtsuThreshold(alphaArray) {
    const histogram = new Uint32Array(256);
    for (let i = 0; i < alphaArray.length; i++) {
      histogram[alphaArray[i]]++;
    }
    
    const total = alphaArray.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let maxVar = 0;
    let threshold = 0;
    
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      
      const wF = total - wB;
      if (wF === 0) break;
      
      sumB += t * histogram[t];
      const muB = sumB / wB;
      const muF = (sum - sumB) / wF;
      
      const variance = wB * wF * (muB - muF) * (muB - muF);
      if (variance > maxVar) {
        maxVar = variance;
        threshold = t;
      }
    }
    
    return threshold;
  }
  
  // 计算自适应阈值，但保持一个合理的范围
  let adaptiveThreshold = computeOtsuThreshold(cleanedAlpha);
  // 将Otsu阈值限制在可接受范围内（130-180之间）
  adaptiveThreshold = Math.max(130, Math.min(180, adaptiveThreshold));
  // 如果有标记点，稍微提高阈值以更严格
  if (hasFgPoints || hasBgPoints) {
    adaptiveThreshold = Math.min(180, adaptiveThreshold + 10);
  }

  // 应用自适应阈值处理
  for (let index = 0, pixelIndex = 0; index < cleanedAlpha.length; index += 1, pixelIndex += 4) {
    const alpha = cleanedAlpha[index];
    pixels[pixelIndex + 3] = alpha >= adaptiveThreshold ? 255 : 0;
  }

    // 清理完全透明像素的RGB值，防止白点/污点显示
    for (let index = 0, pixelIndex = 0; index < cleanedAlpha.length; index += 1, pixelIndex += 4) {
      if (pixels[pixelIndex + 3] === 0) {
        // 对于完全透明的像素，设置RGB为黑色（0,0,0）
        pixels[pixelIndex] = 0;
        pixels[pixelIndex + 1] = 0;
        pixels[pixelIndex + 2] = 0;
      }
    }

  ctx.putImageData(imageData, 0, 0);
  saveEditorHistoryState();
  renderImageEditorCanvas();
}

function getSourceCanvasPointFromDisplayPoint(point) {
  const sourceCanvas = imageEditorState.sourceCanvas;
  const displayCanvas = refs.imageEditorCanvas;
  const width = Math.max(1, sourceCanvas.width);
  const height = Math.max(1, sourceCanvas.height);
  const displayWidth = Math.max(1, displayCanvas?.width || width);
  const displayHeight = Math.max(1, displayCanvas?.height || height);
  const isRotated90 = imageEditorState.rotation === 90 || imageEditorState.rotation === 270;
  const drawWidth = isRotated90 ? height : width;
  const drawHeight = isRotated90 ? width : height;
  const scale = Math.min(displayWidth / Math.max(1, drawWidth), displayHeight / Math.max(1, drawHeight));
  const angle = (-imageEditorState.rotation * Math.PI) / 180;
  const centeredX = point.x - displayWidth / 2;
  const centeredY = point.y - displayHeight / 2;
  const rotatedX = centeredX * Math.cos(angle) - centeredY * Math.sin(angle);
  const rotatedY = centeredX * Math.sin(angle) + centeredY * Math.cos(angle);

  return {
    x: Math.min(sourceCanvas.width, Math.max(0, rotatedX / Math.max(scale, 0.0001) + width / 2)),
    y: Math.min(sourceCanvas.height, Math.max(0, rotatedY / Math.max(scale, 0.0001) + height / 2)),
  };
}

function eraseImageAtPoint(sourcePoint, previousPoint) {
  const sourceCanvas = imageEditorState.sourceCanvas;
  const ctx = sourceCanvas.getContext("2d");

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = imageEditorState.eraserSize;

  if (previousPoint) {
    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.lineTo(sourcePoint.x, sourcePoint.y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(sourcePoint.x, sourcePoint.y, imageEditorState.eraserSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function applyImageEditorToPreview() {
  if (imageEditorState.isCropMode && imageEditorState.cropRect) {
    applyImageCrop();
  }

  const sourceCanvas = imageEditorState.sourceCanvas;
  if (!sourceCanvas.width || !sourceCanvas.height) {
    return;
  }
  
  // 智能压缩：检查是否有透明像素
  // - 有透明（抠图）→ PNG 保质量
  // - 无透明（裁剪/旋转等）→ JPEG 90% 压缩空间
  const sourceCtx = sourceCanvas.getContext("2d");
  const pixels = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  
  let hasTransparentPixel = false;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 255) {
      hasTransparentPixel = true;
      break;
    }
  }
  
  let updatedDataUrl;
  if (hasTransparentPixel) {
    // 有透明像素（抠图结果）：保留PNG无损
    updatedDataUrl = sourceCanvas.toDataURL("image/png");
  } else {
    // 无透明像素：用JPEG压缩（质量90%）
    updatedDataUrl = sourceCanvas.toDataURL("image/jpeg", 0.90);
  }
  
  state.imageDataList[state.coverImageIndex] = updatedDataUrl;
  renderImageGallery();
  forceCloseImageEditorDialog();
}

function enterCutoutMode() {
  imageEditorState.cutoutMode = true;
  imageEditorState.markMode = null;
  if (refs.cutoutMarkBtns) refs.cutoutMarkBtns.style.display = "inline";
  if (refs.editorMarkControl) refs.editorMarkControl.hidden = false;
  refs.editorFgMarkBtn?.classList.remove("is-active");
  refs.editorBgMarkBtn?.classList.remove("is-active");
  setImageEditorHint("已进入抠图模式：先标记前景/背景，再点击“执行抠图”。");
}

function exitCutoutMode() {
  const hasMarks = imageEditorState.fgPoints.length > 0 || imageEditorState.bgPoints.length > 0;
  imageEditorState.cutoutMode = false;
  imageEditorState.markMode = null;
  imageEditorState.fgPoints = [];
  imageEditorState.bgPoints = [];
  imageEditorState.isDragging = false;
  imageEditorState.dragStart = null;
  if (refs.cutoutMarkBtns) refs.cutoutMarkBtns.style.display = "none";
  if (refs.editorMarkControl) refs.editorMarkControl.hidden = true;
  refs.editorFgMarkBtn?.classList.remove("is-active");
  refs.editorBgMarkBtn?.classList.remove("is-active");
  setImageEditorHint("已退出抠图模式。");
  if (hasMarks) {
    saveEditorHistoryState();
  }
  renderImageEditorCanvas();
}

async function removeBackgroundWithAI() {
  if (!imageEditorState.sourceCanvas || !imageEditorState.sourceCanvas.width) {
    setImageEditorHint("请先加载图片。");
    return;
  }

  setImageEditorHint("正在处理图片，请稍候（首次会加载模型，可能需要 10-20 秒）...");
  refs.editorRemoveBgBtn.disabled = true;

  try {
    // 使用本地 MediaPipe 分割
    const outputCanvas = await removeBackgroundWithMediaPipe(imageEditorState.sourceCanvas);
    
    // 将结果加载到编辑器 canvas
    const ctx = imageEditorState.sourceCanvas.getContext("2d");
    imageEditorState.sourceCanvas.width = outputCanvas.width;
    imageEditorState.sourceCanvas.height = outputCanvas.height;
    ctx.drawImage(outputCanvas, 0, 0);
    
    saveEditorHistoryState();
    renderImageEditorCanvas();
    setImageEditorHint("背景去除成功！");
    refs.editorRemoveBgBtn.disabled = false;
  } catch (error) {
    console.error("AI背景去除错误:", error);
    setImageEditorHint(`背景去除失败: ${error.message}`);
    refs.editorRemoveBgBtn.disabled = false;
  }
}

function toggleCutoutMarkMode(mode) {
  if (!imageEditorState.cutoutMode) {
    return;
  }
  imageEditorState.markMode = imageEditorState.markMode === mode ? null : mode;
  refs.editorFgMarkBtn?.classList.toggle("is-active", imageEditorState.markMode === "fg");
  refs.editorBgMarkBtn?.classList.toggle("is-active", imageEditorState.markMode === "bg");
  if (imageEditorState.markMode === "fg") {
    setImageEditorHint("前景标记中：点击要保留的区域，可多次点击。");
  } else if (imageEditorState.markMode === "bg") {
    setImageEditorHint("背景标记中：点击要去除的区域，可多次点击。");
  } else {
    setImageEditorHint("已取消标记。可选择前景/背景后继续。");
  }
}

function executeCutoutFromMode() {
  if (!imageEditorState.cutoutMode) {
    return;
  }

  const hasFg = imageEditorState.fgPoints.length > 0;
  const hasBg = imageEditorState.bgPoints.length > 0;

  // 如果同时有前景和背景标记，执行精准抠图（2轮refinement）
  if (hasFg && hasBg) {
    setImageEditorHint("正在执行精准抠图（2轮refinement），请稍候...");
    applySmartCutout();
    applySmartCutout();
    setImageEditorHint("精准抠图完成。可继续标记后再次执行，或退出抠图模式。");
  } else if (hasFg || hasBg) {
    // 只有前景或背景标记时，执行单轮抠图
    setImageEditorHint("正在执行抠图（单轮），请稍候...");
    applySmartCutout();
    setImageEditorHint("抠图完成。建议同时标记前景和背景后再执行以获得精准效果，或继续标记后再次执行。");
  } else {
    // 没有任何标记时，使用K-means自动分割
    setImageEditorHint("正在执行自动抠图，请稍候...");
    applySmartCutout();
    setImageEditorHint("自动抠图完成。建议标记前景和背景后再执行以获得精准效果。");
  }

  // 重置标记点并隐藏
  imageEditorState.fgPoints = [];
  imageEditorState.bgPoints = [];
  renderImageEditorCanvas();
}

function addCutoutMarkPoint(point) {
  const target = imageEditorState.markMode === "fg" ? imageEditorState.fgPoints : imageEditorState.bgPoints;
  const cx = Math.round(point.x);
  const cy = Math.round(point.y);
  const recent = target.slice(-500);
  const minDist = Math.max(2, imageEditorState.markRadius * 0.32);
  const minDistSq = minDist * minDist;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const dx = recent[i].x - cx;
    const dy = recent[i].y - cy;
    if (dx * dx + dy * dy <= minDistSq) {
      return false;
    }
  }
  target.push({ x: cx, y: cy });
  return true;
}

function stampCutoutMarkStroke(fromPoint, toPoint) {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const distance = Math.hypot(dx, dy);
  const step = 2.4;
  if (distance <= step) {
    return addCutoutMarkPoint(toPoint);
  }
  let changed = false;
  const segments = Math.max(1, Math.ceil(distance / step));
  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    const point = {
      x: fromPoint.x + dx * t,
      y: fromPoint.y + dy * t,
    };
    changed = addCutoutMarkPoint(point) || changed;
  }
  return changed;
}

function onImageEditorCanvasMouseDown(event) {
  if (imageEditorState.cutoutMode && (imageEditorState.markMode === "fg" || imageEditorState.markMode === "bg")) {
    event.preventDefault();
    const displayPoint = getEditorCanvasPoint(event);
    const sourcePoint = getSourceCanvasPointFromDisplayPoint(displayPoint);
    imageEditorState.isDragging = true;
    imageEditorState.dragStart = {
      point: sourcePoint,
      hasChanged: false,
      tool: "mark",
    };
    imageEditorState.dragStart.hasChanged = addCutoutMarkPoint(sourcePoint);
    requestRenderImageEditorCanvas();
    return;
  }

  if (imageEditorState.activeTool === "eraser") {
    event.preventDefault();
    const displayPoint = getEditorCanvasPoint(event);
    const sourcePoint = getSourceCanvasPointFromDisplayPoint(displayPoint);
    imageEditorState.isDragging = true;
    imageEditorState.dragStart = {
      point: sourcePoint,
      hasChanged: true,
      tool: "eraser",
    };
    eraseImageAtPoint(sourcePoint, null);
    renderImageEditorCanvas();
    return;
  }

  if (!imageEditorState.isCropMode || !imageEditorState.cropRect) {
    return;
  }
  event.preventDefault();
  
  // 将显示坐标转换到源图片坐标
  const displayPoint = getEditorCanvasPoint(event);
  const sourcePoint = getSourceCanvasPointFromDisplayPoint(displayPoint);
  const point = sourcePoint;
  const rect = imageEditorState.cropRect;
  const edgeThreshold = 12;

  imageEditorState.dragStart = {
    point,
    originalRect: { ...rect },
    edge: null,
    hasChanged: false,
    tool: "crop",
  };

  const dx = Math.min(Math.abs(point.x - rect.x), Math.abs(point.x - (rect.x + rect.w)));
  const dy = Math.min(Math.abs(point.y - rect.y), Math.abs(point.y - (rect.y + rect.h)));

  if (dy < edgeThreshold && dx < edgeThreshold) {
    if (point.x < rect.x + rect.w / 2 && point.y < rect.y + rect.h / 2) {
      imageEditorState.dragStart.edge = "tl";
    } else if (point.x > rect.x + rect.w / 2 && point.y < rect.y + rect.h / 2) {
      imageEditorState.dragStart.edge = "tr";
    } else if (point.x < rect.x + rect.w / 2 && point.y > rect.y + rect.h / 2) {
      imageEditorState.dragStart.edge = "bl";
    } else {
      imageEditorState.dragStart.edge = "br";
    }
  } else if (dy < edgeThreshold) {
    imageEditorState.dragStart.edge = point.y < rect.y + rect.h / 2 ? "t" : "b";
  } else if (dx < edgeThreshold) {
    imageEditorState.dragStart.edge = point.x < rect.x + rect.w / 2 ? "l" : "r";
  }

  imageEditorState.isDragging = imageEditorState.dragStart.edge !== null;
  renderImageEditorCanvas();
}

function onImageEditorCanvasMouseMove(event) {
  if (imageEditorState.cutoutMode && imageEditorState.markMode && imageEditorState.isDragging && imageEditorState.dragStart?.tool === "mark") {
    event.preventDefault();
    const displayPoint = getEditorCanvasPoint(event);
    const sourcePoint = getSourceCanvasPointFromDisplayPoint(displayPoint);
    const changed = stampCutoutMarkStroke(imageEditorState.dragStart.point, sourcePoint);
    imageEditorState.dragStart.point = sourcePoint;
    imageEditorState.dragStart.hasChanged = imageEditorState.dragStart.hasChanged || changed;
    if (changed) {
      requestRenderImageEditorCanvas();
    }
    return;
  }

  if (imageEditorState.activeTool === "eraser") {
    const displayPoint = getEditorCanvasPoint(event);
    imageEditorState.eraserCursorPos = displayPoint;

    if (imageEditorState.isDragging && imageEditorState.dragStart?.tool === "eraser") {
      event.preventDefault();
      const sourcePoint = getSourceCanvasPointFromDisplayPoint(displayPoint);
      eraseImageAtPoint(sourcePoint, imageEditorState.dragStart.point);
      imageEditorState.dragStart.point = sourcePoint;
      imageEditorState.dragStart.hasChanged = true;
    }
    requestRenderImageEditorCanvas();
    return;
  }

  if (!imageEditorState.isCropMode || !imageEditorState.cropRect) {
    return;
  }

  if (imageEditorState.isDragging && imageEditorState.dragStart) {
    const displayPoint = getEditorCanvasPoint(event);
    const sourcePoint = getSourceCanvasPointFromDisplayPoint(displayPoint);
    const point = sourcePoint;
    const rect = imageEditorState.dragStart.originalRect;
    const delta = {
      x: point.x - imageEditorState.dragStart.point.x,
      y: point.y - imageEditorState.dragStart.point.y,
    };
    const edge = imageEditorState.dragStart.edge;

    // 允许裁剪框向外移动（不限制为0，但保持最小大小）
    if (edge === "tl" || edge === "t" || edge === "tr") {
      imageEditorState.cropRect.y = rect.y + delta.y;
      imageEditorState.cropRect.h = Math.max(20, rect.h - delta.y);
    }
    if (edge === "bl" || edge === "b" || edge === "br") {
      imageEditorState.cropRect.h = Math.max(20, rect.h + delta.y);
    }
    if (edge === "tl" || edge === "l" || edge === "bl") {
      imageEditorState.cropRect.x = rect.x + delta.x;
      imageEditorState.cropRect.w = Math.max(20, rect.w - delta.x);
    }
    if (edge === "tr" || edge === "r" || edge === "br") {
      imageEditorState.cropRect.w = Math.max(20, rect.w + delta.x);
    }

    imageEditorState.dragStart.hasChanged = !areCropRectsEqual(imageEditorState.cropRect, rect);

    requestRenderImageEditorCanvas();
  } else if (imageEditorState.isCropMode && imageEditorState.cropRect) {
    const displayPoint = getEditorCanvasPoint(event);
    const sourcePoint = getSourceCanvasPointFromDisplayPoint(displayPoint);
    const point = sourcePoint;
    const rect = imageEditorState.cropRect;
    const edgeThreshold = 12;
    const dx = Math.min(Math.abs(point.x - rect.x), Math.abs(point.x - (rect.x + rect.w)));
    const dy = Math.min(Math.abs(point.y - rect.y), Math.abs(point.y - (rect.y + rect.h)));

    if ((dx < edgeThreshold && dy < edgeThreshold) || (dy < edgeThreshold && (point.x >= rect.x && point.x <= rect.x + rect.w)) || (dx < edgeThreshold && (point.y >= rect.y && point.y <= rect.y + rect.h))) {
      refs.imageEditorCanvas.style.cursor = (dx < edgeThreshold && dy < edgeThreshold) ? "nwse-resize" : (dx < edgeThreshold ? "ew-resize" : "ns-resize");
    } else {
      refs.imageEditorCanvas.style.cursor = "default";
    }
  }
}

function onImageEditorCanvasMouseUp() {
  if (!imageEditorState.dragStart) {
    return;
  }

  if (imageEditorState.dragStart.tool === "mark") {
    if (imageEditorState.dragStart.hasChanged) {
      saveEditorHistoryState();
    }
    imageEditorState.isDragging = false;
    imageEditorState.dragStart = null;
    return;
  }

  if (imageEditorState.dragStart.tool === "eraser") {
    if (imageEditorState.dragStart.hasChanged) {
      saveEditorHistoryState();
    }
    imageEditorState.isDragging = false;
    imageEditorState.dragStart = null;
    return;
  }

  if (!imageEditorState.isCropMode) {
    imageEditorState.isDragging = false;
    imageEditorState.dragStart = null;
    return;
  }

  if (imageEditorState.dragStart.hasChanged) {
    saveEditorHistoryState();
  }
  imageEditorState.isDragging = false;
  imageEditorState.dragStart = null;
}

function onImageEditorCanvasMouseLeave() {
  imageEditorState.eraserCursorPos = null;
  if (imageEditorState.activeTool === "eraser") {
    requestRenderImageEditorCanvas();
  }
  onImageEditorCanvasMouseUp();
}

function onImageEditorCanvasTouchStart(event) {
  onImageEditorCanvasMouseDown(event);
}

function onImageEditorCanvasTouchMove(event) {
  onImageEditorCanvasMouseMove(event);
}

function onImageEditorCanvasTouchEnd() {
  onImageEditorCanvasMouseUp();
}

function onAddSubmit(event) {
  event.preventDefault();

  const formData = new FormData(refs.addForm);
  // 优先使用自定义颜色，否则使用select中的颜色
  const customColor = String(refs.customColorInput.value || "").trim();
  const selectedColor = customColor ? customColor : String(formData.get("color") || "");
  const editingEntry = state.editingId ? state.items.find((entry) => entry.id === state.editingId) : null;

  let payload = normalizeItem({
    name: String(formData.get("name") || "").trim(),
    brand: String(formData.get("brand") || "").trim(),
    size: String(formData.get("size") || "").trim(),
    price: Number(formData.get("price") || 0),
    category: String(formData.get("category") || CATEGORY_LIST[0]),
    season: String(formData.get("season") || "").trim(),
    color: selectedColor,
    images: [...state.imageDataList],
    image: state.imageDataList[state.coverImageIndex] || "",
  });

  // 编辑场景下，若表单字段因历史数据不匹配而为空，则回退到原始值
  if (editingEntry) {
    payload = normalizeItem({
      ...editingEntry,
      ...payload,
      name: payload.name || editingEntry.name || "",
      brand: payload.brand || editingEntry.brand || "",
      size: payload.size || editingEntry.size || "",
      season: payload.season || editingEntry.season || "四季",
      color: payload.color || editingEntry.color || "",
      image: payload.image || editingEntry.image || "",
      images: payload.images?.length ? payload.images : (Array.isArray(editingEntry.images) ? editingEntry.images : []),
    });
  }

  if (!payload.name || !payload.brand || !payload.size || !payload.season || !Number.isFinite(payload.price)) {
    showAppMessage("请完善名称、品牌、尺码、季节和价格后再保存。", "保存失败");
    return;
  }

  ensureBrandInCatalog(payload.brand);

  if (state.editingId) {
    const index = state.items.findIndex((entry) => entry.id === state.editingId);
    if (index !== -1) {
      state.items[index] = {
        ...state.items[index],
        ...payload,
        id: state.items[index].id,
      };
    }
  } else {
    state.items.unshift({
      ...payload,
      id: `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    });
  }

  const savedOk = saveItems();
  if (!savedOk) {
    showAppMessage("保存失败：图片数据过大，浏览器本地存储空间不足。请减少图片数量、降低图片尺寸，或删除部分旧衣物后重试。", "保存失败");
    return;
  }
  // 先关闭弹窗，避免后续渲染异常造成“点击无反应”体验
  forceCloseAddDialog();

  try {
    renderBrandOptions();
    renderCategories();
    renderClothes();
    renderLockOptions();
    renderRecommendations();
    renderFavoriteLooks();
  } catch {
    showAppMessage("保存成功，但页面刷新时发生异常，请手动刷新页面查看最新结果。", "提示");
  }
}

function openCreateBrandDialog() {
  toggleAddBrandMenu(false);
  toggleFilterBrandMenu(false);
  refs.newBrandNameInput.value = "";
  refs.newBrandLogoInput.value = "";
  refs.brandLogoPreviewWrap.style.display = "none";
  refs.brandLogoPreview.src = "";
  refs.createBrandDialog.showModal();
}

function clearBrandLogo() {
  refs.newBrandLogoInput.value = "";
  refs.brandLogoPreviewWrap.style.display = "none";
  refs.brandLogoPreview.src = "";
}

async function onBrandLogoChange(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    clearBrandLogo();
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    refs.brandLogoPreview.src = dataUrl;
    refs.brandLogoPreviewWrap.style.display = "block";
  } catch {
    clearBrandLogo();
  }
}

function closeCreateBrandDialog() {
  if (refs.createBrandDialog.open) {
    refs.createBrandDialog.close();
  }
}

async function onCreateBrandSubmit(event) {
  event.preventDefault();
  const brandName = normalizeBrandName(refs.newBrandNameInput.value);
  const [file] = refs.newBrandLogoInput.files ?? [];

  if (!brandName || isBlockedBrand(brandName)) {
    return;
  }

  // 如果没有上传Logo，询问用户是否保存
  if (!file) {
    openAppConfirm("未上传Logo，是否保存？保存后Logo将显示品牌缩写徽章。", () => {
      // 用户确认保存，不设置Logo（使用SVG缩写徽章）
      ensureBrandInCatalog(brandName);
      renderBrandOptions();
      renderBrandLibrary();
      setAddBrandValue(brandName);
      closeCreateBrandDialog();
    }, "新增品牌");
    return;
  }

  try {
    const logoData = await readFileAsDataUrl(file);
    ensureBrandInCatalog(brandName);
    setBrandLogo(brandName, logoData);
    renderBrandOptions();
    renderBrandLibrary();
    setAddBrandValue(brandName);
    closeCreateBrandDialog();
  } catch {
    showAppMessage("品牌Logo上传失败，请重试。", "上传失败");
  }
}

function deleteItem(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  openAppConfirm(`确认删除 ${item.name} 吗？`, () => {
    state.items = state.items.filter((entry) => entry.id !== itemId);
    saveItems();
    renderBrandOptions();
    renderCategories();
    renderClothes();
    renderLockOptions();
    renderRecommendations();
    renderFavoriteLooks();
  }, "删除服装");
}

function onClothesAction(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const card = actionButton.closest(".clothing-card");
  const itemId = card?.dataset.itemId;
  if (!itemId) {
    return;
  }

  const action = actionButton.dataset.action;
  if (action === "edit") {
    openEditDialog(itemId);
    return;
  }

  if (action === "delete") {
    deleteItem(itemId);
  }
}

function sceneLabel(scene) {
  const map = {
    any: "不限场合",
    daily: "日常",
    work: "通勤",
    sport: "运动",
    date: "约会",
  };
  return map[scene] || "日常";
}

function weatherLabel(weather) {
  const map = {
    any: "不限天气",
    hot: "炎热",
    mild: "温和",
    cold: "偏冷",
  };
  return map[weather] || "温和";
}

function renderLockOptions() {
  const topItems = state.items.filter((item) => item.category === "短袖上衣" || item.category === "长袖上衣");
  const bottomItems = state.items.filter((item) => item.category === "长裤" || item.category === "短裤");
  const accessoryItems = state.items.filter((item) => item.category === "配饰");

  fillLockSelect(refs.lockTopSelect, topItems, "不锁定上衣");
  fillLockSelect(refs.lockBottomSelect, bottomItems, "不锁定下装");
  fillLockSelect(refs.lockAccessorySelect, accessoryItems, "不锁定配饰");
}

function fillLockSelect(select, items, defaultText) {
  const current = select.value || "";
  select.innerHTML = `<option value="">${defaultText}</option>`;
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} (${item.brand})`;
    select.append(option);
  }
  select.value = items.some((item) => item.id === current) ? current : "";
}

function getItemById(itemId) {
  return state.items.find((item) => item.id === itemId) || null;
}

function buildRecommendations(weather, scene) {
  const allowSeasons = allowedSeasonsForWeather(weather);
  const locks = {
    top: getItemById(refs.lockTopSelect.value),
    bottom: getItemById(refs.lockBottomSelect.value),
    accessory: getItemById(refs.lockAccessorySelect.value),
  };

  let tops = state.items.filter(
    (item) => (item.category === "短袖上衣" || item.category === "长袖上衣") && allowSeasons.includes(item.season)
  );
  let bottoms = state.items.filter(
    (item) => (item.category === "长裤" || item.category === "短裤") && allowSeasons.includes(item.season)
  );
  const accessories = state.items.filter((item) => item.category === "配饰" && allowSeasons.includes(item.season));

  if (weather === "cold") {
    tops = tops.filter((item) => item.category === "长袖上衣");
    bottoms = bottoms.filter((item) => item.category === "长裤");
  }
  if (weather === "hot") {
    tops = tops.filter((item) => item.category === "短袖上衣" || scene === "work");
    bottoms = bottoms.filter((item) => item.category === "短裤" || scene === "work");
  }
  if (scene === "work") {
    bottoms = bottoms.filter((item) => item.category === "长裤");
  }

  if (locks.top) {
    tops = tops.filter((item) => item.id === locks.top.id);
  }
  if (locks.bottom) {
    bottoms = bottoms.filter((item) => item.id === locks.bottom.id);
  }

  if (tops.length === 0 || bottoms.length === 0) {
    return [];
  }

  const count = Math.min(3, Math.max(tops.length, bottoms.length));
  const plans = [];

  for (let index = 0; index < count; index += 1) {
    const top = tops[index % tops.length];
    const bottom = bottoms[(index + 1) % bottoms.length];
    const accessory = locks.accessory || (accessories.length > 0 ? accessories[index % accessories.length] : null);
    plans.push({
      title: `${sceneLabel(scene)} · ${weatherLabel(weather)}穿搭 ${index + 1}`,
      top,
      bottom,
      accessory,
    });
  }

  return plans;
}

function renderRecommendations() {
  const weather = refs.weatherSelect.value;
  const scene = refs.sceneSelect.value;
  const plans = buildRecommendations(weather, scene);
  state.currentRecommendations = plans;
  refs.recommendList.innerHTML = "";

  if (plans.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "当前锁定或季节条件下无法生成穿搭，请调整条件。";
    refs.recommendList.append(empty);
  } else {
    for (const plan of plans) {
      const card = refs.recommendCardTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.planIndex = String(plans.indexOf(plan));
      const lines = card.querySelectorAll(".recommend-card__line");
      card.querySelector(".recommend-card__title").textContent = plan.title;
      lines[0].textContent = `上衣：${plan.top.name}（${plan.top.brand}）`;
      lines[1].textContent = `下装：${plan.bottom.name}（${plan.bottom.brand}）`;
      lines[2].textContent = "鞋履：可自由搭配";
      lines[3].textContent = plan.accessory ? `配饰：${plan.accessory.name}（${plan.accessory.brand}）` : "配饰：可自由搭配";
      // 设置图片
      const imgTop = card.querySelector(".recommend-card__img--top");
      const imgBottom = card.querySelector(".recommend-card__img--bottom");
      if (imgTop) imgTop.src = plan.top.image || "";
      if (imgBottom) imgBottom.src = plan.bottom.image || "";
      refs.recommendList.append(card);
    }
  }

  refs.recommendCount.textContent = `推荐 ${plans.length} 套`;
}

function saveLook(planIndex) {
  const plan = state.currentRecommendations[planIndex];
  if (!plan) {
    return;
  }

  const look = {
    id: `look-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: plan.title,
    top: `上衣：${plan.top.name}（${plan.top.brand} · ${plan.top.color} · ${plan.top.season}）`,
    bottom: `下装：${plan.bottom.name}（${plan.bottom.brand} · ${plan.bottom.color} · ${plan.bottom.season}）`,
    shoes: "鞋履：可自由搭配",
    accessory: plan.accessory
      ? `配饰：${plan.accessory.name}（${plan.accessory.brand} · ${plan.accessory.color} · ${plan.accessory.season}）`
      : "配饰：可自由搭配",
    topImage: plan.top.image || "",
    bottomImage: plan.bottom.image || "",
    createdAt: new Date().toISOString(),
  };

  state.favoriteLooks.unshift(normalizeFavoriteLook(look));
  saveFavoriteLooks();
  renderFavoriteLooks();
}

function getManualLookItemsByTarget(target) {
  if (target === "top") {
    return state.items.filter((item) => item.category === "短袖上衣" || item.category === "长袖上衣");
  }
  if (target === "bottom") {
    return state.items.filter((item) => item.category === "长裤" || item.category === "短裤");
  }
  if (target === "shoes") {
    return state.items.filter((item) => item.category === "鞋履");
  }
  if (target === "accessory") {
    return state.items.filter((item) => item.category === "配饰");
  }
  return [];
}

function renderManualLookDraftUi() {
  const top = getItemById(state.manualLookDraft.topId);
  const bottom = getItemById(state.manualLookDraft.bottomId);
  const shoes = getItemById(state.manualLookDraft.shoesId);
  const accessory = getItemById(state.manualLookDraft.accessoryId);

  if (refs.pickManualTopBtn) {
    refs.pickManualTopBtn.textContent = top ? `${top.name}（${top.brand}）` : "选择上装";
  }
  if (refs.pickManualBottomBtn) {
    refs.pickManualBottomBtn.textContent = bottom ? `${bottom.name}（${bottom.brand}）` : "选择下装";
  }
  if (refs.pickManualShoesBtn) {
    refs.pickManualShoesBtn.textContent = shoes ? `${shoes.name}（${shoes.brand}）` : "选择鞋履";
  }
  if (refs.pickManualAccessoryBtn) {
    refs.pickManualAccessoryBtn.textContent = accessory ? `${accessory.name}（${accessory.brand}）` : "选择配饰";
  }

  const previewMap = [
    [refs.manualLookTopPreview, top],
    [refs.manualLookBottomPreview, bottom],
    [refs.manualLookShoesPreview, shoes],
    [refs.manualLookAccessoryPreview, accessory],
  ];
  for (const [imgEl, item] of previewMap) {
    if (!imgEl) {
      continue;
    }
    if (item?.image) {
      imgEl.src = item.image;
      imgEl.hidden = false;
    } else {
      imgEl.src = "";
      imgEl.hidden = true;
    }
  }
}

function renderManualLookPickerList() {
  const target = state.manualLookPickerTarget;
  const list = getManualLookItemsByTarget(target);
  refs.manualLookPickerList.innerHTML = "";

  if (refs.clearManualLookPickerBtn) {
    refs.clearManualLookPickerBtn.hidden = target === "top" || target === "bottom";
  }

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "该分类暂无服装，请先添加。";
    refs.manualLookPickerList.append(empty);
    return;
  }

  for (const item of list) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "manual-look-picker-item";
    button.dataset.pickItemId = item.id;
    button.innerHTML = `
      <img src="${item.image || ""}" alt="${item.name}" />
      <span>${item.name}</span>
      <small>${item.brand}</small>
    `;
    refs.manualLookPickerList.append(button);
  }
}

function openManualLookPicker(target) {
  state.manualLookPickerTarget = target;
  const titleMap = {
    top: "选择上装",
    bottom: "选择下装",
    shoes: "选择鞋履",
    accessory: "选择配饰",
  };
  if (refs.manualLookPickerTitle) {
    refs.manualLookPickerTitle.textContent = titleMap[target] || "选择服装";
  }
  renderManualLookPickerList();
  refs.manualLookPickerDialog?.showModal();
}

function closeManualLookPickerDialog() {
  refs.manualLookPickerDialog?.close();
}

function applyManualLookSelection(itemId) {
  const target = state.manualLookPickerTarget;
  if (!target) {
    return;
  }
  if (target === "top") {
    state.manualLookDraft.topId = itemId;
  } else if (target === "bottom") {
    state.manualLookDraft.bottomId = itemId;
  } else if (target === "shoes") {
    state.manualLookDraft.shoesId = itemId;
  } else if (target === "accessory") {
    state.manualLookDraft.accessoryId = itemId;
  }
  renderManualLookDraftUi();
  closeManualLookPickerDialog();
}

function onManualLookPickerClick(event) {
  const itemButton = event.target.closest("button[data-pick-item-id]");
  if (!itemButton) {
    return;
  }
  const itemId = String(itemButton.dataset.pickItemId || "");
  if (!itemId) {
    return;
  }
  applyManualLookSelection(itemId);
}

function openManualLookDialog() {
  const hasTop = getManualLookItemsByTarget("top").length > 0;
  const hasBottom = getManualLookItemsByTarget("bottom").length > 0;
  if (!hasTop || !hasBottom) {
    showAppMessage("请先在衣柜中至少添加1件上装和1件下装，再手动保存穿搭。", "无法添加穿搭");
    return;
  }

  state.manualLookDraft = {
    topId: "",
    bottomId: "",
    shoesId: "",
    accessoryId: "",
  };
  if (refs.manualLookTitle) {
    refs.manualLookTitle.value = "";
  }
  renderManualLookDraftUi();
  refs.manualLookDialog?.showModal();
}

function closeManualLookDialog() {
  refs.manualLookDialog?.close();
}

function onManualLookSubmit(event) {
  event.preventDefault();
  const top = getItemById(state.manualLookDraft.topId);
  const bottom = getItemById(state.manualLookDraft.bottomId);
  const shoes = getItemById(state.manualLookDraft.shoesId) || null;
  const accessory = getItemById(state.manualLookDraft.accessoryId) || null;

  if (!top || !bottom) {
    showAppMessage("请完整选择上装和下装。", "无法保存穿搭");
    return;
  }

  const customTitle = String(refs.manualLookTitle?.value || "").trim();
  const look = normalizeFavoriteLook({
    id: `look-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: customTitle || `手动穿搭 ${state.favoriteLooks.length + 1}`,
    top: `上衣：${top.name}（${top.brand} · ${top.color} · ${top.season}）`,
    bottom: `下装：${bottom.name}（${bottom.brand} · ${bottom.color} · ${bottom.season}）`,
    shoes: shoes ? `鞋履：${shoes.name}（${shoes.brand} · ${shoes.color} · ${shoes.season}）` : "鞋履：可自由搭配",
    accessory: accessory
      ? `配饰：${accessory.name}（${accessory.brand} · ${accessory.color} · ${accessory.season}）`
      : "配饰：可自由搭配",
    topImage: top.image || "",
    bottomImage: bottom.image || "",
    createdAt: new Date().toISOString(),
  });

  state.favoriteLooks.unshift(look);
  saveFavoriteLooks();
  renderFavoriteLooks();
  closeManualLookDialog();
}

function deleteLook(lookId) {
  state.favoriteLooks = state.favoriteLooks.filter((look) => look.id !== lookId);
  saveFavoriteLooks();
  renderFavoriteLooks();
}

function renameLook(lookId) {
  const index = state.favoriteLooks.findIndex((look) => look.id === lookId);
  if (index === -1) {
    return;
  }
  const current = state.favoriteLooks[index].title;
  openAppPrompt("输入新的穿搭名称：", current, (nextTitle) => {
    if (!nextTitle) {
      return;
    }
    state.favoriteLooks[index].title = nextTitle.trim() || current;
    saveFavoriteLooks();
    renderFavoriteLooks();
  }, "重命名穿搭");
}

function togglePinLook(lookId) {
  const index = state.favoriteLooks.findIndex((look) => look.id === lookId);
  if (index === -1) {
    return;
  }
  state.favoriteLooks[index].pinned = !state.favoriteLooks[index].pinned;
  saveFavoriteLooks();
  renderFavoriteLooks();
}

function openFavoriteDeleteConfirmDialog(lookId) {
  state.pendingDeleteLookId = String(lookId || "");
  refs.favoriteDeleteConfirmDialog?.showModal();
}

function closeFavoriteDeleteConfirmDialog() {
  state.pendingDeleteLookId = "";
  refs.favoriteDeleteConfirmDialog?.close();
}

function confirmFavoriteDelete() {
  const lookId = state.pendingDeleteLookId;
  if (!lookId) {
    closeFavoriteDeleteConfirmDialog();
    return;
  }
  deleteLook(lookId);
  closeFavoriteDeleteConfirmDialog();
}

function onRecommendAction(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  if (action === "save-look") {
    const card = actionButton.closest(".recommend-card");
    const planIndex = Number(card?.dataset.planIndex);
    if (Number.isFinite(planIndex)) {
      saveLook(planIndex);
    }
    return;
  }

  if (action === "delete-look") {
    const card = actionButton.closest(".recommend-card");
    const lookId = card?.dataset.favoriteId;
    if (lookId) {
      openFavoriteDeleteConfirmDialog(lookId);
    }
    return;
  }

  if (action === "rename-look") {
    const card = actionButton.closest(".recommend-card");
    const lookId = card?.dataset.favoriteId;
    if (lookId) {
      renameLook(lookId);
    }
    return;
  }

  if (action === "pin-look") {
    const card = actionButton.closest(".recommend-card");
    const lookId = card?.dataset.favoriteId;
    if (lookId) {
      togglePinLook(lookId);
    }
  }
}

function exportJson(scope = "items") {
  const payload = buildBackupPayload(scope);
  const content = JSON.stringify(scope === "items" ? payload.items : payload, null, 2);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const filePrefix = scope === "full" ? "wardrobe-backup" : "wardrobe-items";
  link.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsvRow(values) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      return `"${text.replaceAll('"', '""')}"`;
    })
    .join(",");
}

function exportCsv() {
  const header = [
    "id",
    "name",
    "brand",
    "size",
    "price",
    "category",
    "color",
    "season",
    "image",
    "images",
    "createdAt",
  ];
  const rows = state.items.map((item) =>
    toCsvRow([
      item.id,
      item.name,
      item.brand,
      item.size,
      item.price,
      item.category,
      item.color,
      item.season,
      item.image,
      JSON.stringify(item.images || []),
      item.createdAt,
    ])
  );
  const content = [toCsvRow(header), ...rows].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wardrobe-items-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


function openImport(mode) {
  state.importMode = mode;
  refs.ioMenu.removeAttribute("open");
  if (refs.importModeDialog.open) {
    refs.importModeDialog.close();
  }
  refs.importJsonInput.accept = state.importFileType === "csv" ? ".csv,text/csv" : "application/json,.json";
  refs.importJsonInput.click();
}

function openImportModeDialog(fileType) {
  state.importFileType = fileType;
  state.importScope = fileType === "json" ? refs.importScopeSelect.value : "items";
  refs.ioMenu.removeAttribute("open");
  refs.importModeHint.textContent = `请选择 ${fileType.toUpperCase()} 导入方式：`;
  refs.importScopeField.hidden = fileType !== "json";
  if (fileType !== "json") {
    refs.importScopeSelect.value = "items";
  }
  refs.importModeDialog.showModal();
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((line) => line.some((column) => String(column).trim() !== ""));
}

function parseImportedText(rawText) {
  if (state.importFileType === "csv") {
    const rows = parseCsvRows(String(rawText || ""));
    if (rows.length <= 1) {
      return { scope: "items", items: [], favoriteLooks: [] };
    }

    const header = rows[0].map((column) => column.trim().toLowerCase());
    return {
      scope: "items",
      items: rows.slice(1).map((line) => {
        const record = {};
        for (let index = 0; index < header.length; index += 1) {
          record[header[index]] = line[index] ?? "";
        }
        return {
          id: record.id,
          name: record.name,
          brand: record.brand,
          size: record.size,
          price: record.price,
          category: record.category,
          color: record.color,
          season: record.season,
          image: record.image,
          images: (() => {
            try {
              const parsedImages = JSON.parse(record.images || "[]");
              return Array.isArray(parsedImages) ? parsedImages : [];
            } catch {
              return record.image ? [record.image] : [];
            }
          })(),
          createdAt: record.createdat,
        };
      }),
      favoriteLooks: [],
    };
  }

  const parsed = JSON.parse(String(rawText || "[]"));
  if (Array.isArray(parsed)) {
    return { scope: "items", items: parsed, favoriteLooks: [] };
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
    return {
      scope: parsed.scope === "full" ? "full" : "items",
      items: parsed.items,
      favoriteLooks: Array.isArray(parsed.favoriteLooks) ? parsed.favoriteLooks : [],
      config: parsed.config && typeof parsed.config === "object" ? parsed.config : null,
    };
  }

  throw new Error("invalid");
}

function resolveMergeConflicts(importedItems) {
  return resolveMergeConflictsAsync(importedItems);
}

function formatConflictMeta(item) {
  return `${item.name} · ${item.brand} · 尺码${item.size} · ${item.color} · ${formatPrice(item.price)} · ${item.category} · ${item.season}`;
}

function openConflictChoice(existing, incoming) {
  refs.existingConflictImage.src = existing.image || PLACEHOLDER_IMAGE;
  refs.incomingConflictImage.src = incoming.image || PLACEHOLDER_IMAGE;
  refs.existingConflictMeta.textContent = formatConflictMeta(existing);
  refs.incomingConflictMeta.textContent = formatConflictMeta(incoming);

  return new Promise((resolve) => {
    state.conflictResolver = resolve;
    refs.conflictDialog.showModal();
  });
}

function resolveConflictChoice(choice) {
  if (state.conflictResolver) {
    state.conflictResolver(choice);
    state.conflictResolver = null;
  }
  if (refs.conflictDialog.open) {
    refs.conflictDialog.close();
  }
}

async function resolveMergeConflictsAsync(importedItems) {
  const merged = [...state.items];
  let added = 0;
  let replaced = 0;
  state.conflictStrategy = "ask";

  for (const incoming of importedItems) {
    const conflictIndex = merged.findIndex((exist) => {
      const sameName = exist.name && incoming.name && exist.name === incoming.name;
      const sameImage = exist.image && incoming.image && exist.image === incoming.image;
      return sameName || sameImage;
    });

    if (conflictIndex === -1) {
      merged.unshift({
        ...incoming,
        id: `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      });
      added += 1;
      continue;
    }

    let choice = "keep-existing";
    if (state.conflictStrategy === "replace-all") {
      choice = "replace";
    } else if (state.conflictStrategy === "keep-all") {
      choice = "keep-existing";
    } else {
      choice = await openConflictChoice(merged[conflictIndex], incoming);
      if (choice === "replace-all") {
        state.conflictStrategy = "replace-all";
        choice = "replace";
      } else if (choice === "keep-all") {
        state.conflictStrategy = "keep-all";
        choice = "keep-existing";
      }
    }

    if (choice === "replace") {
      const existing = merged[conflictIndex];
      merged[conflictIndex] = {
        ...existing,
        ...incoming,
        id: existing.id,
      };
      replaced += 1;
    }
  }

  return { merged, added, replaced };
}

function onImportFileChange(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = parseImportedText(reader.result);
      const shouldApplyFullScope = state.importFileType === "json" && state.importScope === "full";
      const hasFullBackupData = parsed.scope === "full";

      const imported = parsed.items
        .map(normalizeItem)
        .filter((item) => item.name && item.brand && item.size && Number.isFinite(item.price));

      const importedFavoriteLooks = hasFullBackupData
        ? parsed.favoriteLooks.map(normalizeFavoriteLook)
        : [];

      const importedConfigBrands =
        hasFullBackupData && parsed.config && Array.isArray(parsed.config.brands)
          ? dedupeBrands(parsed.config.brands)
          : [];
      const importedConfigBrandLogos =
        hasFullBackupData && parsed.config && parsed.config.brandLogos && typeof parsed.config.brandLogos === "object"
          ? parsed.config.brandLogos
          : {};

      if (imported.length === 0) {
        showAppMessage("导入文件中没有可导入的数据。", "导入提示");
        return;
      }

      let changedCount = 0;
      let replaceCount = 0;

      if (state.importMode === "overwrite") {
        state.items = imported.map((item) => ({
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        }));
        if (shouldApplyFullScope && hasFullBackupData) {
          state.favoriteLooks = importedFavoriteLooks;
          state.brandCatalog = dedupeBrands([...MAJOR_BRAND_LIST, ...OUTDOOR_BRAND_LIST, ...importedConfigBrands]);
          state.brandLogos = {
            ...buildPresetBrandLogos(),
            ...importedConfigBrandLogos,
          };
          saveBrandCatalog();
          saveBrandLogos();
        }
        changedCount = state.items.length;
      } else {
        const result = await resolveMergeConflicts(imported);
        state.items = result.merged;
        if (shouldApplyFullScope && hasFullBackupData) {
          state.favoriteLooks = mergeFavoriteLooks(importedFavoriteLooks);
          state.brandCatalog = dedupeBrands([...state.brandCatalog, ...importedConfigBrands]);
          state.brandLogos = {
            ...state.brandLogos,
            ...importedConfigBrandLogos,
          };
          saveBrandCatalog();
          saveBrandLogos();
        }
        changedCount = result.added + result.replaced;
        replaceCount = result.replaced;
      }

      syncBrandCatalogFromItems(state.items);

      if (shouldApplyFullScope && !hasFullBackupData) {
        showAppMessage("当前文件只包含衣物数据，已按仅衣物方式导入；收藏穿搭和配置快照未变更。", "导入提示");
      }

      if (state.activeCategory !== "all") {
        const exists = state.items.some((item) => item.category === state.activeCategory);
        if (!exists) {
          setCategoryMode("all");
        }
      }

      saveItems();
      saveFavoriteLooks();
      renderBrandOptions();
      renderCategories();
      renderClothes();
      renderLockOptions();
      renderRecommendations();
      renderFavoriteLooks();
      const modeText = state.importMode === "overwrite" ? "覆盖" : "合并";
      const replaceText = state.importMode === "merge" ? `，替换 ${replaceCount} 件` : "";
      const scopeText = shouldApplyFullScope && hasFullBackupData ? "，已同步收藏穿搭与配置快照" : "";
      showAppMessage(`已${modeText}导入，实际更新 ${changedCount} 件${replaceText}${scopeText}。`, "导入完成");
    } catch {
      showAppMessage("文件解析失败，请检查 JSON/CSV 格式。", "导入失败");
    } finally {
      refs.importJsonInput.value = "";
    }
  };
  reader.readAsText(file);
}

function onFiltersChange() {
  renderClothes();
}

function clearCurrentFilters() {
  refs.filterBrand.value = "all";
  renderFilterBrandTrigger();
  refs.filterColor.value = "all";
  refs.filterSeason.value = "all";
  refs.filterPriceRange.value = "all";
  refs.searchInput.value = "";
  refs.sortOrder.value = "newest";
  renderClothes();
}

function resetFilters() {
  refs.filterForm.reset();
  refs.filterBrand.value = "all";
  renderFilterBrandTrigger();
  refs.filterColor.value = "all";
  refs.filterSeason.value = "all";
  refs.filterPriceRange.value = "all";
  refs.sortOrder.value = "newest";
  if (state.activeCategory === "all") {
    refs.filterCategory.value = "all";
  } else {
    refs.filterCategory.value = state.activeCategory;
  }
  renderClothes();
}

function onCategoryClick(event) {
  const button = event.target.closest("button[data-category]");
  if (!button) {
    return;
  }
  const category = button.dataset.category;
  if (!category) {
    return;
  }
  setCategoryMode(category);
}

function bindEvents() {
  if (refs.addForm) {
    refs.addForm.noValidate = true;
  }

  refs.openAddFromHero.addEventListener("click", openAddDialog);
  refs.openBrandLibraryBtn.addEventListener("click", openBrandLibraryDialog);
  refs.openAddFab.addEventListener("click", openAddDialog);
  refs.closeDialog.addEventListener("click", requestCloseAddDialog);
  refs.cancelAdd.addEventListener("click", requestCloseAddDialog);
  refs.addUnsavedCancelBtn?.addEventListener("click", () => {
    if (refs.addUnsavedBanner) refs.addUnsavedBanner.hidden = true;
  });
  refs.addUnsavedConfirmBtn?.addEventListener("click", forceCloseAddDialog);
  refs.tabWardrobe.addEventListener("click", () => setView("wardrobe"));
  refs.tabRecommend.addEventListener("click", () => setView("recommend"));
  refs.clearCategoryView.addEventListener("click", () => setCategoryMode("all"));
  refs.categoryGrid.addEventListener("click", onCategoryClick);

  refs.imageInput.addEventListener("change", onImageChange);
  refs.openImageEditorBtn?.addEventListener("click", openImageEditorDialog);
  refs.closeImageEditorDialog?.addEventListener("click", closeImageEditorDialog);
  refs.cancelImageEditorBtn?.addEventListener("click", closeImageEditorDialog);
  refs.applyImageEditorBtn?.addEventListener("click", applyImageEditorToPreview);
  refs.editorCropModeBtn?.addEventListener("click", toggleImageCropMode);
  refs.editorEraserModeBtn?.addEventListener("click", toggleImageEraserMode);
  refs.editorApplyCropBtn?.addEventListener("click", applyImageCrop);
  refs.editorRotateModeBtn?.addEventListener("click", toggleImageRotateMode);
  refs.editorApplyRotateBtn?.addEventListener("click", () => rotateImageEditor(90));
  refs.editorMirrorBtn?.addEventListener("click", mirrorImageHorizontal);
  refs.editorUndoBtn?.addEventListener("click", undoImageEditorAction);
  refs.editorRedoBtn?.addEventListener("click", redoImageEditorAction);
  refs.editorEraserSlider?.addEventListener("input", (e) => setImageEraserSize(e.target.value));
  refs.editorMarkSlider?.addEventListener("input", (e) => setImageMarkSize(e.target.value));
  refs.editorCutoutBtn?.addEventListener("click", enterCutoutMode);
  refs.editorRemoveBgBtn?.addEventListener("click", removeBackgroundWithAI);
  refs.editorFgMarkBtn?.addEventListener("click", () => toggleCutoutMarkMode("fg"));
  refs.editorBgMarkBtn?.addEventListener("click", () => toggleCutoutMarkMode("bg"));
  refs.editorDoCutoutBtn?.addEventListener("click", executeCutoutFromMode);
  refs.editorExitCutoutBtn?.addEventListener("click", exitCutoutMode);
  refs.editorUnsavedCancelBtn?.addEventListener("click", () => {
    if (refs.editorUnsavedBanner) refs.editorUnsavedBanner.hidden = true;
  });
  refs.editorUnsavedConfirmBtn?.addEventListener("click", forceCloseImageEditorDialog);
  refs.imageEditorCanvas?.addEventListener("mousedown", onImageEditorCanvasMouseDown);
  refs.imageEditorCanvas?.addEventListener("mousemove", onImageEditorCanvasMouseMove);
  refs.imageEditorCanvas?.addEventListener("mouseup", onImageEditorCanvasMouseUp);
  refs.imageEditorCanvas?.addEventListener("mouseleave", onImageEditorCanvasMouseLeave);
  refs.imageEditorCanvas?.addEventListener("touchstart", onImageEditorCanvasTouchStart, { passive: false });
  refs.imageEditorCanvas?.addEventListener("touchmove", onImageEditorCanvasTouchMove, { passive: false });
  refs.imageEditorCanvas?.addEventListener("touchend", onImageEditorCanvasTouchEnd);
  refs.addBrandTrigger.addEventListener("click", () => {
    toggleAddBrandMenu();
  });
  refs.addBrandMenu.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action='create-brand']");
    if (actionButton) {
      toggleAddBrandMenu(false);
      openCreateBrandDialog();
      return;
    }

    const button = event.target.closest("button[data-value]");
    if (!button) {
      return;
    }

    const brand = normalizeBrandName(button.dataset.value);
    setAddBrandValue(brand);
    toggleAddBrandMenu(false);
  });
  refs.createBrandForm.addEventListener("submit", onCreateBrandSubmit);
  refs.closeCreateBrandDialog.addEventListener("click", closeCreateBrandDialog);
  refs.cancelCreateBrand.addEventListener("click", closeCreateBrandDialog);
  refs.newBrandLogoInput.addEventListener("change", onBrandLogoChange);
  refs.clearBrandLogoBtn.addEventListener("click", clearBrandLogo);
  refs.editBrandForm.addEventListener("submit", onEditBrandSubmit);
  refs.closeEditBrandDialog.addEventListener("click", closeEditBrandDialog);
  refs.cancelEditBrand.addEventListener("click", closeEditBrandDialog);
  refs.editBrandLogoInput.addEventListener("change", onEditBrandLogoChange);
  refs.clearEditBrandLogoBtn.addEventListener("click", clearEditBrandLogo);
  refs.closeBrandLibraryDialog.addEventListener("click", closeBrandLibraryDialog);
  if (refs.toggleBrandMultiSelectBtn) {
    refs.toggleBrandMultiSelectBtn.onclick = () => {
      setBrandLibraryMultiSelectMode(!state.brandLibraryMultiSelectMode);
      renderBrandLibrary();
    };
  }
  refs.openCreateBrandFromLibrary.addEventListener("click", openCreateBrandDialog);
  refs.deleteSelectedBrandsBtn.addEventListener("click", deleteSelectedBrands);
  refs.brandLibrarySearchInput?.addEventListener("input", (event) => {
    state.brandLibrarySearchQuery = String(event.target.value || "");
    renderBrandLibrary();
  });
  refs.brandLibraryList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='delete-brand']");
    if (!button) {
      return;
    }

    const row = button.closest(".brand-library-item");
    const brand = row?.dataset.brand;
    if (!brand) {
      return;
    }

    deleteBrand(brand);
  });
  refs.brandLibraryList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-brand-check]");
    if (!checkbox) {
      return;
    }
    updateBrandLibrarySelectionState();
  });

  refs.filterBrandTrigger.addEventListener("click", () => {
    toggleFilterBrandMenu();
  });
  refs.filterBrandMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button) {
      return;
    }
    const value = String(button.dataset.value || "all");
    refs.filterBrand.value = value;
    renderFilterBrandTrigger();
    toggleFilterBrandMenu(false);
    onFiltersChange();
  });
  document.addEventListener("click", (event) => {
    if (!refs.filterBrandWrap.contains(event.target)) {
      toggleFilterBrandMenu(false);
    }
    if (!refs.addBrandWrap.contains(event.target)) {
      toggleAddBrandMenu(false);
    }
    if (
      refs.userMenuWrap && !refs.userMenuWrap.contains(event.target) &&
      refs.userMenuPanel && !refs.userMenuPanel.contains(event.target)
    ) {
      closeUserMenu();
    }
  });

  refs.addCategory.addEventListener("change", (e) => updateSizeOptions(e.target.value));
  refs.addForm.addEventListener("submit", onAddSubmit);
  refs.clothesList.addEventListener("click", onClothesAction);

  refs.filterCategory.addEventListener("change", onFiltersChange);
  refs.filterBrand.addEventListener("change", onFiltersChange);
  refs.filterColor.addEventListener("change", onFiltersChange);
  refs.filterSeason.addEventListener("change", onFiltersChange);
  refs.filterPriceRange.addEventListener("change", onFiltersChange);
  refs.sortOrder.addEventListener("change", onFiltersChange);
  refs.searchInput.addEventListener("input", onFiltersChange);
  refs.clearCurrentFilters.addEventListener("click", clearCurrentFilters);
  refs.resetFilters.addEventListener("click", resetFilters);

  refs.weatherSelect.addEventListener("change", renderRecommendations);
  refs.sceneSelect.addEventListener("change", renderRecommendations);
  refs.lockTopSelect.addEventListener("change", renderRecommendations);
  refs.lockBottomSelect.addEventListener("change", renderRecommendations);
  refs.lockAccessorySelect.addEventListener("change", renderRecommendations);
  refs.refreshRecommend.addEventListener("click", renderRecommendations);
  refs.openSyncDataBtn?.addEventListener("click", () => {
    refs.ioMenu?.removeAttribute("open");
    runSyncFlow("manual");
  });
  refs.userMenuBtn?.addEventListener("click", () => {
    toggleUserMenu();
  });
  refs.logoutUserBtn?.addEventListener("click", logoutCurrentUser);
  refs.openManualLookBtn?.addEventListener("click", openManualLookDialog);
  refs.closeManualLookDialog?.addEventListener("click", closeManualLookDialog);
  refs.cancelManualLook?.addEventListener("click", closeManualLookDialog);
  refs.pickManualTopBtn?.addEventListener("click", () => openManualLookPicker("top"));
  refs.pickManualBottomBtn?.addEventListener("click", () => openManualLookPicker("bottom"));
  refs.pickManualShoesBtn?.addEventListener("click", () => openManualLookPicker("shoes"));
  refs.pickManualAccessoryBtn?.addEventListener("click", () => openManualLookPicker("accessory"));
  refs.closeManualLookPickerDialog?.addEventListener("click", closeManualLookPickerDialog);
  refs.manualLookPickerList?.addEventListener("click", onManualLookPickerClick);
  refs.clearManualLookPickerBtn?.addEventListener("click", () => {
    applyManualLookSelection("");
  });
  refs.manualLookForm?.addEventListener("submit", onManualLookSubmit);
  refs.recommendList.addEventListener("click", onRecommendAction);
  refs.favoriteList.addEventListener("click", onRecommendAction);

  refs.exportBtn.addEventListener("click", () => {
    refs.ioMenu.removeAttribute("open");
    refs.exportScopeDialog.showModal();
  });
  refs.importJsonBtn.addEventListener("click", () => openImportModeDialog("json"));
  refs.importCsvBtn.addEventListener("click", () => openImportModeDialog("csv"));
  refs.closeImportModeDialog.addEventListener("click", () => refs.importModeDialog.close());
  refs.closeExportScopeDialog.addEventListener("click", () => refs.exportScopeDialog.close());
  refs.importScopeSelect.addEventListener("change", (event) => {
    state.importScope = event.target.value;
  });
  refs.chooseImportMerge.addEventListener("click", () => openImport("merge"));
  refs.chooseImportOverwrite.addEventListener("click", () => openImport("overwrite"));
  refs.chooseExportFull.addEventListener("click", () => {
    refs.exportScopeDialog.close();
    exportJson("full");
  });
  refs.chooseExportItems.addEventListener("click", () => {
    refs.exportScopeDialog.close();
    exportJson("items");
  });
  refs.chooseExportCsv.addEventListener("click", () => {
    refs.exportScopeDialog.close();
    exportCsv();
  });
  refs.keepExistingBtn.addEventListener("click", () => resolveConflictChoice("keep-existing"));
  refs.keepIncomingBtn.addEventListener("click", () => resolveConflictChoice("replace"));
  refs.keepAllConflictsBtn.addEventListener("click", () => resolveConflictChoice("keep-all"));
  refs.replaceAllConflictsBtn.addEventListener("click", () => resolveConflictChoice("replace-all"));
  refs.closeConflictDialog.addEventListener("click", () => resolveConflictChoice("keep-existing"));
  refs.closeFavoriteDeleteConfirmDialog?.addEventListener("click", closeFavoriteDeleteConfirmDialog);
  refs.cancelFavoriteDeleteBtn?.addEventListener("click", closeFavoriteDeleteConfirmDialog);
  refs.confirmFavoriteDeleteBtn?.addEventListener("click", confirmFavoriteDelete);
  refs.closeAppMessageDialog?.addEventListener("click", closeAppMessageDialog);
  refs.confirmAppMessageBtn?.addEventListener("click", closeAppMessageDialog);
  refs.closeAppConfirmDialog?.addEventListener("click", closeAppConfirmDialog);
  refs.cancelAppConfirmBtn?.addEventListener("click", closeAppConfirmDialog);
  refs.confirmAppConfirmBtn?.addEventListener("click", confirmAppConfirmDialog);
  refs.closeSyncDecisionDialog?.addEventListener("click", closeSyncDecisionDialog);
  refs.cancelSyncDecisionBtn?.addEventListener("click", closeSyncDecisionDialog);
  refs.chooseLocalSyncBtn?.addEventListener("click", chooseLocalSyncDecision);
  refs.chooseRemoteSyncBtn?.addEventListener("click", chooseRemoteSyncDecision);
  refs.closeAppPromptDialog?.addEventListener("click", closeAppPromptDialog);
  refs.cancelAppPromptBtn?.addEventListener("click", closeAppPromptDialog);
  refs.confirmAppPromptBtn?.addEventListener("click", confirmAppPromptDialog);
  refs.conflictDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    resolveConflictChoice("keep-existing");
  });
  refs.favoriteDeleteConfirmDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeFavoriteDeleteConfirmDialog();
  });
  refs.appMessageDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAppMessageDialog();
  });
  refs.appConfirmDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAppConfirmDialog();
  });
  refs.syncDecisionDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSyncDecisionDialog();
  });
  refs.appPromptDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAppPromptDialog();
  });
  refs.importJsonInput.addEventListener("change", onImportFileChange);
  refs.refreshWeatherBtn.addEventListener("click", loadCurrentWeather);
  refs.imageGallery.addEventListener("click", (event) => {
    // 处理设为封面
    const coverBtn = event.target.closest("button[data-cover-index]");
    if (coverBtn) {
      state.coverImageIndex = Number(coverBtn.dataset.coverIndex || 0);
      renderImageGallery();
      return;
    }
    // 处理删除图片
    const deleteBtn = event.target.closest("button[data-delete-index]");
    if (deleteBtn) {
      const index = Number(deleteBtn.dataset.deleteIndex);
      state.imageDataList.splice(index, 1);
      // 调整 coverImageIndex 以防超出范围
      if (state.coverImageIndex >= state.imageDataList.length && state.imageDataList.length > 0) {
        state.coverImageIndex = state.imageDataList.length - 1;
      }
      renderImageGallery();
      return;
    }
  });

  // 点击任意位置关闭导出/导入菜单
  document.addEventListener("click", (event) => {
    if (refs.ioMenu.open && !refs.ioMenu.contains(event.target)) {
      refs.ioMenu.removeAttribute("open");
    }
  });

  refs.addDialog.addEventListener("close", () => {
    resetAddForm();
  });
}

// ============== AI 抠图功能 ==============

/**
 * 调用本地 MediaPipe 分割去除图片背景
 * @param {string} imageData - base64 编码的图片数据或 data URL
 * @returns {Promise<string|null>} 返回处理后的 PNG data URL，失败返回 null
 */
async function removeImageBackground(imageData) {
  try {
    if (!REMBG_CONFIG.isEnabled()) {
      showAppMessage('背景去除功能不可用');
      return null;
    }

    showAppMessage('正在处理图片，请稍候...', false, 0); // 显示无进度条的加载提示

    // 创建临时图片对象
    const img = new Image();
    img.src = imageData;
    
    // 等待图片加载
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // 使用 MediaPipe 去除背景
    const outputCanvas = await removeBackgroundWithMediaPipe(img);
    const resultDataUrl = canvasToDataUrl(outputCanvas);
    
    return resultDataUrl;
  } catch (error) {
    console.error('[Background Removal] Error:', error);
    showAppMessage(`背景去除失败: ${error.message}`);
    return null;
  }
}

async function init() {
  bindEvents();
  await ensureActiveUserReady();
  reloadStateForActiveUser();
  initOptions();
  syncBrandCatalogFromItems(state.items);
  purgeBlockedBrands();
  renderBrandOptions();
  renderAddBrandTrigger();
  updateUserMenuUi();
  renderCategories();
  renderClothes();
  renderLockOptions();
  renderRecommendations();
  renderFavoriteLooks();
  loadCurrentWeather();
}

// ============ GitHub 同步函数 ============

let gitHubSyncTimer = null;
let gitHubSyncPending = false;
let lastRemoteRevision = 0;

/**
 * 简单哈希函数（用于比对，不要求密码学强度）
 */
function simpleHash(str) {
  let hash = 0;
  const s = typeof str === 'string' ? str : JSON.stringify(str);
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 计算单个衣物的稳定哈希
 */
function calculateItemHash(item) {
  if (!item) return '';
  const stable = {
    name: item.name,
    brand: item.brand,
    size: item.size,
    price: item.price,
    category: item.category,
    season: item.season,
    color: item.color,
    image: item.image,
  };
  return simpleHash(JSON.stringify(stable));
}

/**
 * 计算单个收藏穿搭的哈希
 */
function calculateLookHash(look) {
  if (!look) return '';
  const stable = {
    title: look.title,
    top: look.top,
    bottom: look.bottom,
    shoes: look.shoes,
    accessory: look.accessory,
  };
  return simpleHash(JSON.stringify(stable));
}

/**
 * 计算品牌库的哈希
 */
function calculateBrandsHash(brands) {
  const sorted = Array.isArray(brands) ? [...brands].sort() : [];
  return simpleHash(JSON.stringify(sorted));
}

/**
 * 计算品牌Logo集合的哈希
 */
function calculateBrandLogosHash(logos) {
  const sorted = {};
  const keys = Object.keys(logos || {}).sort();
  keys.forEach((key) => {
    sorted[key] = logos[key];
  });
  return simpleHash(JSON.stringify(sorted));
}

/**
 * 构建轻量索引（用于低带宽对比）
 */
function buildLightweightIndex(snapshot) {
  const index = {
    revision: 0,
    items: (snapshot.items || []).map((item) => ({
      id: String(item.id || ''),
      hash: calculateItemHash(item),
    })),
    itemsHash: simpleHash(
      JSON.stringify((snapshot.items || []).map((item) => ({ id: item.id, hash: calculateItemHash(item) })))
    ),
    looks: (snapshot.favoriteLooks || []).map((look) => ({
      id: String(look.id || ''),
      hash: calculateLookHash(look),
    })),
    looksHash: simpleHash(
      JSON.stringify((snapshot.favoriteLooks || []).map((look) => ({ id: look.id, hash: calculateLookHash(look) })))
    ),
    brandsHash: calculateBrandsHash(snapshot.config.brands),
    brandLogosHash: calculateBrandLogosHash(snapshot.config.brandLogos),
  };
  return index;
}

/**
 * 对比两个轻量索引
 */
function diffLightweightIndices(localIndex, remoteIndex) {
  const localItemsMap = new Map((localIndex.items || []).map((item) => [item.id, item]));
  const remoteItemsMap = new Map((remoteIndex.items || []).map((item) => [item.id, item]));

  const looksMap = new Map((localIndex.looks || []).map((look) => [look.id, look]));
  const remoteLooksMap = new Map((remoteIndex.looks || []).map((look) => [look.id, look]));

  const localOnlyItemIds = [];
  const remoteOnlyItemIds = [];
  const changedItemIds = [];

  localItemsMap.forEach((item, id) => {
    if (!remoteItemsMap.has(id)) {
      localOnlyItemIds.push(id);
    } else {
      const remoteItem = remoteItemsMap.get(id);
      if (item.hash !== remoteItem.hash) {
        changedItemIds.push(id);
      }
    }
  });

  remoteItemsMap.forEach((item, id) => {
    if (!localItemsMap.has(id)) {
      remoteOnlyItemIds.push(id);
    }
  });

  const localOnlyLookIds = [];
  const remoteOnlyLookIds = [];
  const changedLookIds = [];

  looksMap.forEach((look, id) => {
    if (!remoteLooksMap.has(id)) {
      localOnlyLookIds.push(id);
    } else {
      const remoteLook = remoteLooksMap.get(id);
      if (look.hash !== remoteLook.hash) {
        changedLookIds.push(id);
      }
    }
  });

  remoteLooksMap.forEach((look, id) => {
    if (!looksMap.has(id)) {
      remoteOnlyLookIds.push(id);
    }
  });

  const hasDiff =
    localIndex.itemsHash !== remoteIndex.itemsHash ||
    localIndex.looksHash !== remoteIndex.looksHash ||
    localIndex.brandsHash !== remoteIndex.brandsHash ||
    localIndex.brandLogosHash !== remoteIndex.brandLogosHash;

  return {
    hasDiff,
    items: {
      localOnlyIds: localOnlyItemIds,
      remoteOnlyIds: remoteOnlyItemIds,
      changedIds: changedItemIds,
    },
    looks: {
      localOnlyIds: localOnlyLookIds,
      remoteOnlyIds: remoteOnlyLookIds,
      changedIds: changedLookIds,
    },
    remoteRevision: remoteIndex.revision || 0,
  };
}

/**
 * 防抖触发 GitHub 同步（避免频繁上传）
 */
function scheduleGitHubSync() {
  if (!GITHUB_SYNC_CONFIG.isEnabled()) {
    return;
  }
  
  if (gitHubSyncTimer) {
    clearTimeout(gitHubSyncTimer);
  }
  
  gitHubSyncPending = true;
  gitHubSyncTimer = setTimeout(() => {
    pushLocalDiffToGitHub().catch(err => {
      console.error('[GitHub Sync] Upload failed:', err.message);
    });
    gitHubSyncTimer = null;
    gitHubSyncPending = false;
  }, 5000); // 5秒防抖
}

function normalizeBackupSnapshot(rawBackup) {
  const raw = rawBackup && typeof rawBackup === "object" ? rawBackup : {};
  const items = Array.isArray(raw.items) ? raw.items.map((item) => normalizeItem(item)) : [];
  const favoriteLooks = Array.isArray(raw.favoriteLooks)
    ? raw.favoriteLooks.map((look) => normalizeFavoriteLook(look))
    : [];
  const config = raw.config && typeof raw.config === "object" ? raw.config : {};
  const brandsFromConfig = Array.isArray(config.brands)
    ? config.brands.map((brand) => normalizeBrandName(brand)).filter(Boolean)
    : [];
  const brandsFromItems = items.map((item) => normalizeBrandName(item.brand)).filter(Boolean);
  const brands = dedupeBrands([...brandsFromConfig, ...brandsFromItems]).filter((brand) => !isBlockedBrand(brand));
  const rawBrandLogos = config.brandLogos && typeof config.brandLogos === "object" ? config.brandLogos : {};
  const brandLogos = {};
  Object.keys(rawBrandLogos).forEach((key) => {
    const normalizedKey = normalizeBrandKey(key);
    if (!normalizedKey || normalizedKey === normalizeBrandKey("A")) {
      return;
    }
    brandLogos[normalizedKey] = String(rawBrandLogos[key] || "");
  });

  return {
    items,
    favoriteLooks,
    config: {
      brands,
      brandLogos,
    },
  };
}

function buildLocalSnapshot() {
  return normalizeBackupSnapshot(buildBackupPayload("full"));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (!value || typeof value !== "object") {
    return JSON.stringify(value);
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function diffListById(localList, remoteList) {
  const localMap = new Map();
  const remoteMap = new Map();

  (localList || []).forEach((entry) => {
    if (entry?.id) {
      localMap.set(String(entry.id), entry);
    }
  });
  (remoteList || []).forEach((entry) => {
    if (entry?.id) {
      remoteMap.set(String(entry.id), entry);
    }
  });

  const localOnlyIds = [];
  const remoteOnlyIds = [];
  const changedIds = [];

  localMap.forEach((localEntry, id) => {
    if (!remoteMap.has(id)) {
      localOnlyIds.push(id);
      return;
    }
    const remoteEntry = remoteMap.get(id);
    if (stableStringify(localEntry) !== stableStringify(remoteEntry)) {
      changedIds.push(id);
    }
  });

  remoteMap.forEach((_, id) => {
    if (!localMap.has(id)) {
      remoteOnlyIds.push(id);
    }
  });

  return {
    localOnlyIds,
    remoteOnlyIds,
    changedIds,
  };
}

function diffBrands(localBrands, remoteBrands) {
  const localMap = new Map();
  const remoteMap = new Map();

  (localBrands || []).forEach((brand) => {
    const key = normalizeBrandKey(brand);
    if (key) {
      localMap.set(key, String(brand));
    }
  });
  (remoteBrands || []).forEach((brand) => {
    const key = normalizeBrandKey(brand);
    if (key) {
      remoteMap.set(key, String(brand));
    }
  });

  const localOnlyValues = [];
  const remoteOnlyValues = [];

  localMap.forEach((value, key) => {
    if (!remoteMap.has(key)) {
      localOnlyValues.push(value);
    }
  });
  remoteMap.forEach((value, key) => {
    if (!localMap.has(key)) {
      remoteOnlyValues.push(value);
    }
  });

  return {
    localOnlyValues,
    remoteOnlyValues,
  };
}

function diffBrandLogos(localLogos, remoteLogos) {
  const localKeys = new Set(Object.keys(localLogos || {}));
  const remoteKeys = new Set(Object.keys(remoteLogos || {}));
  const localOnlyKeys = [];
  const remoteOnlyKeys = [];
  const changedKeys = [];

  localKeys.forEach((key) => {
    if (!remoteKeys.has(key)) {
      localOnlyKeys.push(key);
      return;
    }
    if (String(localLogos[key] || "") !== String(remoteLogos[key] || "")) {
      changedKeys.push(key);
    }
  });

  remoteKeys.forEach((key) => {
    if (!localKeys.has(key)) {
      remoteOnlyKeys.push(key);
    }
  });

  return {
    localOnlyKeys,
    remoteOnlyKeys,
    changedKeys,
  };
}

function buildSyncDiff(localSnapshot, remoteSnapshot) {
  const items = diffListById(localSnapshot.items, remoteSnapshot.items);
  const favoriteLooks = diffListById(localSnapshot.favoriteLooks, remoteSnapshot.favoriteLooks);
  const brands = diffBrands(localSnapshot.config.brands, remoteSnapshot.config.brands);
  const brandLogos = diffBrandLogos(localSnapshot.config.brandLogos, remoteSnapshot.config.brandLogos);

  const hasDiff =
    items.localOnlyIds.length > 0 ||
    items.remoteOnlyIds.length > 0 ||
    items.changedIds.length > 0 ||
    favoriteLooks.localOnlyIds.length > 0 ||
    favoriteLooks.remoteOnlyIds.length > 0 ||
    favoriteLooks.changedIds.length > 0 ||
    brands.localOnlyValues.length > 0 ||
    brands.remoteOnlyValues.length > 0 ||
    brandLogos.localOnlyKeys.length > 0 ||
    brandLogos.remoteOnlyKeys.length > 0 ||
    brandLogos.changedKeys.length > 0;

  return {
    hasDiff,
    items,
    favoriteLooks,
    brands,
    brandLogos,
  };
}

function buildSyncDiffSummary(diff) {
  return [
    "检测到本地与云端存在差异：",
    `- 衣物：本地新增 ${diff.items.localOnlyIds.length}，云端新增 ${diff.items.remoteOnlyIds.length}，内容差异 ${diff.items.changedIds.length}`,
    `- 收藏穿搭：本地新增 ${diff.favoriteLooks.localOnlyIds.length}，云端新增 ${diff.favoriteLooks.remoteOnlyIds.length}，内容差异 ${diff.favoriteLooks.changedIds.length}`,
    `- 品牌库：本地新增 ${diff.brands.localOnlyValues.length}，云端新增 ${diff.brands.remoteOnlyValues.length}`,
    `- 品牌Logo：本地新增 ${diff.brandLogos.localOnlyKeys.length}，云端新增 ${diff.brandLogos.remoteOnlyKeys.length}，内容差异 ${diff.brandLogos.changedKeys.length}`,
    "",
    "请选择同步方向：",
    "- 使用本地并上传：以本地为准，把差异补丁上传到云端",
    "- 使用云端并下载：以云端为准，覆盖本地数据",
  ].join("\n");
}

function buildPatchFromDiff(localSnapshot, diff) {
  const itemUpsertIds = new Set([...diff.items.localOnlyIds, ...diff.items.changedIds]);
  const lookUpsertIds = new Set([...diff.favoriteLooks.localOnlyIds, ...diff.favoriteLooks.changedIds]);
  const logoUpsertKeys = new Set([...diff.brandLogos.localOnlyKeys, ...diff.brandLogos.changedKeys]);

  const itemUpsert = localSnapshot.items.filter((item) => itemUpsertIds.has(String(item.id)));
  const favoriteLooksUpsert = localSnapshot.favoriteLooks.filter((look) => lookUpsertIds.has(String(look.id)));
  const brandLogoUpsert = {};
  logoUpsertKeys.forEach((key) => {
    brandLogoUpsert[key] = localSnapshot.config.brandLogos[key];
  });

  return {
    items: {
      upsert: itemUpsert,
      deleteIds: [...diff.items.remoteOnlyIds],
    },
    favoriteLooks: {
      upsert: favoriteLooksUpsert,
      deleteIds: [...diff.favoriteLooks.remoteOnlyIds],
    },
    config: {
      brands: {
        upsert: [...diff.brands.localOnlyValues],
        deleteValues: [...diff.brands.remoteOnlyValues],
      },
      brandLogos: {
        upsert: brandLogoUpsert,
        deleteKeys: [...diff.brandLogos.remoteOnlyKeys],
      },
    },
  };
}

function isPatchEmpty(patch) {
  return (
    (!patch.items.upsert.length && !patch.items.deleteIds.length) &&
    (!patch.favoriteLooks.upsert.length && !patch.favoriteLooks.deleteIds.length) &&
    (!patch.config.brands.upsert.length && !patch.config.brands.deleteValues.length) &&
    (!Object.keys(patch.config.brandLogos.upsert).length && !patch.config.brandLogos.deleteKeys.length)
  );
}

function summarizePatchResult(patch) {
  return [
    `衣物：上传 ${patch.items.upsert.length}，删除 ${patch.items.deleteIds.length}`,
    `收藏穿搭：上传 ${patch.favoriteLooks.upsert.length}，删除 ${patch.favoriteLooks.deleteIds.length}`,
    `品牌库：新增 ${patch.config.brands.upsert.length}，删除 ${patch.config.brands.deleteValues.length}`,
    `品牌Logo：更新 ${Object.keys(patch.config.brandLogos.upsert).length}，删除 ${patch.config.brandLogos.deleteKeys.length}`,
  ].join("\n");
}

async function postSyncAction(action, data) {
  if (!GITHUB_SYNC_CONFIG.isEnabled()) {
    throw new Error("GitHub Sync 未启用");
  }

  // 在 Pages 环境中，使用本地代理路由；否则使用 Worker URL
  const syncUrl = typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')
    ? '/api/sync'
    : GITHUB_SYNC_CONFIG.getWorkerUrl();
  
  try {
    const response = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    if (!response.ok) {
      throw new Error(`同步失败（${response.status}）`);
    }
    return response.json();
  } catch (err) {
    // Worker 无法访问时的错误提示
    if (err.message.includes("Load Failed") || err.message.includes("NetworkError")) {
      console.error("[GitHub Sync] Worker unreachable:", err.message);
      throw new Error("云端连接失败：您的网络可能无法访问 Worker。请检查网络连接或尝试切换 Wi-Fi/4G。");
    }
    throw err;
  }
}

async function fetchRemoteIndex() {
  const remoteIndexData = await postSyncAction("pull-index");
  return remoteIndexData && typeof remoteIndexData === 'object' ? remoteIndexData : {};
}

async function fetchRemoteSnapshot() {
  const snapshotData = await postSyncAction("pull");
  return normalizeBackupSnapshot(snapshotData);
}

function applyRemoteSnapshotToLocal(remoteSnapshot) {
  state.items = remoteSnapshot.items.map((item) => normalizeItem(item));
  state.favoriteLooks = remoteSnapshot.favoriteLooks.map((look) => normalizeFavoriteLook(look));
  state.brandCatalog = dedupeBrands([...MAJOR_BRAND_LIST, ...OUTDOOR_BRAND_LIST, ...remoteSnapshot.config.brands]);
  state.brandLogos = {
    ...buildPresetBrandLogos(),
    ...remoteSnapshot.config.brandLogos,
  };

  saveItems({ skipSync: true });
  saveFavoriteLooks({ skipSync: true });
  saveBrandCatalog({ skipSync: true });
  saveBrandLogos({ skipSync: true });

  renderBrandOptions();
  renderAddBrandTrigger();
  renderAddBrandMenu();
  renderCategories();
  renderClothes();
  renderLockOptions();
  renderRecommendations();
  renderFavoriteLooks();
}

/**
 * 基于轻量索引差异构建摘要文案
 */
function buildIndexDiffSummary(diff, localSnapshot, remoteSnapshot) {
  const localData = localSnapshot || {};
  const remoteData = remoteSnapshot || {};
  
  const localItems = localData.items || [];
  const localLooks = localData.favoriteLooks || [];
  const remoteItems = remoteData.items || [];
  const remoteLooks = remoteData.favoriteLooks || [];
  
  // 建立 ID 到名称的映射
  const localItemMap = new Map(localItems.map(item => [String(item.id), item.name || '未命名衣物']));
  const localLookMap = new Map(localLooks.map(look => [String(look.id), look.title || '未命名搭配']));
  const remoteItemMap = new Map(remoteItems.map(item => [String(item.id), item.name || '未命名衣物']));
  const remoteLookMap = new Map(remoteLooks.map(look => [String(look.id), look.title || '未命名搭配']));
  
  // 构建详细的差异信息
  const lines = ["📊 检测到本地与云端存在差异：", ""];
  
  // 衣物差异
  const itemDiffLines = [];
  if (diff.items.localOnlyIds.length > 0) {
    itemDiffLines.push(`  ✨ 本地新增 ${diff.items.localOnlyIds.length} 项衣物：`);
    diff.items.localOnlyIds.forEach(id => {
      const name = localItemMap.get(String(id)) || '未知';
      itemDiffLines.push(`     • ${name}`);
    });
  }
  
  if (diff.items.remoteOnlyIds.length > 0) {
    itemDiffLines.push(`  ☁️  云端新增 ${diff.items.remoteOnlyIds.length} 项衣物：`);
    diff.items.remoteOnlyIds.forEach(id => {
      const name = remoteItemMap.get(String(id)) || '未知';
      itemDiffLines.push(`     • ${name}`);
    });
  }
  
  if (diff.items.changedIds.length > 0) {
    itemDiffLines.push(`  🔄 ${diff.items.changedIds.length} 项衣物内容已修改：`);
    diff.items.changedIds.forEach(id => {
      const localName = localItemMap.get(String(id)) || '未知';
      itemDiffLines.push(`     • ${localName}`);
    });
  }
  
  if (itemDiffLines.length > 0) {
    lines.push("📦 衣物变化：");
    lines.push(...itemDiffLines);
    lines.push("");
  }
  
  // 搭配差异
  const lookDiffLines = [];
  if (diff.looks.localOnlyIds.length > 0) {
    lookDiffLines.push(`  ✨ 本地新增 ${diff.looks.localOnlyIds.length} 个搭配：`);
    diff.looks.localOnlyIds.forEach(id => {
      const name = localLookMap.get(String(id)) || '未知';
      lookDiffLines.push(`     • ${name}`);
    });
  }
  
  if (diff.looks.remoteOnlyIds.length > 0) {
    lookDiffLines.push(`  ☁️  云端新增 ${diff.looks.remoteOnlyIds.length} 个搭配：`);
    diff.looks.remoteOnlyIds.forEach(id => {
      const name = remoteLookMap.get(String(id)) || '未知';
      lookDiffLines.push(`     • ${name}`);
    });
  }
  
  if (diff.looks.changedIds.length > 0) {
    lookDiffLines.push(`  🔄 ${diff.looks.changedIds.length} 个搭配已修改：`);
    diff.looks.changedIds.forEach(id => {
      const name = localLookMap.get(String(id)) || '未知';
      lookDiffLines.push(`     • ${name}`);
    });
  }
  
  if (lookDiffLines.length > 0) {
    lines.push("👗 搭配变化：");
    lines.push(...lookDiffLines);
    lines.push("");
  }
  
  // 总结和操作提示
  lines.push("👇 请选择同步方向：");
  lines.push("▸ 【使用本地】- 上传本地变化到云端");
  lines.push("▸ 【使用云端】- 下载云端数据覆盖本地");
  
  return lines.join("\n");
}

function openSyncDecisionDialogWithIndex(remoteIndex, localSnapshot, diff, source, remoteSnapshot) {
  pendingSyncDecisionContext = {
    remoteIndex,
    localSnapshot,
    diff,
    source,
    isIndexBased: true,
  };
  if (refs.syncDiffSummaryText) {
    refs.syncDiffSummaryText.textContent = buildIndexDiffSummary(diff, localSnapshot, remoteSnapshot);
  }
  refs.syncDecisionDialog?.showModal();
}

function openSyncDecisionDialog(remoteSnapshot, localSnapshot, diff, source) {
  pendingSyncDecisionContext = {
    remoteSnapshot,
    localSnapshot,
    diff,
    source,
  };
  if (refs.syncDiffSummaryText) {
    refs.syncDiffSummaryText.textContent = buildSyncDiffSummary(diff);
  }
  refs.syncDecisionDialog?.showModal();
}

function closeSyncDecisionDialog() {
  pendingSyncDecisionContext = null;
  refs.syncDecisionDialog?.close();
}

async function chooseLocalSyncDecision() {
  const context = pendingSyncDecisionContext;
  closeSyncDecisionDialog();
  if (!context) {
    return;
  }

  try {
    let patch;
    if (context.isIndexBased) {
      const remoteSnapshot = await fetchRemoteSnapshot();
      patch = buildPatchFromDiff(context.localSnapshot, buildSyncDiff(context.localSnapshot, remoteSnapshot));
      patch.baselineRevision = lastRemoteRevision;
    } else {
      patch = buildPatchFromDiff(context.localSnapshot, context.diff);
    }

    if (isPatchEmpty(patch)) {
      if (context.source === "manual") {
        showAppMessage("本地与云端没有需要上传的差异。", "同步提示");
      }
      return;
    }

    await postSyncAction("push-diff", patch);
    showAppMessage(`已按本地数据同步到云端。\n${summarizePatchResult(patch)}`, "同步完成");
  } catch (err) {
    console.error("[GitHub Sync] Local->Remote sync failed:", err.message);
    showAppMessage(`同步失败：${err.message}`, "同步失败");
  }
}

async function chooseRemoteSyncDecision() {
  const context = pendingSyncDecisionContext;
  closeSyncDecisionDialog();
  if (!context) {
    return;
  }

  try {
    if (context.isIndexBased) {
      const remoteSnapshot = await fetchRemoteSnapshot();
      applyRemoteSnapshotToLocal(remoteSnapshot);
    } else {
      applyRemoteSnapshotToLocal(context.remoteSnapshot);
    }
    showAppMessage("已使用云端数据覆盖本地。", "同步完成");
  } catch (err) {
    console.error("[GitHub Sync] Remote->Local apply failed:", err.message);
    showAppMessage(`应用云端数据失败：${err.message}`, "同步失败");
  }
}

async function pushLocalDiffToGitHub() {
  if (!GITHUB_SYNC_CONFIG.isEnabled()) {
    return;
  }

  try {
    const localSnapshot = buildLocalSnapshot();
    const localIndex = buildLightweightIndex(localSnapshot);
    const remoteIndex = await fetchRemoteIndex();
    const diff = diffLightweightIndices(localIndex, remoteIndex);
    
    if (!diff.hasDiff) {
      console.log("[GitHub Sync] No diff detected via index, skip upload");
      return;
    }

    // 计算新增/修改/删除的项
    const changedItemIds = new Set(diff.items.localOnlyIds.concat(diff.items.changedIds));
    const deletedItemIds = diff.items.remoteOnlyIds; // 云端有但本地没有 = 被删除
    
    const changedLookIds = new Set(diff.looks.localOnlyIds.concat(diff.looks.changedIds));
    const deletedLookIds = diff.looks.remoteOnlyIds;

    const patch = {
      items: {
        upsert: localSnapshot.items.filter(item => changedItemIds.has(String(item.id))),
        deleteIds: deletedItemIds,
      },
      favoriteLooks: {
        upsert: localSnapshot.favoriteLooks.filter(look => changedLookIds.has(String(look.id))),
        deleteIds: deletedLookIds,
      },
      config: localSnapshot.config,
      baselineRevision: lastRemoteRevision || remoteIndex.revision,
    };

    if (patch.items.upsert.length === 0 && patch.favoriteLooks.upsert.length === 0 && 
        patch.items.deleteIds.length === 0 && patch.favoriteLooks.deleteIds.length === 0) {
      console.log("[GitHub Sync] No actual changes to upload");
      return;
    }

    try {
      await postSyncAction("push-diff", patch);
      console.log("[GitHub Sync] Diff patch upload succeeded");
      lastRemoteRevision = (remoteIndex.revision || 0) + 1;
    } catch (err) {
      // 如果是冲突错误，尝试完整同步
      if (err.message && err.message.includes("Conflict")) {
        console.log("[GitHub Sync] Conflict detected, retrying with full sync");
        const remoteSnapshot = await fetchRemoteSnapshot();
        const fullDiff = buildSyncDiff(localSnapshot, remoteSnapshot);
        const fullPatch = buildPatchFromDiff(localSnapshot, fullDiff);
        fullPatch.baselineRevision = (remoteIndex.revision || 0);
        await postSyncAction("push-diff", fullPatch);
        console.log("[GitHub Sync] Full sync after conflict succeeded");
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error("[GitHub Sync] Diff patch upload failed:", err.message);
  }
}

async function runSyncFlow(source = "manual", options = {}) {
  if (!GITHUB_SYNC_CONFIG.isEnabled()) {
    if (source === "manual") {
      showAppMessage("请先配置 GitHub 同步 Worker 地址。", "同步未启用");
    }
    return;
  }

  try {
    const localSnapshot = buildLocalSnapshot();
    const localIndex = buildLightweightIndex(localSnapshot);
    const remoteIndex = await fetchRemoteIndex();
    const diff = diffLightweightIndices(localIndex, remoteIndex);

    if (!diff.hasDiff) {
      if (!options.silentWhenNoDiff) {
        showAppMessage("本地与云端数据一致，无需同步。", "同步提示");
      }
      return;
    }

    lastRemoteRevision = diff.remoteRevision;
    // 获取完整的远程数据以显示详细的差异信息
    const remoteSnapshot = await fetchRemoteSnapshot();
    openSyncDecisionDialogWithIndex(remoteIndex, localSnapshot, diff, source, remoteSnapshot);
  } catch (err) {
    console.error("[GitHub Sync] Sync flow failed:", err.message);
    if (source === "manual") {
      showAppMessage(`检查同步差异失败：${err.message}`, "同步失败");
    }
  }
}

init();
