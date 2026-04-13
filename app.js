import { PredictorDataStore, predictRun } from './predictor-browser.js';

const state = {
  graph: null,
  lastPredictData: null,
  dataStore: null,
  itemMetadataByName: new Map(),
  itemMetadataByDisplayName: new Map(),
  modifierMetadataByName: new Map(),
  imageCache: new Map(),
  shopRerollCacheBySignature: new Map(),
  shopRerollByNodeId: new Map(),
  hitboxes: [],
  panX: 0,
  panY: 0,
  zoom: 1,
  hoverNodeId: null,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  viewReady: false,
  isGenerating: false,
  autoGenerateQueued: false,
  initializing: true,
  pendingDrawFrame: null,
  selectedPathNodeIds: [],
  pathEncounterCounters: {
    total: 0,
    normal: 0,
    challenge: 0,
    byGuid: {},
  },
};

const LABEL_ZOOM_THRESHOLD = 10;
const ICON_SIZE = 40;
const ICON_GAP = 4;
const INITIAL_ZOOM_SCALE = 9;
const NODE_BASE_RADIUS = 20;
const NODE_TEXT_OFFSET_X = 25;
const TOUCH_TAP_SLOP_PX = 10;
const TOUCH_TAP_MAX_MS = 320;
const TOUCH_MIN_HITBOX_SIZE = 36;
const AUTO_REGENERATE_DELAY_MS = 120;
const OPTIONAL_FETCH_TIMEOUT_MS = 5000;
const REQUIRED_FETCH_TIMEOUT_MS = 12000;

const NODE_TYPE_ICON_PATHS = {
  Encounter: './data/images/mapicon_Encounter 1.png',
  Challenge: './data/images/mapicon_EtheralSpikes.png',
  Boss: './data/images/mapicon_FinalBoss.png',
  RestStop: './data/images/mapicon_Rest 1.png',
  Shop: './data/images/mapicon_Shop 1.png',
};

const NODE_TYPE_ICON_SCALES = {
  Encounter: 0.6,
  Challenge: 1.45,
  Boss: 0.8,
  RestStop: 0.6,
  Shop: 0.6,
};

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const tooltipEl = document.getElementById('tooltip');

const statusEl = document.getElementById('status');
const shardEl = document.getElementById('shard');
const ascensionEl = document.getElementById('ascension');
const ascensionRowEl = document.getElementById('ascensionRow');
const runConfigNameEl = document.getElementById('runConfigName');
const nodeCountEl = document.getElementById('nodeCount');

const seedEl = document.getElementById('seed');
const timeAttackEl = document.getElementById('timeAttack');
const obstacleDifficultyEl = document.getElementById('obstacleDifficulty');
const modifierDifficultyEl = document.getElementById('modifierDifficulty');
const itemRarityDifficultyEl = document.getElementById('itemRarityDifficulty');
const playerItemRarityBonusEl = document.getElementById('playerItemRarityBonus');
const challengeCompletionTierEl = document.getElementById('challengeCompletionTier');
const extraLevelDifficultyEl = document.getElementById('extraLevelDifficulty');
const captainInHubEl = document.getElementById('captainInHub');
const heirInHubEl = document.getElementById('heirInHub');
const wraithInHubEl = document.getElementById('wraithInHub');
const played25MainWraith03El = document.getElementById('played25MainWraith03');
const heirNeverSeenPermanentEl = document.getElementById('heirNeverSeenPermanent');
const ignoreCharacterEncounterFactChecksEl = document.getElementById('ignoreCharacterEncounterFactChecks');
const varType0HealthEl = document.getElementById('varType0Health');
const varType2LivesEl = document.getElementById('varType2Lives');
const varType3ResourceEl = document.getElementById('varType3Resource');
const varType12HealthPctEl = document.getElementById('varType12HealthPct');
const varType13MissingHealthPctEl = document.getElementById('varType13MissingHealthPct');
const varType14MissingLivesEl = document.getElementById('varType14MissingLives');
const ownedItemChecklistEl = document.getElementById('ownedItemChecklist');
const pasteQrBtnEl = document.getElementById('pasteQrBtn');
const generateBtnEl = document.getElementById('generateBtn');
const qrModalEl = document.getElementById('qrModal');
const qrModalBackdropEl = document.getElementById('qrModalBackdrop');
const qrJsonInputEl = document.getElementById('qrJsonInput');
const qrModalCancelBtnEl = document.getElementById('qrModalCancelBtn');
const qrModalApplyBtnEl = document.getElementById('qrModalApplyBtn');
const sidebarEl = document.getElementById('sidebar');
const sidebarToggleEl = document.getElementById('sidebarToggle');
const sidebarBackdropEl = document.getElementById('sidebarBackdrop');

const SITE_SETTINGS_KEY = 'haste-level-generator-settings-v1';
let autoGenerateTimerId = null;

function getPersistedSettingElements() {
  return [
    seedEl,
    shardEl,
    timeAttackEl,
    ascensionEl,
    obstacleDifficultyEl,
    modifierDifficultyEl,
    itemRarityDifficultyEl,
    playerItemRarityBonusEl,
    challengeCompletionTierEl,
    extraLevelDifficultyEl,
    captainInHubEl,
    heirInHubEl,
    wraithInHubEl,
    played25MainWraith03El,
    heirNeverSeenPermanentEl,
    ignoreCharacterEncounterFactChecksEl,
    varType0HealthEl,
    varType2LivesEl,
    varType3ResourceEl,
    varType12HealthPctEl,
    varType13MissingHealthPctEl,
    varType14MissingLivesEl,
  ];
}

function getSiteSettingsFromInputs() {
  return {
    seed: seedEl.value,
    shard: shardEl.value,
    timeAttack: Boolean(timeAttackEl.checked),
    ascension: ascensionEl.value,
    obstacleDifficulty: obstacleDifficultyEl.value,
    modifierDifficulty: modifierDifficultyEl.value,
    itemRarityDifficulty: itemRarityDifficultyEl.value,
    playerItemRarityBonus: playerItemRarityBonusEl.value,
    challengeCompletionTier: challengeCompletionTierEl.value,
    extraLevelDifficulty: extraLevelDifficultyEl.value,
    captainInHub: Boolean(captainInHubEl.checked),
    heirInHub: Boolean(heirInHubEl.checked),
    wraithInHub: Boolean(wraithInHubEl.checked),
    played25MainWraith03: Boolean(played25MainWraith03El.checked),
    heirNeverSeenPermanent: Boolean(heirNeverSeenPermanentEl.checked),
    ignoreCharacterEncounterFactChecks: Boolean(ignoreCharacterEncounterFactChecksEl.checked),
    varType0Health: varType0HealthEl.value,
    varType2Lives: varType2LivesEl.value,
    varType3Resource: varType3ResourceEl.value,
    varType12HealthPct: varType12HealthPctEl.value,
    varType13MissingHealthPct: varType13MissingHealthPctEl.value,
    varType14MissingLives: varType14MissingLivesEl.value,
    ownedItemPathIds: getOwnedItemPathIdsFromChecklist(),
  };
}

function saveSiteSettings() {
  try {
    localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(getSiteSettingsFromInputs()));
  } catch (_) {
    // Ignore storage failures (private mode / quota / blocked storage).
  }
}

function loadSiteSettings() {
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function setSelectIfOptionExists(selectEl, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  if (![...selectEl.options].some((opt) => opt.value === String(value))) {
    return;
  }
  selectEl.value = String(value);
}

function applySiteSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return;
  }

  if (settings.seed !== undefined) {
    seedEl.value = String(settings.seed);
  }
  setSelectIfOptionExists(shardEl, settings.shard);
  if (settings.timeAttack !== undefined) {
    timeAttackEl.checked = Boolean(settings.timeAttack);
  }
  setSelectIfOptionExists(ascensionEl, settings.ascension);
  if (settings.obstacleDifficulty !== undefined) {
    obstacleDifficultyEl.value = String(settings.obstacleDifficulty);
  }
  if (settings.modifierDifficulty !== undefined) {
    modifierDifficultyEl.value = String(settings.modifierDifficulty);
  }
  if (settings.itemRarityDifficulty !== undefined) {
    itemRarityDifficultyEl.value = String(settings.itemRarityDifficulty);
  }
  if (settings.playerItemRarityBonus !== undefined) {
    playerItemRarityBonusEl.value = String(settings.playerItemRarityBonus);
  }
  setSelectIfOptionExists(challengeCompletionTierEl, settings.challengeCompletionTier);
  if (settings.extraLevelDifficulty !== undefined) {
    extraLevelDifficultyEl.value = String(settings.extraLevelDifficulty);
  }
  if (settings.captainInHub !== undefined) {
    captainInHubEl.checked = Boolean(settings.captainInHub);
  }
  if (settings.heirInHub !== undefined) {
    heirInHubEl.checked = Boolean(settings.heirInHub);
  }
  if (settings.wraithInHub !== undefined) {
    wraithInHubEl.checked = Boolean(settings.wraithInHub);
  }
  if (settings.played25MainWraith03 !== undefined) {
    played25MainWraith03El.checked = Boolean(settings.played25MainWraith03);
  }
  if (settings.heirNeverSeenPermanent !== undefined) {
    heirNeverSeenPermanentEl.checked = Boolean(settings.heirNeverSeenPermanent);
  }
  if (settings.ignoreCharacterEncounterFactChecks !== undefined) {
    ignoreCharacterEncounterFactChecksEl.checked = Boolean(settings.ignoreCharacterEncounterFactChecks);
  }
  if (settings.varType0Health !== undefined) {
    varType0HealthEl.value = String(settings.varType0Health);
  }
  if (settings.varType2Lives !== undefined) {
    varType2LivesEl.value = String(settings.varType2Lives);
  }
  if (settings.varType3Resource !== undefined) {
    varType3ResourceEl.value = String(settings.varType3Resource);
  }
  if (settings.varType12HealthPct !== undefined) {
    varType12HealthPctEl.value = String(settings.varType12HealthPct);
  }
  if (settings.varType13MissingHealthPct !== undefined) {
    varType13MissingHealthPctEl.value = String(settings.varType13MissingHealthPct);
  }
  if (settings.varType14MissingLives !== undefined) {
    varType14MissingLivesEl.value = String(settings.varType14MissingLives);
  }
  if (settings.ownedItemPathIds !== undefined) {
    setOwnedItemChecklistSelection(parseOwnedItemPathIds(settings.ownedItemPathIds));
  }
}

function parseOwnedItemPathIds(rawText) {
  const text = String(rawText || '').trim();
  if (!text) {
    return [];
  }

  const out = [];
  const seen = new Set();
  for (const token of text.split(/[^0-9]+/g)) {
    const value = Number(token);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    const pathId = Math.floor(value);
    if (seen.has(pathId)) {
      continue;
    }

    seen.add(pathId);
    out.push(pathId);
  }

  return out;
}

function getOwnedItemPathIdsFromChecklist() {
  if (!ownedItemChecklistEl) {
    return [];
  }

  const out = [];
  const seen = new Set();
  const inputs = ownedItemChecklistEl.querySelectorAll('input[type="checkbox"][data-path-id]');
  for (const input of inputs) {
    if (!input.checked) {
      continue;
    }

    const pathId = Number(input.dataset.pathId);
    if (!Number.isFinite(pathId) || pathId <= 0 || seen.has(pathId)) {
      continue;
    }

    seen.add(pathId);
    out.push(pathId);
  }

  return out;
}

function setOwnedItemChecklistSelection(pathIds) {
  if (!ownedItemChecklistEl) {
    return;
  }

  const selected = new Set((pathIds || []).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0));
  const inputs = ownedItemChecklistEl.querySelectorAll('input[type="checkbox"][data-path-id]');
  for (const input of inputs) {
    const pathId = Number(input.dataset.pathId);
    input.checked = selected.has(pathId);
  }
}

function collectEncounterRequirementItemChecks(encounterRequirementRules) {
  const byPathId = new Map();
  for (const ruleEntry of Array.isArray(encounterRequirementRules) ? encounterRequirementRules : []) {
    const components = ruleEntry?.rule?.Components || [];
    for (const component of components) {
      const gameplayRequirements = component?.GameplayRequirements || [];
      for (const requirement of gameplayRequirements) {
        const className = String(requirement?.ClassName || '').trim();
        if (className !== 'EncReq_ItemCheck') {
          continue;
        }

        const pathId = Number(requirement?.Data?.item?.m_PathID ?? 0);
        if (!Number.isFinite(pathId) || pathId <= 0) {
          continue;
        }

        const checkType = Number(requirement?.Data?.checkType);
        const existing = byPathId.get(pathId) || { pathId, checkTypes: new Set() };
        if (Number.isFinite(checkType)) {
          existing.checkTypes.add(checkType);
        }
        byPathId.set(pathId, existing);
      }
    }
  }

  return [...byPathId.values()];
}

function buildItemNameByPathId(itemInstances) {
  const out = new Map();
  for (const item of Array.isArray(itemInstances) ? itemInstances : []) {
    const pathId = Number(item?.pathId);
    const itemName = String(item?.itemDisplayName || item?.itemName || '').trim();
    if (!Number.isFinite(pathId) || pathId <= 0 || !itemName) {
      continue;
    }
    out.set(pathId, itemName);
  }
  return out;
}

function renderOwnedItemChecklist(bundle) {
  if (!ownedItemChecklistEl) {
    return;
  }

  const requirements = collectEncounterRequirementItemChecks(bundle?.encounterRequirementRules || []);
  const itemNameByPathId = buildItemNameByPathId(bundle?.itemInstances || []);
  const previousSelection = new Set(getOwnedItemPathIdsFromChecklist());

  const checklistItems = requirements.map((entry) => {
    const pathId = Number(entry.pathId);
    const itemName = itemNameByPathId.get(pathId) || '';
    const metadata = itemName ? resolveItemMetadata(itemName) : null;
    const displayName = metadata?.displayName || itemName || `Unknown item ${pathId}`;

    return {
      pathId,
      displayName,
    };
  });

  checklistItems.sort((a, b) => {
    const nameCmp = a.displayName.localeCompare(b.displayName);
    if (nameCmp !== 0) {
      return nameCmp;
    }
    return a.pathId - b.pathId;
  });

  if (checklistItems.length === 0) {
    ownedItemChecklistEl.innerHTML = '<div class="item-check-hint">No item checks found in encounter rules.</div>';
    return;
  }

  const rows = checklistItems.map((item) => {
    const checked = previousSelection.has(item.pathId) ? ' checked' : '';
    return `\n      <label class="item-check-row">\n        <input type="checkbox" data-path-id="${item.pathId}"${checked} />\n        <span>${item.displayName}</span>\n      </label>\n    `;
  }).join('');

  ownedItemChecklistEl.innerHTML = rows;

  const inputs = ownedItemChecklistEl.querySelectorAll('input[type="checkbox"][data-path-id]');
  for (const input of inputs) {
    input.addEventListener('change', () => {
      saveSiteSettings();
      scheduleAutoGenerateFromSettings();
    });
  }
}

function bindSiteSettingsPersistence() {
  for (const input of getPersistedSettingElements()) {
    input.addEventListener('change', saveSiteSettings);
    input.addEventListener('input', saveSiteSettings);
  }
}

function scheduleAutoGenerateFromSettings(options = {}) {
  const { resetPath = true } = options;

  if (!state.dataStore || state.initializing) {
    return;
  }

  if (state.isGenerating) {
    state.autoGenerateQueued = true;
    return;
  }

  if (autoGenerateTimerId !== null) {
    window.clearTimeout(autoGenerateTimerId);
  }

  autoGenerateTimerId = window.setTimeout(() => {
    autoGenerateTimerId = null;
    resetShopRerolls();
    if (resetPath) {
      clearSelectedPath();
    }
    generate().catch((error) => {
      setStatus(error.message);
    });
  }, AUTO_REGENERATE_DELAY_MS);
}

function bindAutoGenerateFromSettings() {
  for (const input of getPersistedSettingElements()) {
    input.addEventListener('change', scheduleAutoGenerateFromSettings);
  }
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle('sidebar-open', Boolean(isOpen));
  if (sidebarToggleEl) {
    sidebarToggleEl.setAttribute('aria-expanded', String(Boolean(isOpen)));
    sidebarToggleEl.textContent = isOpen ? 'Close' : 'Settings';
  }
  if (sidebarBackdropEl) {
    sidebarBackdropEl.hidden = !isOpen;
  }
}

function bindMobileSidebar() {
  if (!sidebarEl || !sidebarToggleEl || !sidebarBackdropEl) {
    return;
  }

  sidebarToggleEl.addEventListener('click', () => {
    const currentlyOpen = document.body.classList.contains('sidebar-open');
    setSidebarOpen(!currentlyOpen);
  });

  sidebarBackdropEl.addEventListener('click', () => {
    setSidebarOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!isMobileViewport()) {
      setSidebarOpen(false);
      return;
    }
    setSidebarOpen(document.body.classList.contains('sidebar-open'));
  });

  setSidebarOpen(false);
}

function closeQrModal() {
  if (!qrModalEl) {
    return;
  }
  qrModalEl.hidden = true;
}

function openQrModal() {
  if (!qrModalEl || !qrJsonInputEl) {
    return;
  }
  qrJsonInputEl.value = '';
  qrModalEl.hidden = false;
  qrJsonInputEl.focus();
}

function applyQrJsonText(rawText) {
  let parsed = null;
  try {
    parsed = JSON.parse(String(rawText || '').trim());
  } catch (_) {
    setStatus('Invalid JSON. Paste a QR payload with seed and shard.');
    return;
  }

  const seed = Number(parsed?.seed);
  const hasShardId = parsed?.shardID !== undefined && parsed?.shardID !== null;
  const shard = hasShardId
    ? Number(parsed.shardID) + 1
    : Number(parsed?.shard);
  if (!Number.isFinite(seed) || !Number.isFinite(shard)) {
    setStatus('QR JSON must include numeric fields: seed and shardID.');
    return;
  }

  seedEl.value = String(Math.floor(seed));
  setSelectIfOptionExists(shardEl, String(Math.floor(shard)));
  refreshAscensionVisibility();
  resetShopRerolls();
  clearSelectedPath();
  saveSiteSettings();
  closeQrModal();

  generate().catch((error) => {
    setStatus(error.message);
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function normalizeKey(text) {
  return String(text || '').trim().toLowerCase();
}

function canonicalizeItemLookupKey(text) {
  let value = String(text || '').trim();
  value = value.replace(/^\s*frag\+\d+\s+/i, '');
  value = value.replace(/^\s*(?:r|rarity)\s*\d+\s*[:|\-]\s*/i, '');
  value = value.replace(/\s*\((?:r|rarity)\s*\d+\)\s*$/i, '');
  value = value.replace(/\s*\((?:common|uncommon|rare|epic|legendary)\)\s*$/i, '');
  return normalizeKey(value);
}

function resolveItemMetadata(rawName) {
  const key = normalizeKey(rawName);
  const canonical = canonicalizeItemLookupKey(rawName);

  return state.itemMetadataByName.get(key)
    || state.itemMetadataByName.get(canonical)
    || state.itemMetadataByDisplayName.get(key)
    || state.itemMetadataByDisplayName.get(canonical)
    || null;
}

function resolveItemEffectSummary(rawName) {
  const key = normalizeKey(rawName);
  const canonical = canonicalizeItemLookupKey(rawName);
  const map = state.dataStore?.itemEffectSummaryByName;
  if (!map || typeof map.get !== 'function') {
    return '';
  }

  return String(
    map.get(key)
    || map.get(canonical)
    || ''
  ).trim();
}

function parseItemNameAndRarity(value) {
  const text = String(value || '').trim();
  const m = text.match(/^(.*)\s+\(([^)]+)\)\s*$/);
  if (!m) {
    return { itemName: text, rarity: '' };
  }
  const rarity = String(m[2] || '').trim();
  if (!/^(common|rare|epic|legendary)$/i.test(rarity)) {
    return { itemName: text, rarity: '' };
  }
  return {
    itemName: String(m[1] || '').trim(),
    rarity,
  };
}

function getPredictionSignature(params) {
  return JSON.stringify(params);
}

function getShopRerollIndexForNode(nodeId) {
  if (nodeId === null || nodeId === undefined) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(state.shopRerollByNodeId.get(Number(nodeId)) || 0)));
}

function setShopRerollIndexForNode(nodeId, index) {
  if (nodeId === null || nodeId === undefined) {
    return;
  }
  const safe = Math.max(0, Math.floor(Number(index) || 0));
  state.shopRerollByNodeId.set(Number(nodeId), safe);
}

function resetShopRerolls() {
  state.shopRerollByNodeId.clear();
  state.shopRerollCacheBySignature.clear();
}

function resetPathEncounterCounters() {
  state.pathEncounterCounters = {
    total: 0,
    normal: 0,
    challenge: 0,
    byGuid: {},
  };
}

function clearSelectedPath() {
  state.selectedPathNodeIds = [];
  resetPathEncounterCounters();
}

function getNodeByIdMap(graph) {
  return new Map((graph?.nodes || []).map((n) => [Number(n.id), n]));
}

function buildIncomingByNodeId(graph) {
  const incomingById = new Map();
  for (const n of graph?.nodes || []) {
    incomingById.set(Number(n.id), []);
  }

  for (const n of graph?.nodes || []) {
    const fromId = Number(n.id);
    for (const toIdRaw of n.next || []) {
      const toId = Number(toIdRaw);
      if (!incomingById.has(toId)) {
        incomingById.set(toId, []);
      }
      incomingById.get(toId).push(fromId);
    }
  }

  for (const [nodeId, incoming] of incomingById.entries()) {
    incomingById.set(nodeId, incoming.slice().sort((a, b) => a - b));
  }

  return incomingById;
}

function getPathAnchorNodeId() {
  if (state.selectedPathNodeIds.length === 0) {
    return 0;
  }
  return Number(state.selectedPathNodeIds[state.selectedPathNodeIds.length - 1]);
}

function getAccessibleNodeIdSet(graph, startNodeId) {
  const visited = new Set();
  const stack = [Number(startNodeId)];
  const nodeById = getNodeByIdMap(graph);

  while (stack.length > 0) {
    const nodeId = Number(stack.pop());
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const node = nodeById.get(nodeId);
    if (!node) {
      continue;
    }

    for (const nextIdRaw of node.next || []) {
      const nextId = Number(nextIdRaw);
      if (!visited.has(nextId)) {
        stack.push(nextId);
      }
    }
  }

  return visited;
}

function buildPathSegmentBySteppingBack(graph, anchorNodeId, targetNodeId) {
  const anchorId = Number(anchorNodeId);
  const targetId = Number(targetNodeId);
  const nodeById = getNodeByIdMap(graph);

  if (!nodeById.has(anchorId) || !nodeById.has(targetId)) {
    return null;
  }

  if (anchorId === targetId) {
    return [];
  }

  const incomingByNodeId = buildIncomingByNodeId(graph);
  const canReachAnchorMemo = new Map();

  function canReachAnchorViaIncoming(nodeId) {
    const id = Number(nodeId);
    if (id === anchorId) {
      return true;
    }
    if (canReachAnchorMemo.has(id)) {
      return canReachAnchorMemo.get(id);
    }

    canReachAnchorMemo.set(id, false);
    const incoming = incomingByNodeId.get(id) || [];
    for (const parentId of incoming) {
      if (canReachAnchorViaIncoming(parentId)) {
        canReachAnchorMemo.set(id, true);
        return true;
      }
    }

    return false;
  }

  const reversed = [targetId];
  let current = targetId;
  let guard = 0;
  const maxSteps = (graph?.nodes?.length || 0) + 2;

  while (current !== anchorId && guard < maxSteps) {
    guard += 1;
    const incoming = incomingByNodeId.get(current) || [];
    let chosenParentId = null;

    for (const parentId of incoming) {
      if (parentId === anchorId || canReachAnchorViaIncoming(parentId)) {
        chosenParentId = parentId;
        break;
      }
    }

    if (chosenParentId === null) {
      return null;
    }

    reversed.push(chosenParentId);
    current = chosenParentId;
  }

  if (current !== anchorId) {
    return null;
  }

  const forward = reversed.reverse();
  return forward.slice(1);
}

function updatePathEncounterCountersFromGraph() {
  resetPathEncounterCounters();

  if (!state.graph || state.selectedPathNodeIds.length === 0) {
    return;
  }

  const nodeById = getNodeByIdMap(state.graph);
  const counters = {
    total: 0,
    normal: 0,
    challenge: 0,
    byGuid: {},
  };

  for (const nodeIdRaw of state.selectedPathNodeIds) {
    const node = nodeById.get(Number(nodeIdRaw));
    if (!node || String(node.type) !== 'Encounter') {
      continue;
    }

    counters.total += 1;
    if (String(node.predictedEncounterType) === 'ChallengeEncounter') {
      counters.challenge += 1;
    } else {
      counters.normal += 1;
    }

    const guid = String(node.predictedEncounterGuid || '').trim();
    if (guid) {
      counters.byGuid[guid] = (counters.byGuid[guid] || 0) + 1;
    }
  }

  state.pathEncounterCounters = counters;
}

function applyPathSelectionToNode(targetNodeId) {
  if (!state.graph) {
    return false;
  }

  const targetId = Number(targetNodeId);
  if (!Number.isFinite(targetId)) {
    return false;
  }

  const existingPath = [...state.selectedPathNodeIds];

  for (let anchorIndex = existingPath.length - 1; anchorIndex >= -1; anchorIndex -= 1) {
    const anchorId = anchorIndex >= 0 ? Number(existingPath[anchorIndex]) : 0;
    const segment = buildPathSegmentBySteppingBack(state.graph, anchorId, targetId);
    if (!segment) {
      continue;
    }

    const nextPath = existingPath.slice(0, anchorIndex + 1);
    for (const nodeId of segment) {
      if (nextPath[nextPath.length - 1] !== nodeId) {
        nextPath.push(nodeId);
      }
    }

    const didChange = nextPath.length !== state.selectedPathNodeIds.length
      || nextPath.some((id, index) => Number(state.selectedPathNodeIds[index]) !== Number(id));
    if (!didChange) {
      return false;
    }

    state.selectedPathNodeIds = nextPath;
    updatePathEncounterCountersFromGraph();

    generate({
      preserveView: true,
      preserveHover: true,
      encounterHistoryNodeIdsOverride: nextPath,
      lockedEncounterNodeIds: existingPath,
    }).catch((error) => {
      setStatus(error.message);
    });
    return true;
  }

  return false;
}

function scheduleDraw() {
  if (state.pendingDrawFrame !== null) {
    return;
  }

  state.pendingDrawFrame = window.requestAnimationFrame(() => {
    state.pendingDrawFrame = null;
    draw();
  });
}

function getFirstSelectOptionValue(selectEl) {
  if (!selectEl || !selectEl.options || selectEl.options.length === 0) {
    return '';
  }
  return String(selectEl.options[0].value);
}

function normalizeGenerationInputs(options = {}) {
  const { applyToUi = false } = options;

  let shardValue = String(shardEl.value ?? '').trim();
  const shardOptionValues = [...shardEl.options].map((opt) => String(opt.value));
  if (!shardOptionValues.includes(shardValue)) {
    shardValue = shardOptionValues.includes('1') ? '1' : getFirstSelectOptionValue(shardEl);
  }

  let ascensionValue = String(ascensionEl.value ?? '').trim();
  const ascensionOptionValues = [...ascensionEl.options].map((opt) => String(opt.value));
  if (!ascensionOptionValues.includes(ascensionValue)) {
    ascensionValue = ascensionOptionValues.includes('0') ? '0' : getFirstSelectOptionValue(ascensionEl);
  }

  let seedNumber = Number(seedEl.value);
  if (!Number.isFinite(seedNumber)) {
    seedNumber = 0;
  }
  seedNumber = Math.trunc(seedNumber);
  seedNumber = clamp(seedNumber, -2147483648, 2147483647);

  if (applyToUi) {
    if (shardEl.value !== shardValue) {
      shardEl.value = shardValue;
    }
    if (ascensionEl.value !== ascensionValue) {
      ascensionEl.value = ascensionValue;
    }

    const normalizedSeed = String(seedNumber);
    if (seedEl.value !== normalizedSeed) {
      seedEl.value = normalizedSeed;
    }
  }

  const shardNumber = Number(shardValue);
  const ascensionNumber = Number(ascensionValue);

  return {
    shard: Number.isFinite(shardNumber) ? shardNumber : 1,
    ascension: Number.isFinite(ascensionNumber) ? ascensionNumber : 0,
    seed: seedNumber,
  };
}

function copyEncounterPredictionFields(targetNode, sourceNode) {
  if (!targetNode || !sourceNode) {
    return;
  }

  targetNode.predictedEncounterType = String(sourceNode.predictedEncounterType || '');
  targetNode.predictedEncounterName = String(sourceNode.predictedEncounterName || '');
  targetNode.predictedEncounterGuid = String(sourceNode.predictedEncounterGuid || '');
  targetNode.predictedEncounterItems = Array.isArray(sourceNode.predictedEncounterItems)
    ? [...sourceNode.predictedEncounterItems]
    : [];
  targetNode.predictedEncounterItemsSummary = String(sourceNode.predictedEncounterItemsSummary || '');
  targetNode.predictedEncounterEffectSummary = String(sourceNode.predictedEncounterEffectSummary || '');
}

function stabilizeLockedEncounterPredictions(previousGraph, nextGraph, lockedEncounterNodeIds) {
  if (!previousGraph || !nextGraph || !Array.isArray(lockedEncounterNodeIds) || lockedEncounterNodeIds.length === 0) {
    return;
  }

  const previousNodeById = new Map((previousGraph.nodes || []).map((n) => [Number(n.id), n]));
  const nextNodeById = new Map((nextGraph.nodes || []).map((n) => [Number(n.id), n]));

  for (const nodeIdRaw of lockedEncounterNodeIds) {
    const nodeId = Number(nodeIdRaw);
    const prevNode = previousNodeById.get(nodeId);
    const nextNode = nextNodeById.get(nodeId);
    if (!prevNode || !nextNode) {
      continue;
    }
    if (String(prevNode.type) !== 'Encounter' || String(nextNode.type) !== 'Encounter') {
      continue;
    }

    copyEncounterPredictionFields(nextNode, prevNode);
  }
}

function preloadIcon(iconPath) {
  if (!iconPath || state.imageCache.has(iconPath)) {
    return;
  }
  const img = new Image();
  img.onload = () => scheduleDraw();
  img.src = iconPath;
  state.imageCache.set(iconPath, img);
}

function parseModifierNames(summary) {
  if (!summary) {
    return [];
  }
  return String(summary)
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
}

function getInitials(label) {
  const parts = String(label || '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function drawIconToken(x, y, meta, fallbackLabel, tooltipText, keepHoverNodeId = null) {
  const iconPath = meta?.iconPath || null;
  if (iconPath && !state.imageCache.has(iconPath)) {
    preloadIcon(iconPath);
  }
  const img = iconPath ? state.imageCache.get(iconPath) : null;

  if (img && img.complete) {
    ctx.drawImage(img, x, y, ICON_SIZE, ICON_SIZE);
  } else {
    ctx.fillStyle = '#d9e2e8';
    ctx.strokeStyle = '#8b98a3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, ICON_SIZE, ICON_SIZE, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#24343f';
    ctx.font = "8px 'IBM Plex Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(fallbackLabel), x + ICON_SIZE / 2, y + ICON_SIZE / 2 + 0.5);
  }

  state.hitboxes.push({
    x,
    y,
    w: ICON_SIZE,
    h: ICON_SIZE,
    tooltip: tooltipText,
    keepHoverNodeId,
  });
}

function drawIconRow({ label, items, metaKind, originX, originY, color, keepHoverNodeId = null }) {
  if (!Array.isArray(items) || items.length === 0) {
    return originY;
  }

  let iconX = originX + 0;
  for (const name of items) {
    const key = normalizeKey(name);
    const parsed = metaKind === 'item' ? parseItemNameAndRarity(name) : { itemName: name, rarity: '' };
    const meta = metaKind === 'modifier'
      ? state.modifierMetadataByName.get(key)
      : resolveItemMetadata(parsed.itemName);

    const itemDisplayName = meta?.displayName || parsed.itemName;
    const displayName = metaKind === 'item' && parsed.rarity
      ? `${itemDisplayName} (${parsed.rarity})`
      : itemDisplayName;
    const description = meta?.description || '';
    const itemEffect = metaKind === 'item' ? resolveItemEffectSummary(parsed.itemName) : '';
    const tooltip = metaKind === 'modifier'
      ? (description || displayName)
      : (() => {
        const lines = [displayName];
        if (description) {
          lines.push(description);
        }
        if (itemEffect) {
          lines.push(`Effect: ${itemEffect}`);
        }
        return lines.join('\n');
      })();

    drawIconToken(iconX, originY, meta, displayName, tooltip, keepHoverNodeId);
    iconX += ICON_SIZE + ICON_GAP;
  }

  return originY + ICON_SIZE + 2;
}

function drawShopRerollRow(nodeId, originX, originY, keepHoverNodeId = null) {
  const rerollIndex = getShopRerollIndexForNode(nodeId);
  const labelY = originY + 11;
  const btnSize = 14;
  const leftX = originX + 48;
  const indexX = leftX + btnSize + 12;
  const rightX = indexX + 22;

  ctx.fillStyle = '#e7edf4';
  ctx.font = "11px 'IBM Plex Mono', monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('reroll', originX, labelY);

  for (const button of [
    { x: leftX, text: '<', delta: -1, disabled: rerollIndex <= 0 },
    { x: rightX, text: '>', delta: 1, disabled: false },
  ]) {
    ctx.fillStyle = button.disabled ? '#2f3946' : '#1b2530';
    ctx.strokeStyle = button.disabled ? '#4c5562' : '#6f8497';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(button.x, originY, btnSize, btnSize, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = button.disabled ? '#6f7c89' : '#dbe7f3';
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x + btnSize / 2, originY + btnSize / 2 + 0.5);

    const hitSize = Math.max(btnSize, TOUCH_MIN_HITBOX_SIZE);
    const hitPad = (hitSize - btnSize) / 2;

    state.hitboxes.push({
      x: button.x - hitPad,
      y: originY - hitPad,
      w: hitSize,
      h: hitSize,
      tooltip: '',
      keepHoverNodeId,
      action: button.disabled ? null : { type: 'shop-reroll', nodeId, delta: button.delta },
    });
  }

  ctx.fillStyle = '#e7edf4';
  ctx.font = "11px 'IBM Plex Mono', monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(rerollIndex), indexX, labelY);

  return originY + btnSize + 2;
}

function getHoverHitboxAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  for (let i = state.hitboxes.length - 1; i >= 0; i -= 1) {
    const hitbox = state.hitboxes[i];
    if (x >= hitbox.x && x <= hitbox.x + hitbox.w && y >= hitbox.y && y <= hitbox.y + hitbox.h) {
      return hitbox;
    }
  }
  return null;
}

function getNodeRadius(nodeType) {
  return nodeType === 'Boss' ? NODE_BASE_RADIUS * 2 : NODE_BASE_RADIUS;
}

function getNodeIconPath(nodeType) {
  return NODE_TYPE_ICON_PATHS[nodeType] || null;
}

function getNodeIconScale(nodeType) {
  const scale = Number(NODE_TYPE_ICON_SCALES[nodeType]);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function drawNodeMarker(node, p, isHovered, visualStyle = {}) {
  const radius = getNodeRadius(node.type);
  const iconPath = getNodeIconPath(node.type);
  const iconImg = iconPath ? state.imageCache.get(iconPath) : null;
  const hasIcon = iconImg && iconImg.complete;
  const strokeColor = visualStyle.strokeColor || '#ffffff';
  const fillColor = visualStyle.fillColor || 'rgba(0, 0, 0, 0)';

  ctx.beginPath();
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = isHovered ? 2.5 : 1.5;
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (hasIcon) {
    const size = radius * 2 * getNodeIconScale(node.type);
    ctx.drawImage(iconImg, p.x - size / 2, p.y - size / 2, size, size);
  }
}

function estimatePanelHeight(node) {
  let h = 30;
  if (node.variantChoice && node.variantChoice !== 'Mushroom' && node.variantChoice !== 'Wetland') {
    h += 12;
  }
  const mods = parseModifierNames(node.fragmentModifiersSummary);
  if (mods.length > 0) {
    h += ICON_SIZE + 2;
  }
  if (node.predictedEncounterName) {
    h += 12;
  }
  const shopItems = buildShopDisplayItems(node);
  if (shopItems.length > 0) {
    h += ICON_SIZE + 2;
  }
  if (node.type === 'Shop') {
    h += 16;
  }
  const completionItems = buildCompletionDisplayItems(node);
  if (completionItems.length > 0) {
    h += ICON_SIZE + 2;
  }
  return h + 8;
}

function estimatePanelWidth(node) {
  const groups = [
    parseModifierNames(node.fragmentModifiersSummary).length,
    buildShopDisplayItems(node).length,
    buildCompletionDisplayItems(node).length,
  ];
  const maxIcons = Math.max(1, ...groups);
  return 150; //Math.max(100, Math.min(640, 36 + maxIcons * (ICON_SIZE + ICON_GAP)));
}

function drawNodeDetails(node, p, textOffsetX, options = {}) {
  const {
    showPanelChrome = true,
    keepPanelHover = true,
  } = options;

  const panelX = p.x + textOffsetX - 8;
  const panelY = p.y - 16;
  const panelW = estimatePanelWidth(node);
  const panelH = estimatePanelHeight(node);

  if (showPanelChrome) {
    ctx.fillStyle = 'rgba(12, 18, 28, 0.9)';
    ctx.strokeStyle = 'rgba(131, 153, 176, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();
  }

  if (keepPanelHover) {
    state.hitboxes.push({
      x: panelX,
      y: panelY,
      w: panelW,
      h: panelH,
      tooltip: '',
      keepHoverNodeId: Number(node.id),
    });
  }

  const displayType = node.type === 'Default' && node.baseBiomeName ? node.baseBiomeName : node.type;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e7edf4';
  ctx.font = "12px 'IBM Plex Mono', monospace";
  ctx.fillText(`#${node.id} ${displayType}`, p.x + textOffsetX, p.y - 3);

  let detailY = p.y + 12;
  const showVariant = node.variantChoice && node.variantChoice !== 'Mushroom' && node.variantChoice !== 'Wetland';
  if (showVariant) {
    ctx.fillStyle = '#8ce4c3';
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillText(`variant ${node.variantChoice}`, p.x + textOffsetX, detailY);
    detailY += 12;
  }

  const modifierNames = parseModifierNames(node.fragmentModifiersSummary);
  detailY = drawIconRow({
    label: 'mods',
    items: modifierNames,
    metaKind: 'modifier',
    originX: p.x + textOffsetX,
    originY: detailY,
    color: '#7a3e00',
    keepHoverNodeId: Number(node.id),
  });

  if (node.predictedEncounterName) {
    ctx.fillStyle = '#e7edf4';
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillText(node.predictedEncounterName, p.x + textOffsetX, detailY);
    detailY += 12;
  }

  const shopDisplayItems = buildShopDisplayItems(node);
  detailY = drawIconRow({
    label: 'shop',
    items: shopDisplayItems,
    metaKind: 'item',
    originX: p.x + textOffsetX,
    originY: detailY,
    color: '#0e5d78',
    keepHoverNodeId: Number(node.id),
  });

  if (node.type === 'Shop') {
    detailY = drawShopRerollRow(Number(node.id), p.x + textOffsetX, detailY, Number(node.id));
  }

  const completionDisplayItems = buildCompletionDisplayItems(node);
  drawIconRow({
    label: 'items',
    items: completionDisplayItems,
    metaKind: 'item',
    originX: p.x + textOffsetX,
    originY: detailY,
    color: '#3a6f38',
    keepHoverNodeId: Number(node.id),
  });
}

function showTooltip(text, clientX, clientY) {
  if (!text) {
    tooltipEl.style.display = 'none';
    return;
  }
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = `${clientX + 14}px`;
  tooltipEl.style.top = `${clientY + 14}px`;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'text';
    xhr.timeout = timeoutMs;

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`HTTP ${xhr.status}`));
        return;
      }

      try {
        resolve(JSON.parse(xhr.responseText));
      } catch (error) {
        reject(new Error(`invalid JSON: ${error.message}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('network error'));
    };

    xhr.ontimeout = () => {
      reject(new Error(`timeout after ${timeoutMs}ms`));
    };

    xhr.onabort = () => {
      reject(new Error('request aborted'));
    };

    xhr.send();
  });
}

async function yieldToMainThread() {
  await new Promise((resolve) => window.setTimeout(resolve, 20));
}

async function fetchRequiredJsonWithProgress(url, index, total) {
  setStatus(`Loading predictor data (${index}/${total}): ${url.split('/').pop()}`);
  try {
    return await fetchJsonWithTimeout(url, REQUIRED_FETCH_TIMEOUT_MS);
  } catch (error) {
    throw new Error(`Failed loading required data file: ${url} (${error.message})`);
  }
}

function buildShopDisplayItems(node) {
  if (!Array.isArray(node.predictedShopItems) || node.predictedShopItems.length === 0) {
    return [];
  }
  return [...node.predictedShopItems].reverse();
}

function buildCompletionDisplayItems(node) {
  const items = [];

  if (Array.isArray(node.predictedEncounterItems) && node.predictedEncounterItems.length > 0) {
    items.push(...node.predictedEncounterItems);
  }

  if (Array.isArray(node.predictedChallengeItems) && node.predictedChallengeItems.length > 0) {
    items.push(...node.predictedChallengeItems);
  }

  if (Array.isArray(node.predictedRestStopItems) && node.predictedRestStopItems.length > 0) {
    items.push(...node.predictedRestStopItems);
  }

  if (Array.isArray(node.predictedFragmentOfferItems) && node.predictedFragmentOfferItems.length > 0) {
    for (const offer of node.predictedFragmentOfferItems) {
      const normalized = String(offer || '').replace(/^frag\+\d+\s+/i, '').trim();
      if (!normalized) {
        continue;
      }

      for (const token of normalized.split(' | ')) {
        const item = String(token || '').trim();
        if (item) {
          items.push(item);
        }
      }
    }
  }

  return items;
}

function getMaxZ(graph) {
  let maxZ = -Infinity;
  for (const n of graph.nodes) {
    maxZ = Math.max(maxZ, n.z);
  }
  return maxZ;
}

function makeWorldToScreen(graph) {
  const maxZ = getMaxZ(graph);
  return {
    worldToScreen(x, z) {
      return {
        x: state.panX + x * state.zoom,
        y: state.panY + (maxZ - z) * state.zoom,
      };
    },
    maxZ,
  };
}

function getHoveredNodeIdAt(clientX, clientY) {
  if (!state.graph) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { worldToScreen } = makeWorldToScreen(state.graph);

  let bestId = null;
  let bestDist = Infinity;
  let bestNodeType = null;
  for (const n of state.graph.nodes) {
    const p = worldToScreen(n.x, n.z);
    const dx = p.x - x;
    const dy = p.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = n.id;
      bestNodeType = n.type;
    }
  }

  const threshold = bestNodeType ? getNodeRadius(bestNodeType) + 4 : 16;
  return bestDist <= threshold ? bestId : null;
}

function handleCanvasTap(clientX, clientY) {
  const tappedHitbox = getHoverHitboxAt(clientX, clientY);
  if (tappedHitbox) {
    const keepHoverNodeId = tappedHitbox.keepHoverNodeId;
    const hasKeepHoverNodeId = keepHoverNodeId !== undefined && keepHoverNodeId !== null;

    if (hasKeepHoverNodeId && state.hoverNodeId !== keepHoverNodeId) {
      state.hoverNodeId = keepHoverNodeId;
      draw();
    }

    const action = tappedHitbox.action;
    if (action?.type === 'shop-reroll') {
      stepShopRerollForNode(Number(action.nodeId), Number(action.delta));
      return true;
    }

    if (tappedHitbox.tooltip) {
      showTooltip(tappedHitbox.tooltip, clientX, clientY);
      return true;
    }

    return hasKeepHoverNodeId;
  }

  const hovered = getHoveredNodeIdAt(clientX, clientY);
  if (hovered !== null && hovered !== undefined) {
    if (state.hoverNodeId !== hovered) {
      state.hoverNodeId = hovered;
      draw();
    }
    showTooltip('', clientX, clientY);
    return true;
  }

  showTooltip('', clientX, clientY);
  return false;
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#12171f');
  grad.addColorStop(1, '#0b1017');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (!state.graph) {
    return;
  }

  state.hitboxes = [];

  const nodeMap = new Map(state.graph.nodes.map((n) => [n.id, n]));
  const selectedPathForDisplay = state.selectedPathNodeIds.length > 0
    ? [0, ...state.selectedPathNodeIds.map((x) => Number(x))]
    : [];
  const selectedPathSet = new Set(selectedPathForDisplay);
  const selectedPathEdgeSet = new Set();
  for (let i = 0; i < selectedPathForDisplay.length - 1; i += 1) {
    const fromId = Number(selectedPathForDisplay[i]);
    const toId = Number(selectedPathForDisplay[i + 1]);
    selectedPathEdgeSet.add(`${fromId}->${toId}`);
  }
  const currentPathNodeId = state.selectedPathNodeIds.length > 0
    ? Number(state.selectedPathNodeIds[state.selectedPathNodeIds.length - 1])
    : null;
  const accessibleNodeIdSet = getAccessibleNodeIdSet(state.graph, getPathAnchorNodeId());

  function getNodeMarkerStyle(nodeId) {
    const id = Number(nodeId);

    if (currentPathNodeId !== null && id === currentPathNodeId) {
      return {
        strokeColor: '#d946ef',
        fillColor: 'rgba(217, 70, 239, 0.15)',
      };
    }

    if (selectedPathSet.has(id)) {
      return {
        strokeColor: '#7e22ce',
        fillColor: 'rgba(126, 34, 206, 0.12)',
      };
    }

    if (state.selectedPathNodeIds.length > 0 && !accessibleNodeIdSet.has(id)) {
      return {
        strokeColor: '#6b7280',
        fillColor: 'rgba(107, 114, 128, 0.1)',
      };
    }

    return {
      strokeColor: '#ffffff',
      fillColor: 'rgba(0, 0, 0, 0)',
    };
  }
  const { worldToScreen } = makeWorldToScreen(state.graph);
  const showAllDetailPanels = state.zoom >= LABEL_ZOOM_THRESHOLD;
  const showHoverDetailPanel = !showAllDetailPanels;

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#7b8797';

  for (const n of state.graph.nodes) {
    const from = worldToScreen(n.x, n.z);
    const fromRadius = getNodeRadius(n.type);
    for (const nextId of n.next) {
      const toNode = nodeMap.get(nextId);
      if (!toNode) {
        continue;
      }
      const to = worldToScreen(toNode.x, toNode.z);
      const toRadius = getNodeRadius(toNode.type);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.001) {
        continue;
      }

      const ux = dx / len;
      const uy = dy / len;
      const startX = from.x + ux * fromRadius;
      const startY = from.y + uy * fromRadius;
      const endX = to.x - ux * toRadius;
      const endY = to.y - uy * toRadius;

      const edgeKey = `${Number(n.id)}->${Number(nextId)}`;
      const isPathEdge = selectedPathEdgeSet.has(edgeKey);
      ctx.strokeStyle = isPathEdge ? '#7e22ce' : '#7b8797';

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  const textOffsetX = NODE_TEXT_OFFSET_X;
  const hoveredNode = state.hoverNodeId === null || state.hoverNodeId === undefined
    ? null
    : (state.graph.nodes.find((n) => Number(n.id) === Number(state.hoverNodeId)) || null);

  for (const n of state.graph.nodes) {
    if (hoveredNode && Number(n.id) === Number(hoveredNode.id)) {
      continue;
    }

    const p = worldToScreen(n.x, n.z);
    drawNodeMarker(n, p, false, getNodeMarkerStyle(n.id));

    if (showAllDetailPanels) {
      drawNodeDetails(n, p, textOffsetX, {
        showPanelChrome: false,
        keepPanelHover: false,
      });
    }

  }

  if (hoveredNode) {
    const p = worldToScreen(hoveredNode.x, hoveredNode.z);
    drawNodeMarker(hoveredNode, p, true, getNodeMarkerStyle(hoveredNode.id));
    if (showAllDetailPanels) {
      drawNodeDetails(hoveredNode, p, textOffsetX, {
        showPanelChrome: false,
        keepPanelHover: false,
      });
    } else if (showHoverDetailPanel) {
      drawNodeDetails(hoveredNode, p, textOffsetX, {
        showPanelChrome: true,
        keepPanelHover: true,
      });
    }
  }
}

function fitToGraph() {
  if (!state.graph || state.graph.nodes.length === 0) {
    return;
  }

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pad = 80;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const n of state.graph.nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minZ = Math.min(minZ, n.z);
    maxZ = Math.max(maxZ, n.z);
  }

  if (maxX === minX) {
    maxX += 1;
  }
  if (maxZ === minZ) {
    maxZ += 1;
  }

  const worldW = maxX - minX;
  const worldH = maxZ - minZ;

  const sx = (width - pad * 2) / worldW;
  const sy = (height - pad * 2) / worldH;
  const baseZoom = Math.max(5, Math.min(22, Math.min(sx, sy)));
  state.zoom = INITIAL_ZOOM_SCALE;

  const startNode = state.graph.nodes.reduce((best, node) => {
    if (!best) {
      return node;
    }
    return node.id < best.id ? node : best;
  }, null);

  if (startNode) {
    const targetX = width * 0.45;
    const targetY = height - 110;
    state.panX = targetX - startNode.x * state.zoom;
    state.panY = targetY - (maxZ - startNode.z) * state.zoom;
  } else {
    state.panX = pad - minX * state.zoom;
    state.panY = pad;
  }

  state.viewReady = true;
}

async function fetchOptions() {
  const coreUrls = [
    './data/predictor-runs-levels.json',
    './data/predictor-biomes-fragments.json',
    './data/predictor-cache-encounters.json',
  ];

  const optionalUrls = [
    './data/predictor-items-shop.json',
    './data/predictor-item-metadata.json',
    './data/predictor-modifier-metadata.json',
  ];

  const corePayloads = [];
  for (let i = 0; i < coreUrls.length; i += 1) {
    corePayloads.push(await fetchRequiredJsonWithProgress(coreUrls[i], i + 1, coreUrls.length));
  }
  const [runsLevels, biomesFragments, cacheEncounters] = corePayloads;

  setStatus('Loading optional metadata...');
  const optionalPayloads = [];

  for (let i = 0; i < optionalUrls.length; i += 1) {
    const url = optionalUrls[i];
    setStatus(`Loading optional metadata (${i + 1}/${optionalUrls.length}): ${url.split('/').pop()}`);
    try {
      const payload = await fetchJsonWithTimeout(url, OPTIONAL_FETCH_TIMEOUT_MS);
      optionalPayloads.push(payload);
      console.info('[predictor-load] optional loaded', url);
    } catch (error) {
      console.warn('[predictor-load] optional skipped', url, error?.message || error);
    }

    await yieldToMainThread();
  }

  const failedOptionalCount = optionalUrls.length - optionalPayloads.length;
  if (failedOptionalCount > 0) {
    setStatus(`Optional metadata timeout/failure: ${failedOptionalCount}. Continuing...`);
    await yieldToMainThread();
  }

  const bundle = {
    ...runsLevels,
    ...biomesFragments,
    ...cacheEncounters,
    ...Object.assign({}, ...optionalPayloads),
  };

  const itemMetadata = optionalPayloads.find((payload) => Array.isArray(payload?.items));
  const modifierMetadata = optionalPayloads.find((payload) => Array.isArray(payload?.modifiers));

  setStatus('Indexing item metadata...');
  await yieldToMainThread();

  state.itemMetadataByName = new Map();
  state.itemMetadataByDisplayName = new Map();
  const itemList = itemMetadata?.items || [];
  for (let i = 0; i < itemList.length; i += 1) {
    const item = itemList[i];
    state.itemMetadataByName.set(normalizeKey(item.name), item);
    state.itemMetadataByDisplayName.set(normalizeKey(item.displayName), item);

    if (i > 0 && i % 200 === 0) {
      setStatus(`Indexing item metadata (${i}/${itemList.length})...`);
      await yieldToMainThread();
    }
  }

  setStatus('Indexing modifier metadata...');
  await yieldToMainThread();

  state.modifierMetadataByName = new Map();
  const modifierList = modifierMetadata?.modifiers || [];
  for (let i = 0; i < modifierList.length; i += 1) {
    const modifier = modifierList[i];
    state.modifierMetadataByName.set(normalizeKey(modifier.name), modifier);

    if (i > 0 && i % 200 === 0) {
      setStatus(`Indexing modifier metadata (${i}/${modifierList.length})...`);
      await yieldToMainThread();
    }
  }

  for (const iconPath of Object.values(NODE_TYPE_ICON_PATHS)) {
    preloadIcon(iconPath);
  }

  renderOwnedItemChecklist(bundle);

  setStatus('Initializing predictor engine...');
  await yieldToMainThread();
  console.info('[predictor-load] constructing PredictorDataStore');
  try {
    state.dataStore = new PredictorDataStore(bundle);
  } catch (error) {
    const reason = error?.message || String(error);
    console.error('[predictor-load] PredictorDataStore failed', reason);
    throw new Error(`Failed to initialize predictor engine from bundled data: ${reason}`);
  }
  console.info('[predictor-load] PredictorDataStore ready');

  setStatus('Predictor engine ready.');
  await yieldToMainThread();

  return {
    shards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    ascensionLevels: [0, 1, 2, 3, 4],
  };
}

function getRunConfigFromPreset(shard, timeAttack, ascension) {
  const shardInt = Number(shard);
  const ascensionInt = Number(ascension ?? 0);

  const baseByShard = {
    1: '1 Forest_1',
    2: '2 Desert_1',
    3: '3 Forest_2',
    4: '4 Snow_1',
    5: '5 Desert_2',
    6: '6 Snow_2',
    7: '7 Forest_3',
    8: '8 Desert_3',
    9: '9 Snow_3',
  };

  let name = '';
  if (shardInt === 10) {
    if (ascensionInt > 0) {
      name = `10 Final_Ascension_${ascensionInt}`;
    } else {
      name = '10 Final';
    }
  } else {
    name = baseByShard[shardInt] || '';
  }

  if (!name) {
    return null;
  }

  if (timeAttack) {
    name += '_TT';
  }

  return name;
}

async function generate(options = {}) {
  const {
    preserveView = false,
    preserveHover = false,
    lockedEncounterNodeIds = null,
    encounterHistoryNodeIdsOverride = null,
  } = options;

  if (state.isGenerating) {
    state.autoGenerateQueued = true;
    return;
  }

  state.isGenerating = true;

  try {
    if (!state.dataStore) {
      throw new Error('Data store is not loaded yet.');
    }

    const normalizedInputs = normalizeGenerationInputs({ applyToUi: true });
    const shard = normalizedInputs.shard;
    const seed = normalizedInputs.seed;
    const timeAttack = Boolean(timeAttackEl.checked);
    const ascension = normalizedInputs.ascension;
    const obstacleDifficultyPercent = Number(obstacleDifficultyEl.value);
    const obstacleDifficulty = clamp(obstacleDifficultyPercent / 100, 0, 2);
    const modifierDifficultyPercent = Number(modifierDifficultyEl.value);
    const fragmentModifierFrequencyDifficulty = clamp(modifierDifficultyPercent / 100, 0, 2);
    const itemRarityDifficultyPercent = Number(itemRarityDifficultyEl.value);
    const itemRarityDifficulty = clamp(itemRarityDifficultyPercent / 100, 0, 2);
    const playerItemRarityBonusPercent = Number(playerItemRarityBonusEl.value);
    const playerItemRarityBonus = Math.max(0, playerItemRarityBonusPercent / 100);
    const challengeCompletionTier = String(challengeCompletionTierEl.value || 'S').toUpperCase();
    const extraLevelDifficultyRaw = Number(extraLevelDifficultyEl.value);
    const extraLevelDifficulty = Number.isFinite(extraLevelDifficultyRaw) ? extraLevelDifficultyRaw : 0;
    const predictableFactValues = {
      captaininhub: captainInHubEl.checked ? 1 : 0,
      heirinhub: heirInHubEl.checked ? 1 : 0,
      wraithinhub: wraithInHubEl.checked ? 1 : 0,
      played25mainwraith03: played25MainWraith03El.checked ? 1 : 0,
      // heir_presence_permanent requirement passes when value is < 1 (i.e. 0 = never seen).
      heirpresencepermanent: heirNeverSeenPermanentEl.checked ? 0 : 1,
    };

    const varType0Health = Number(varType0HealthEl.value);
    const varType2Lives = Number(varType2LivesEl.value);
    const varType3Resource = Number(varType3ResourceEl.value);
    const varType12HealthPct = Number(varType12HealthPctEl.value);
    const varType13MissingHealthPct = Number(varType13MissingHealthPctEl.value);
    const varType14MissingLives = Number(varType14MissingLivesEl.value);
    const ownedItemPathIds = getOwnedItemPathIdsFromChecklist();

    const gameplayVariableValues = {
      variabletype0: Number.isFinite(varType0Health) ? varType0Health : 100,
      variabletype2: Number.isFinite(varType2Lives) ? varType2Lives : 3,
      variabletype3: Number.isFinite(varType3Resource) ? varType3Resource : 250,
      variabletype12: Number.isFinite(varType12HealthPct) ? varType12HealthPct : 1,
      variabletype13: Number.isFinite(varType13MissingHealthPct) ? varType13MissingHealthPct : 0,
      variabletype14: Number.isFinite(varType14MissingLives) ? varType14MissingLives : 0,
      health: Number.isFinite(varType0Health) ? varType0Health : 100,
      healthpercentage: Number.isFinite(varType12HealthPct) ? varType12HealthPct : 1,
      missinghealthpercentage: Number.isFinite(varType13MissingHealthPct) ? varType13MissingHealthPct : 0,
      resource: Number.isFinite(varType3Resource) ? varType3Resource : 250,
      sparks: Number.isFinite(varType3Resource) ? varType3Resource : 250,
      lives: Number.isFinite(varType2Lives) ? varType2Lives : 3,
      missinglives: Number.isFinite(varType14MissingLives) ? varType14MissingLives : 0,
    };
    const assumeCharactersInHubPresent = captainInHubEl.checked || heirInHubEl.checked || wraithInHubEl.checked;
    const runConfigName = getRunConfigFromPreset(shard, timeAttack, ascension);

    if (!runConfigName) {
      throw new Error('Invalid shard/run config selection.');
    }

    if (!state.dataStore.resolveRun(runConfigName)) {
      throw new Error(`RunConfig not found in bundled data: ${runConfigName}`);
    }

    const encounterHistoryNodeIds = Array.isArray(encounterHistoryNodeIdsOverride)
      ? [...encounterHistoryNodeIdsOverride]
      : (state.selectedPathNodeIds.length > 0 ? [...state.selectedPathNodeIds] : null);

    const basePredictParams = {
      runConfigName,
      seed,
      obstacleDifficulty,
      fragmentModifierFrequencyDifficulty,
      itemRarityDifficulty,
      playerItemRarityBonus,
      challengeCompletionTier,
      extraLevelDifficulty,
      assumeCharactersInHubPresent,
      ignoreCharacterEncounterFactChecks: Boolean(ignoreCharacterEncounterFactChecksEl.checked),
      predictableFactValues,
      gameplayVariableValues,
      gameplayItemPathIds: ownedItemPathIds,
      encounterHistoryNodeIds,
    };

    setStatus('Generating...');

    const shopRerollByNodeId = Object.fromEntries(
      [...state.shopRerollByNodeId.entries()].map(([k, v]) => [String(k), Number(v)])
    );

    const predictParams = {
      ...basePredictParams,
      shopRerollByNodeId,
    };

    const signature = getPredictionSignature(predictParams);
    let data = state.shopRerollCacheBySignature.get(signature);
    if (!data) {
      data = predictRun(state.dataStore, predictParams);
      state.shopRerollCacheBySignature.set(signature, data);
    }

    const previousGraph = state.graph;
    if (Array.isArray(lockedEncounterNodeIds) && lockedEncounterNodeIds.length > 0) {
      stabilizeLockedEncounterPredictions(previousGraph, data.graph, lockedEncounterNodeIds);
    }

    state.lastPredictData = data;
    state.graph = data.graph;
    updatePathEncounterCountersFromGraph();
    if (!preserveHover) {
      state.hoverNodeId = null;
    }
    runConfigNameEl.textContent = data.runConfigName;
    nodeCountEl.textContent = String(data.graph.nodes.length);
    if (!preserveView) {
      fitToGraph();
    }
    draw();

    setStatus(`Shard ${shard} @ seed ${seed}`);

    if (isMobileViewport()) {
      setSidebarOpen(false);
    }
  } finally {
    state.isGenerating = false;

    if (state.autoGenerateQueued && !state.initializing) {
      state.autoGenerateQueued = false;
      scheduleAutoGenerateFromSettings({ resetPath: false });
    }
  }
}

function stepShopRerollForNode(nodeId, delta) {
  if (!state.dataStore || !state.dataStore.shopDataAvailable) {
    return;
  }

  if (nodeId === null || nodeId === undefined) {
    return;
  }

  const current = getShopRerollIndexForNode(nodeId);
  const next = Math.max(0, current + Number(delta));
  if (next === current) {
    return;
  }

  setShopRerollIndexForNode(nodeId, next);
  generate({ preserveView: true, preserveHover: true }).catch((error) => {
    setStatus(error.message);
  });
}

function refreshAscensionVisibility() {
  const shard = Number(shardEl.value);
  ascensionRowEl.style.display = shard === 10 ? 'block' : 'none';
}

function bindCanvasInteractions() {
  const pathDragState = {
    active: false,
    lastNodeId: null,
  };

  const touchState = {
    mode: 'none',
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    startTimeMs: 0,
    pinchDistance: 0,
  };

  function getTouchCanvasPoint(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
  }

  function getTouchDistance(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
      pathDragState.active = true;
      pathDragState.lastNodeId = null;

      const hoveredNodeId = getHoveredNodeIdAt(event.clientX, event.clientY);
      if (hoveredNodeId !== null && hoveredNodeId !== undefined) {
        pathDragState.lastNodeId = Number(hoveredNodeId);
        applyPathSelectionToNode(pathDragState.lastNodeId);
      }

      event.preventDefault();
      return;
    }

    if (event.button !== 0) {
      return;
    }

    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      pathDragState.active = false;
      pathDragState.lastNodeId = null;
    }
    state.dragging = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    if (pathDragState.active) {
      const hoveredNodeId = getHoveredNodeIdAt(event.clientX, event.clientY);
      if (hoveredNodeId !== null && hoveredNodeId !== undefined && Number(hoveredNodeId) !== pathDragState.lastNodeId) {
        pathDragState.lastNodeId = Number(hoveredNodeId);
        applyPathSelectionToNode(pathDragState.lastNodeId);
      }

      event.preventDefault();
      return;
    }

    if (state.dragging) {
      return;
    }

    const hoveredHitbox = getHoverHitboxAt(event.clientX, event.clientY);
    if (hoveredHitbox) {
      const hasKeepHoverNodeId = hoveredHitbox.keepHoverNodeId !== undefined && hoveredHitbox.keepHoverNodeId !== null;

      if (hasKeepHoverNodeId) {
        if (state.hoverNodeId !== hoveredHitbox.keepHoverNodeId) {
          state.hoverNodeId = hoveredHitbox.keepHoverNodeId;
          draw();
        }
      }

      if (hoveredHitbox.tooltip) {
        showTooltip(hoveredHitbox.tooltip, event.clientX, event.clientY);
      } else {
        showTooltip('', event.clientX, event.clientY);
      }

      if (!hasKeepHoverNodeId && state.hoverNodeId !== null) {
        state.hoverNodeId = null;
        draw();
      }
      return;
    }

    showTooltip('', event.clientX, event.clientY);
    const hovered = getHoveredNodeIdAt(event.clientX, event.clientY);
    if (hovered !== state.hoverNodeId) {
      state.hoverNodeId = hovered;
      draw();
    }
  });

  canvas.addEventListener('click', (event) => {
    if (event.button !== 0) {
      return;
    }
    handleCanvasTap(event.clientX, event.clientY);
  });

  canvas.addEventListener('mouseleave', () => {
    pathDragState.active = false;
    pathDragState.lastNodeId = null;
    showTooltip('', 0, 0);
    if (state.hoverNodeId !== null) {
      state.hoverNodeId = null;
      draw();
    }
  });

  window.addEventListener('mousemove', (event) => {
    if (pathDragState.active) {
      return;
    }

    if (!state.dragging) {
      return;
    }
    const dx = event.clientX - state.dragStartX;
    const dy = event.clientY - state.dragStartY;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.panX += dx;
    state.panY += dy;
    state.hoverNodeId = null;
    showTooltip('', 0, 0);
    draw();
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;

    const oldZoom = state.zoom;
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clamp(oldZoom * zoomFactor, 2, 60);

    const worldX = (cx - state.panX) / oldZoom;
    const worldY = (cy - state.panY) / oldZoom;

    state.zoom = newZoom;
    state.panX = cx - worldX * newZoom;
    state.panY = cy - worldY * newZoom;
    draw();
  }, { passive: false });

  /*
  canvas.addEventListener('dblclick', () => {
    fitToGraph();
    draw();
  });
  */

  canvas.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) {
      const p = getTouchCanvasPoint(event.touches[0]);
      touchState.mode = 'pan';
      touchState.startX = p.clientX;
      touchState.startY = p.clientY;
      touchState.lastX = p.clientX;
      touchState.lastY = p.clientY;
      touchState.moved = false;
      touchState.startTimeMs = Date.now();
      event.preventDefault();
      return;
    }

    if (event.touches.length >= 2) {
      const t0 = getTouchCanvasPoint(event.touches[0]);
      const t1 = getTouchCanvasPoint(event.touches[1]);
      touchState.mode = 'pinch';
      touchState.pinchDistance = getTouchDistance(t0, t1);
      touchState.moved = true;
      state.hoverNodeId = null;
      showTooltip('', 0, 0);
      event.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (event) => {
    if (touchState.mode === 'pan' && event.touches.length === 1) {
      const p = getTouchCanvasPoint(event.touches[0]);
      const movedDist = Math.hypot(p.clientX - touchState.startX, p.clientY - touchState.startY);
      const dx = p.clientX - touchState.lastX;
      const dy = p.clientY - touchState.lastY;
      touchState.lastX = p.clientX;
      touchState.lastY = p.clientY;

      if (!touchState.moved) {
        if (movedDist < TOUCH_TAP_SLOP_PX) {
          event.preventDefault();
          return;
        }
        touchState.moved = true;
        state.hoverNodeId = null;
        showTooltip('', 0, 0);
      }

      state.panX += dx;
      state.panY += dy;
      draw();
      event.preventDefault();
      return;
    }

    if (event.touches.length >= 2) {
      const t0 = getTouchCanvasPoint(event.touches[0]);
      const t1 = getTouchCanvasPoint(event.touches[1]);
      const midX = (t0.x + t1.x) / 2;
      const midY = (t0.y + t1.y) / 2;
      const distance = getTouchDistance(t0, t1);

      if (touchState.mode !== 'pinch' || touchState.pinchDistance <= 0) {
        touchState.mode = 'pinch';
        touchState.pinchDistance = distance;
        touchState.moved = true;
        event.preventDefault();
        return;
      }

      const scaleFactor = distance / touchState.pinchDistance;
      const oldZoom = state.zoom;
      const newZoom = clamp(oldZoom * scaleFactor, 2, 60);

      const worldX = (midX - state.panX) / oldZoom;
      const worldY = (midY - state.panY) / oldZoom;

      state.zoom = newZoom;
      state.panX = midX - worldX * newZoom;
      state.panY = midY - worldY * newZoom;
      touchState.pinchDistance = distance;
      draw();
      event.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (event) => {
    if (touchState.mode === 'pan' && !touchState.moved && event.changedTouches.length > 0) {
      const tapDurationMs = Date.now() - touchState.startTimeMs;
      if (tapDurationMs <= TOUCH_TAP_MAX_MS) {
        const touch = event.changedTouches[0];
        const handled = handleCanvasTap(touch.clientX, touch.clientY);
        if (handled) {
          event.preventDefault();
        }
      }
    }

    if (event.touches.length === 0) {
      touchState.mode = 'none';
      touchState.moved = false;
      touchState.pinchDistance = 0;
      return;
    }

    if (event.touches.length === 1) {
      const p = getTouchCanvasPoint(event.touches[0]);
      touchState.mode = 'pan';
      touchState.startX = p.clientX;
      touchState.startY = p.clientY;
      touchState.lastX = p.clientX;
      touchState.lastY = p.clientY;
      touchState.moved = false;
      touchState.startTimeMs = Date.now();
      touchState.pinchDistance = 0;
      return;
    }

    if (event.touches.length >= 2) {
      const t0 = getTouchCanvasPoint(event.touches[0]);
      const t1 = getTouchCanvasPoint(event.touches[1]);
      touchState.mode = 'pinch';
      touchState.moved = true;
      touchState.pinchDistance = getTouchDistance(t0, t1);
    }
  }, { passive: false });
}

async function init() {
  try {
    const options = await fetchOptions();

    for (const shard of options.shards) {
      const option = document.createElement('option');
      option.value = String(shard);
      option.textContent = String(shard);
      shardEl.appendChild(option);
    }

    for (const asc of options.ascensionLevels) {
      const option = document.createElement('option');
      option.value = String(asc);
      option.textContent = asc === 0 ? 'None (Base)' : String(asc);
      ascensionEl.appendChild(option);
    }

    shardEl.value = '1';
    ascensionEl.value = '0';
    applySiteSettings(loadSiteSettings());
    normalizeGenerationInputs({ applyToUi: true });
    refreshAscensionVisibility();

    bindSiteSettingsPersistence();
    bindMobileSidebar();

    shardEl.addEventListener('change', refreshAscensionVisibility);

    generateBtnEl.addEventListener('click', () => {
      resetShopRerolls();
      clearSelectedPath();
      generate().catch((error) => {
        setStatus(error.message);
      });
    });

    if (pasteQrBtnEl) {
      pasteQrBtnEl.addEventListener('click', () => {
        openQrModal();
      });
    }

    if (qrModalBackdropEl) {
      qrModalBackdropEl.addEventListener('click', closeQrModal);
    }

    if (qrModalCancelBtnEl) {
      qrModalCancelBtnEl.addEventListener('click', closeQrModal);
    }

    if (qrModalApplyBtnEl) {
      qrModalApplyBtnEl.addEventListener('click', () => {
        applyQrJsonText(qrJsonInputEl ? qrJsonInputEl.value : '');
      });
    }

    if (qrJsonInputEl) {
      qrJsonInputEl.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          applyQrJsonText(qrJsonInputEl.value);
        }
      });
    }

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && qrModalEl && !qrModalEl.hidden) {
        closeQrModal();
      }
    });

    bindCanvasInteractions();
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    setStatus('Generating initial map...');
    await generate();
    state.initializing = false;
    bindAutoGenerateFromSettings();
  } catch (error) {
    state.initializing = false;
    setStatus(error.message);
  }
}

init();
