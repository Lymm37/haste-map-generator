import { DotNetRandom } from './dotnetRandom-browser.js';

function getArray(obj) {
  if (!obj) {
    return [];
  }
  if (Array.isArray(obj)) {
    return obj;
  }
  if (Array.isArray(obj.Array)) {
    return obj.Array;
  }
  return [];
}

function roundToEven(value, digits = 0) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floorVal = Math.floor(scaled);
  const diff = scaled - floorVal;
  const epsilon = 1e-12;

  let rounded;
  if (diff > 0.5 + epsilon) {
    rounded = floorVal + 1;
  } else if (diff < 0.5 - epsilon) {
    rounded = floorVal;
  } else {
    rounded = Math.abs(floorVal) % 2 === 0 ? floorVal : floorVal + 1;
  }

  return rounded / factor;
}

function toRounded(value, digits = 6) {
  return roundToEven(Number(value), digits);
}

function nextFloat(random) {
  return Math.fround(random.nextDouble());
}

function rangeFloat(random, min, max) {
  return Math.fround(nextFloat(random) * (max - min) + min);
}

function randomChoice(random, arr) {
  if (!arr || arr.length === 0) {
    return null;
  }
  return arr[random.next(0, arr.length)];
}

function newVec(x, y, z) {
  return { x, y, z };
}

function vecDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function resolveBiomeIdentifierName(id) {
  switch (id) {
    case 1:
      return 'Forest';
    case 2:
      return 'Desert';
    case 3:
      return 'Ice'; // Could also be "Snow"
    case 4:
      return 'Mushroom';
    case 5:
      return 'Wetland'; // Could also be "RainyDesert"
    case 9:
      return 'Void';
    case 0:
      return 'Unused_0';
    default:
      return `Unknown_${id}`;
  }
}

function resolveBiomeAssetName(biomeAssetNameByPath, pathId) {
  if (biomeAssetNameByPath.has(pathId) && biomeAssetNameByPath.get(pathId)) {
    return String(biomeAssetNameByPath.get(pathId));
  }
  return `PathID_${pathId}`;
}

function evaluateCurveApprox(curveArray, t) {
  if (!curveArray || curveArray.length === 0) {
    return 0;
  }
  if (curveArray.length === 1) {
    return Number(curveArray[0].value);
  }

  if (t <= Number(curveArray[0].time)) {
    return Number(curveArray[0].value);
  }
  if (t >= Number(curveArray[curveArray.length - 1].time)) {
    return Number(curveArray[curveArray.length - 1].value);
  }

  for (let i = 0; i < curveArray.length - 1; i += 1) {
    const k0 = curveArray[i];
    const k1 = curveArray[i + 1];
    const t0 = Number(k0.time);
    const t1 = Number(k1.time);

    if (t < t0 || t > t1) {
      continue;
    }

    const dt = t1 - t0;
    if (dt <= 0) {
      return Number(k0.value);
    }

    const u = (t - t0) / dt;
    const u2 = u * u;
    const u3 = u2 * u;

    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;

    const m0 = Number(k0.outSlope) * dt;
    const m1 = Number(k1.inSlope) * dt;

    return h00 * Number(k0.value) + h10 * m0 + h01 * Number(k1.value) + h11 * m1;
  }

  return Number(curveArray[curveArray.length - 1].value);
}

function inverseLerp(a, b, v) {
  if (Math.abs(b - a) < 1e-8) {
    return 0;
  }
  let t = (v - a) / (b - a);
  if (t < 0) {
    t = 0;
  }
  if (t > 1) {
    t = 1;
  }
  return t;
}

function areLinesIntersecting2D(l1p1, l1p2, l2p1, l2p2, includeEndpoints) {
  const epsilon = 1e-5;
  let intersects = false;
  const num2 = (l2p2.y - l2p1.y) * (l1p2.x - l1p1.x) - (l2p2.x - l2p1.x) * (l1p2.y - l1p1.y);

  if (num2 !== 0) {
    const num3 = ((l2p2.x - l2p1.x) * (l1p1.y - l2p1.y) - (l2p2.y - l2p1.y) * (l1p1.x - l2p1.x)) / num2;
    const num4 = ((l1p2.x - l1p1.x) * (l1p1.y - l2p1.y) - (l1p2.y - l1p1.y) * (l1p1.x - l2p1.x)) / num2;

    if (includeEndpoints) {
      if (num3 >= 0 + epsilon && num3 <= 1 - epsilon && num4 >= 0 + epsilon && num4 <= 1 - epsilon) {
        intersects = true;
      }
    } else if (num3 > 0 + epsilon && num3 < 1 - epsilon && num4 > 0 + epsilon && num4 < 1 - epsilon) {
      intersects = true;
    }
  }

  return intersects;
}

function doesPathIntersect(fromNode, toNode, paths, nodeById) {
  for (const p of paths) {
    const a = nodeById.get(Number(p.from));
    const b = nodeById.get(Number(p.to));
    const l1p1 = { x: Math.fround(a.pos.x), y: Math.fround(a.pos.z) };
    const l1p2 = { x: Math.fround(b.pos.x), y: Math.fround(b.pos.z) };
    const l2p1 = { x: Math.fround(fromNode.pos.x), y: Math.fround(fromNode.pos.z) };
    const l2p2 = { x: Math.fround(toNode.pos.x), y: Math.fround(toNode.pos.z) };

    if (areLinesIntersecting2D(l1p1, l1p2, l2p1, l2p2, false)) {
      return true;
    }
  }
  return false;
}

function hasPath(paths, fromId, toId) {
  return paths.some((p) => Number(p.from) === fromId && Number(p.to) === toId);
}

function addPath(paths, fromId, toId) {
  if (hasPath(paths, fromId, toId)) {
    return false;
  }
  paths.push({ from: fromId, to: toId, intersects: false });
  return true;
}

function addRandomUniquePath(random, paths, fromId, candidateNodes) {
  const candidates = [...candidateNodes];
  while (candidates.length > 0) {
    const pick = candidates[random.next(0, candidates.length)];
    const idx = candidates.indexOf(pick);
    candidates.splice(idx, 1);
    if (addPath(paths, fromId, Number(pick.id))) {
      return true;
    }
  }
  return false;
}

function chooseWeightedBiomeVariant(random, variantEntries) {
  const entries = [...variantEntries];
  if (entries.length === 0) {
    return null;
  }

  let sum = Math.fround(0);
  for (const e of entries) {
    sum = Math.fround(sum + Math.fround(Number(e.weight)));
  }

  if (sum <= 0) {
    return Number(entries[entries.length - 1].variant.m_PathID);
  }

  const roll = Math.fround(nextFloat(random) * sum);
  let acc = Math.fround(0);

  for (const e of entries) {
    acc = Math.fround(acc + Math.fround(Number(e.weight)));
    if (roll < acc) {
      return Number(e.variant.m_PathID);
    }
  }

  return Number(entries[entries.length - 1].variant.m_PathID);
}

function ratioToProbability(ratio) {
  return Math.fround(0.5 * ratio + 0.25);
}

function getArrayCount(obj) {
  if (!obj) {
    return 0;
  }
  if (Array.isArray(obj)) {
    return obj.length;
  }
  if (Array.isArray(obj.Array)) {
    return obj.Array.length;
  }
  return 0;
}

function normalizeEncounterKey(value) {
  if (!value) {
    return '';
  }
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getEncounterAliases(encounterId) {
  const aliases = new Set();
  if (!encounterId) {
    return [];
  }

  aliases.add(normalizeEncounterKey(encounterId));

  // Add the base encounter token up to the numbered id, e.g. wraith_07_strange_power_1 -> wraith_07.
  const prefixMatch = encounterId.match(/^([a-z]+_\d+)_/i);
  if (prefixMatch && prefixMatch[1]) {
    aliases.add(normalizeEncounterKey(prefixMatch[1]));
  }

  const trimmedNumeric = encounterId.replace(/_\d+$/, '');
  if (trimmedNumeric !== encounterId) {
    aliases.add(normalizeEncounterKey(trimmedNumeric));
  }

  const match = encounterId.match(/^challenge_(.+)$/);
  if (match) {
    const rest = match[1];
    aliases.add(normalizeEncounterKey(`challenge_${rest}`));
    aliases.add(normalizeEncounterKey(rest));

    const restTrimmed = rest.replace(/_\d+$/, '');
    if (restTrimmed !== rest) {
      aliases.add(normalizeEncounterKey(`challenge_${restTrimmed}`));
      aliases.add(normalizeEncounterKey(restTrimmed));
    }
  }

  return [...aliases];
}

function testRequirementComparison(comparison, actual, expected) {
  switch (comparison) {
    case 0:
      return actual > expected;
    case 1:
      return actual < expected;
    case 2:
      return roundToEven(actual, 0) === roundToEven(expected, 0);
    default:
      return true;
  }
}

function getLevelProgress(currentLevel, nrOfLevels) {
  if (nrOfLevels <= 1) {
    return 0;
  }
  return Math.max(0, Math.min(1, currentLevel / (nrOfLevels - 1)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toRarityName(rarity) {
  switch (Number(rarity)) {
    case 0:
      return 'Common';
    case 1:
      return 'Rare';
    case 2:
      return 'Epic';
    case 3:
      return 'Legendary';
    default:
      return 'Unknown';
  }
}

function downgradeRarity(rarity) {
  switch (Number(rarity)) {
    case 0:
      return null;
    case 1:
      return 0;
    case 2:
      return 1;
    case 3:
      return 2;
    default:
      return null;
  }
}

function selectShopRarity(random, itemRarityWeight, equalProbabilityPoint, legendaryProbabilityPenalty, itemRarityDifficulty, playerItemRarityBonus) {
  const effectiveWeight = Math.fround((itemRarityWeight + playerItemRarityBonus) * itemRarityDifficulty);
  const safeEqualPoint = Math.max(1e-6, Number(equalProbabilityPoint));
  const base = Math.fround(effectiveWeight / safeEqualPoint);

  const commonWeight = 1;
  const rareWeight = base;
  const epicWeight = base * base;
  let legendaryWeight = base * base * base;
  legendaryWeight = clamp(legendaryWeight - Number(legendaryProbabilityPenalty), 0, legendaryWeight);

  const total = commonWeight + rareWeight + epicWeight + legendaryWeight;
  const roll = nextFloat(random) * total;

  if (roll > commonWeight + rareWeight + epicWeight) {
    return 3;
  }
  if (roll > commonWeight + rareWeight) {
    return 2;
  }
  if (roll > commonWeight) {
    return 1;
  }
  return 0;
}

function selectShopItemWithRarity(random, acceptableItems, rarity) {
  if (!acceptableItems || acceptableItems.length === 0) {
    return null;
  }

  let currentRarity = Number(rarity);
  while (true) {
    const matching = acceptableItems.filter((x) => Number(x.rarity) === currentRarity);
    if (matching.length > 0) {
      return randomChoice(random, matching);
    }

    const downgraded = downgradeRarity(currentRarity);
    if (downgraded === null) {
      break;
    }
    currentRarity = downgraded;
  }

  return randomChoice(random, acceptableItems);
}

function getShopItemRarityModifier(run, currentLevel, extraLevelDifficulty) {
  const progress = getLevelProgress(currentLevel, Number(run.nrOfLevels));
  const difficultyFloat = Number(run.startDifficulty) + (Number(run.endDifficulty) - Number(run.startDifficulty)) * progress + Number(extraLevelDifficulty || 0);
  const roundedDifficulty = roundToEven(difficultyFloat, 0);
  const num = clamp((roundedDifficulty / 20) * 0.5, 0, 2);
  return num * progress;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getChallengeTierItemMultiplier(challengeCompletionTier) {
  switch (String(challengeCompletionTier || 'S').toUpperCase()) {
    case 'S':
      return 1.0;
    case 'A':
      return 0.8;
    case 'B':
      return 0.6;
    case 'C':
      return 0.4;
    case 'D':
      return 0.2;
    case 'E':
      return 0.0;
    default:
      return 1.0;
  }
}

function normalizeModifierToken(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getFragmentModifierItemOfferCount(modifierName, modifierId) {
  const nameToken = normalizeModifierToken(modifierName);
  const idToken = normalizeModifierToken(modifierId);

  if (nameToken.includes('getsinglerandomitem') || idToken.includes('getsinglerandomitem')) {
    return 1;
  }
  if (nameToken.includes('choosefromthreeitems') || idToken.includes('choosefromthreeitems')) {
    return 3;
  }
  return 0;
}

function rollRandomMajorItemsForNode(
  dataStore,
  levelSeed,
  seedOffset,
  itemCount,
  extraRarityWeight,
  itemRarityDifficulty,
  playerItemRarityBonus,
  excludeWithinSet
) {
  if (!dataStore.shopDataAvailable) {
    return [];
  }

  const rng = new DotNetRandom(levelSeed + Number(seedOffset));
  const pickedNames = new Set();
  const picks = [];

  for (let i = 0; i < itemCount; i += 1) {
    const acceptable = dataStore.shopMajorItems.filter((item) => !excludeWithinSet || !pickedNames.has(item.itemName));
    if (acceptable.length === 0) {
      break;
    }

    const rolledRarity = selectShopRarity(
      rng,
      extraRarityWeight,
      dataStore.shopItemDatabase.equalProbabilityPoint,
      dataStore.shopItemDatabase.legendaryProbabilityPenalty,
      itemRarityDifficulty,
      playerItemRarityBonus
    );

    const picked = selectShopItemWithRarity(rng, acceptable, rolledRarity);
    if (!picked) {
      break;
    }

    if (excludeWithinSet) {
      pickedNames.add(picked.itemName);
    }
    picks.push(`${picked.itemName} (${toRarityName(picked.rarity)})`);
  }

  return picks;
}

function estimateEncounterDifficulty(currentLevel, run, extraLevelDifficulty) {
  const progress = getLevelProgress(currentLevel, Number(run.nrOfLevels));
  let difficultyFloat = Number(run.startDifficulty) + (Number(run.endDifficulty) - Number(run.startDifficulty)) * progress;
  difficultyFloat += extraLevelDifficulty;
  return roundToEven(difficultyFloat, 0);
}

function testEncounterRulePredictable(rule, difficulty, currentLevel, maxLevels, assumeCharactersInHubPresent, predictableFactValues) {
  if (!rule || !rule.Components || rule.Components.length === 0) {
    return true;
  }

  const runProgress = getLevelProgress(currentLevel, maxLevels);
  const levelsRemaining = maxLevels - currentLevel;

  for (const component of rule.Components) {
    let passes = true;

    for (const factReq of component.PredictableFacts) {
      const factKey = String(factReq?.FactKey || '').trim();
      if (!factKey) {
        continue;
      }

      const normalizedFactKey = normalizeEncounterKey(factKey);
      const hasPredictableOverride = predictableFactValues
        && Object.prototype.hasOwnProperty.call(predictableFactValues, normalizedFactKey);

      if (factKey.endsWith('_in_hub') || hasPredictableOverride) {
        let actualValue = 1.0;
        if (hasPredictableOverride) {
          actualValue = Number(predictableFactValues[normalizedFactKey]);
        } else if (!assumeCharactersInHubPresent) {
          continue;
        }

        const ok = testRequirementComparison(Number(factReq.Comparison), Number(actualValue), Number(factReq.CompareValue));
        if (!ok) {
          passes = false;
          break;
        }
      }
    }
    if (!passes) {
      continue;
    }

    if (component.MinDifficulty !== null && component.MinDifficulty !== undefined && difficulty < Number(component.MinDifficulty)) {
      passes = false;
    }
    if (passes && component.MaxDifficulty !== null && component.MaxDifficulty !== undefined && difficulty > Number(component.MaxDifficulty)) {
      passes = false;
    }
    if (!passes) {
      continue;
    }

    for (const rp of component.RunProgressRequirements) {
      if (runProgress < Number(rp.MinPercent)) {
        passes = false;
        break;
      }
      if (runProgress > Number(rp.MaxPercent)) {
        passes = false;
        break;
      }
      if (currentLevel < Number(rp.MinLevelsDone)) {
        passes = false;
        break;
      }
      if (currentLevel > Number(rp.MaxLevelsDone)) {
        passes = false;
        break;
      }
      if (levelsRemaining < Number(rp.MinLevelsRemaining)) {
        passes = false;
        break;
      }
      if (levelsRemaining > Number(rp.MaxLevelsRemaining)) {
        passes = false;
        break;
      }
    }

    if (passes) {
      return true;
    }
  }

  return false;
}

function normalizeGameplayVariableValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^(-|\+)?infinity$/i.test(text)) {
    return text.startsWith('-') ? -Infinity : Infinity;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDefaultGameplayVariableValue(variableType) {
  const variableTypeInt = Number(variableType);
  switch (variableTypeInt) {
    case 0:
      return 100;
    case 2:
      return 3;
    case 3:
      return 250;
    case 12:
      return 1;
    case 13:
      return 0;
    case 14:
      return 0;
    default:
      return null;
  }
}

function getGameplayVariableValue(variableCheckData, gameplayVariableValues) {
  const values = gameplayVariableValues || {};
  const candidates = [];

  const variableType = variableCheckData?.variableType;
  if (variableType !== undefined && variableType !== null) {
    candidates.push(`variabletype${Number(variableType)}`);
  }

  if (variableCheckData?.variableKey) {
    candidates.push(normalizeEncounterKey(variableCheckData.variableKey));
  }
  if (variableCheckData?.factKey) {
    candidates.push(normalizeEncounterKey(variableCheckData.factKey));
  }
  if (variableCheckData?.variableTypeName) {
    candidates.push(normalizeEncounterKey(variableCheckData.variableTypeName));
  }

  for (const key of candidates) {
    if (!key) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      const normalized = normalizeGameplayVariableValue(values[key]);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return getDefaultGameplayVariableValue(variableType);
}

function testGameplayRequirementPredictable(requirement, gameplayVariableValues, gameplayItemPathIdSet) {
  if (!requirement) {
    return true;
  }

  const className = String(requirement.ClassName || '');
  if (className === 'EncReq_ItemCheck') {
    const data = requirement.Data || {};
    const itemPathId = String(data.item?.m_PathID ?? data.itemPathId ?? '').trim();
    if (!itemPathId || itemPathId === '0') {
      return true;
    }

    const hasItem = gameplayItemPathIdSet ? gameplayItemPathIdSet.has(itemPathId) : false;
    const checkType = Number(data.checkType);

    // EncReq_ItemCheck.ItemCheckType: 0 => HasItem, 1 => DoesNotHaveItem.
    if (checkType === 0) {
      return hasItem;
    }
    if (checkType === 1) {
      return !hasItem;
    }

    return true;
  }

  if (className !== 'EncReq_VariableCheck') {
    return true;
  }

  const data = requirement.Data || {};
  const actual = getGameplayVariableValue(data, gameplayVariableValues);
  if (actual === null || actual === undefined) {
    return true;
  }

  const minValue = normalizeGameplayVariableValue(data.minValue);
  const maxValue = normalizeGameplayVariableValue(data.maxValue);

  if (minValue !== null && actual < minValue) {
    return false;
  }
  if (maxValue !== null && actual > maxValue) {
    return false;
  }

  return true;
}

function getEncounterCharacterCountsFactValues(characterEncounterCounts) {
  const captainCount = Number(characterEncounterCounts?.captain || 0);
  const heirCount = Number(characterEncounterCounts?.heir || 0);
  const wraithCount = Number(characterEncounterCounts?.wraith || 0);
  const researcherCount = Number(characterEncounterCounts?.researcher || 0);

  return {
    captainencounters: captainCount,
    captainencountercount: captainCount,
    captainencounterscount: captainCount,
    heirencounters: heirCount,
    heirencountercount: heirCount,
    heirencounterscount: heirCount,
    wraithencounters: wraithCount,
    wraithencountercount: wraithCount,
    wraithencounterscount: wraithCount,
    researcherencounters: researcherCount,
    researcherencountercount: researcherCount,
    researcherencounterscount: researcherCount,
  };
}

function updateCharacterEncounterCountsFromName(characterEncounterCounts, encounterName) {
  const token = normalizeEncounterKey(encounterName);
  if (!token) {
    return;
  }

  if (token.includes('captain')) {
    characterEncounterCounts.captain = Number(characterEncounterCounts.captain || 0) + 1;
  }
  if (token.includes('heir')) {
    characterEncounterCounts.heir = Number(characterEncounterCounts.heir || 0) + 1;
  }
  if (token.includes('wraith')) {
    characterEncounterCounts.wraith = Number(characterEncounterCounts.wraith || 0) + 1;
  }
  if (token.includes('researcher')) {
    characterEncounterCounts.researcher = Number(characterEncounterCounts.researcher || 0) + 1;
  }
}

function getForcedPathIdByProgress(arrObj, progress) {
  const arr = getArray(arrObj);
  if (arr.length === 0) {
    return 0;
  }
  const max = arr.length - 1;
  let idx = roundToEven(max * progress, 0);
  if (idx < 0) {
    idx = 0;
  }
  if (idx > max) {
    idx = max;
  }
  return Number(arr[idx].m_PathID);
}

function getForcedPropGroupPathIdByProgress(arrObj, progress) {
  const arr = getArray(arrObj);
  if (arr.length === 0) {
    return 0;
  }
  const max = arr.length - 1;
  let idx = roundToEven(max * progress, 0);
  if (idx < 0) {
    idx = 0;
  }
  if (idx > max) {
    idx = max;
  }
  return Number(arr[idx].propGroup.m_PathID);
}

function buildLevelAssemblerCandidates(effectiveCategories, targetBiomePathId) {
  const noiseIds = [];
  const propGroupIds = [];
  const genIds = [];
  let keyCount = 0;

  for (const cat of effectiveCategories) {
    if (!cat || !cat.biome) {
      continue;
    }

    const catBiomePath = Number(cat.biome.m_PathID);
    if (catBiomePath !== targetBiomePathId && catBiomePath !== 0) {
      continue;
    }

    for (const n of getArray(cat.noiseAdditions)) {
      noiseIds.push(Number(n.m_PathID));
    }
    for (const p of getArray(cat.addedProps)) {
      propGroupIds.push(Number(p.propGroup.m_PathID));
    }
    for (const g of getArray(cat.genObjects)) {
      genIds.push(Number(g.m_PathID));
    }

    keyCount += getArray(cat.keyPropPresets).length;
  }

  return {
    NoiseIds: noiseIds,
    PropGroupIds: propGroupIds,
    GenIds: genIds,
    KeyCount: keyCount,
  };
}

function getLevelAssemblerSelectionProbabilities(candidates) {
  const noiseCount = getArrayCount(candidates.NoiseIds);
  const genCount = getArrayCount(candidates.GenIds);
  const propCount = getArrayCount(candidates.PropGroupIds);
  const keyCount = Number(candidates.KeyCount);

  const total = noiseCount + genCount + propCount + keyCount;
  if (total <= 0) {
    return { Noise: 0, Prop: 0, Gen: 0 };
  }

  return {
    Noise: ratioToProbability(Math.fround(noiseCount / total)),
    Prop: ratioToProbability(Math.fround(propCount / total)),
    Gen: ratioToProbability(Math.fround(genCount / total)),
  };
}

function estimateLevelBudget(currentLevel, nodeType, run, biomeDifficulty, obstacleDifficultyMultiplier, extraLevelDifficulty, forcedKeyPropDifficulty) {
  const progress = getLevelProgress(currentLevel, Number(run.nrOfLevels));
  let difficultyFloat = Number(run.startDifficulty) + (Number(run.endDifficulty) - Number(run.startDifficulty)) * progress;
  if (nodeType === 'Challenge') {
    difficultyFloat += 5;
  }
  difficultyFloat += extraLevelDifficulty;
  const difficultyInt = roundToEven(difficultyFloat, 0);
  const budget = Math.ceil(difficultyInt * 0.8 * obstacleDifficultyMultiplier) - biomeDifficulty - forcedKeyPropDifficulty;
  return Number(budget);
}

function getGameObjectDifficulty(gameObjectStatsByPath, id) {
  const v = gameObjectStatsByPath.get(id);
  if (v && v.Difficulty !== null && v.Difficulty !== undefined) {
    return Number(v.Difficulty);
  }
  return 0;
}

function getGameObjectChance(gameObjectStatsByPath, id) {
  const v = gameObjectStatsByPath.get(id);
  if (v && v.Chance !== null && v.Chance !== undefined) {
    return Number(v.Chance);
  }
  return 1;
}

function simulateGetAdditionalProps(random, budget, propGroupIds, difficultyByPathId) {
  if (propGroupIds.length === 0) {
    return null;
  }

  let selected = null;
  let num = 10000;
  while (!selected && num > 0) {
    num -= 1;
    const pickId = Number(propGroupIds[random.next(0, propGroupIds.length)]);
    const difficulty = difficultyByPathId.get(pickId) ?? 0;

    if (difficulty <= budget) {
      let ratio = 0;
      if (budget === 0 && difficulty === 0) {
        ratio = Number.NaN;
      } else if (budget > 0) {
        ratio = Math.fround(difficulty / budget);
      }

      if (!(nextFloat(random) > ratio)) {
        selected = { Id: pickId, Difficulty: Number(difficulty) };
      }
    }
  }

  return selected;
}

function simulateGetAdditionalNoise(random, budget, noiseIds, gameObjectStatsByPath) {
  if (noiseIds.length === 0) {
    return null;
  }

  let selected = null;
  let num = 10000;
  while (!selected && num > 0) {
    num -= 1;
    const pickId = Number(noiseIds[random.next(0, noiseIds.length)]);
    const difficulty = getGameObjectDifficulty(gameObjectStatsByPath, pickId);

    if (difficulty <= budget) {
      let ratio = 0;
      if (budget === 0 && difficulty === 0) {
        ratio = Number.NaN;
      } else if (budget > 0) {
        ratio = Math.fround(difficulty / budget);
      }

      if (!(nextFloat(random) > ratio)) {
        selected = { Id: pickId, Difficulty: Number(difficulty), Chance: getGameObjectChance(gameObjectStatsByPath, pickId) };
      }
    }
  }

  const chanceRoll = rangeFloat(random, 0, 1);
  if (selected && Number(selected.Chance) < chanceRoll) {
    return null;
  }

  return selected;
}

function simulateGetGenObject(random, budget, genIds, gameObjectStatsByPath) {
  if (genIds.length === 0) {
    return null;
  }

  let selected = null;
  let num = 10000;
  while (!selected && num > 0) {
    num -= 1;
    const pickId = Number(genIds[random.next(0, genIds.length)]);
    const difficulty = getGameObjectDifficulty(gameObjectStatsByPath, pickId);

    if (difficulty <= budget) {
      let ratio = 0;
      if (budget === 0 && difficulty === 0) {
        ratio = Number.NaN;
      } else if (budget > 0) {
        ratio = Math.fround(difficulty / budget);
      }

      if (!(nextFloat(random) > ratio)) {
        selected = { Id: pickId, Difficulty: Number(difficulty) };
      }
    }
  }

  return selected;
}

function advanceRngForLevelAssemblerVariantCheck(random, noiseProb, propProb, genProb, hasBudget, budgetStart, forcedNoisePathId, forcedPropGroupPathId, forcedGenPathId, forcedKeyPropDifficulty, candidates, difficultyByPathId, gameObjectStatsByPath) {
  let budget = Number(budgetStart);
  if (forcedKeyPropDifficulty > 0) {
    budget -= Number(forcedKeyPropDifficulty);
  }

  let noiseGate = false;
  let propGate = false;
  let genGate = false;

  if (forcedNoisePathId !== 0) {
    budget -= getGameObjectDifficulty(gameObjectStatsByPath, forcedNoisePathId);
  } else {
    const noiseRoll = nextFloat(random);
    if (hasBudget && noiseProb > noiseRoll) {
      if (budget > 0) {
        const noiseBudget = random.next(0, budget);
        const noiseObj = simulateGetAdditionalNoise(random, noiseBudget, candidates.NoiseIds, gameObjectStatsByPath);
        if (noiseObj) {
          budget -= Number(noiseObj.Difficulty);
        }
      }
      noiseGate = true;
    }
  }

  if (forcedPropGroupPathId !== 0) {
    if (difficultyByPathId.has(forcedPropGroupPathId)) {
      budget -= Number(difficultyByPathId.get(forcedPropGroupPathId));
    }
  } else {
    const propRoll = nextFloat(random);
    if (hasBudget && propProb > propRoll) {
      if (budget > 0) {
        const propBudget = random.next(0, budget);
        const propObj = simulateGetAdditionalProps(random, propBudget, candidates.PropGroupIds, difficultyByPathId);
        if (propObj) {
          budget -= Number(propObj.Difficulty);
        }
      }
      propGate = true;
    }
  }

  if (forcedGenPathId !== 0) {
    budget -= getGameObjectDifficulty(gameObjectStatsByPath, forcedGenPathId);
  } else {
    const genRoll = nextFloat(random);
    if (hasBudget && Math.fround(genProb * 0.5) > genRoll) {
      if (budget > 0) {
        const genBudget = random.next(0, budget);
        const genObj = simulateGetGenObject(random, genBudget, candidates.GenIds, gameObjectStatsByPath);
        if (genObj) {
          budget -= Number(genObj.Difficulty);
        }
      }
      genGate = true;
    }
  }

  return {
    NoiseGate: noiseGate,
    PropGate: propGate,
    GenGate: genGate,
    BudgetNextCalls: (noiseGate ? 1 : 0) + (propGate ? 1 : 0) + (genGate ? 1 : 0),
  };
}

function getClosestNodes(nodes, targetPos) {
  return [...nodes].sort((a, b) => vecDistance(a.pos, targetPos) - vecDistance(b.pos, targetPos));
}

function isValidSpawnPosition(spawnPos, nodes) {
  for (const n of nodes) {
    if (vecDistance(n.pos, spawnPos) < 5.0) {
      return false;
    }
  }
  return true;
}

function wouldConvertingProduceDoubleNode(nodeId, targetType, nodeById, paths) {
  for (const p of paths) {
    let neighborId = null;
    if (Number(p.from) === nodeId) {
      neighborId = Number(p.to);
    } else if (Number(p.to) === nodeId) {
      neighborId = Number(p.from);
    }
    if (neighborId !== null && nodeById.get(neighborId).type === targetType) {
      return true;
    }
  }
  return false;
}

function countSpecialStreak(nodeId, forwards, nodeById, paths) {
  let best = 0;

  for (const p of paths) {
    let isMatch = false;
    let nextId = null;

    if (forwards && Number(p.from) === nodeId) {
      isMatch = true;
      nextId = Number(p.to);
    } else if (!forwards && Number(p.to) === nodeId) {
      isMatch = true;
      nextId = Number(p.from);
    }

    if (!isMatch) {
      continue;
    }

    const t = String(nodeById.get(nextId).type);
    if (t === 'Encounter' || t === 'Shop' || t === 'RestStop') {
      const candidate = countSpecialStreak(nextId, forwards, nodeById, paths) + 1;
      if (candidate > best) {
        best = candidate;
      }
    }
  }

  return best;
}

function convertingWouldProduceStreakOf(nodeId, nodeById, paths) {
  return countSpecialStreak(nodeId, true, nodeById, paths) + countSpecialStreak(nodeId, false, nodeById, paths) + 1;
}

function allowedToConvertNode(nodeId, targetType, nodeById, paths) {
  const node = nodeById.get(nodeId);
  if (String(node.type) !== 'Default') {
    return false;
  }
  if (wouldConvertingProduceDoubleNode(nodeId, targetType, nodeById, paths)) {
    return false;
  }
  if (targetType !== 'Challenge' && convertingWouldProduceStreakOf(nodeId, nodeById, paths) > 2) {
    return false;
  }
  if (targetType === 'Shop' && Number(node.depth) < 3) {
    return false;
  }
  return true;
}

function setPercentageRandomToType(targetType, percentage, nodes, nodeById, paths, random) {
  const numToSet = roundToEven(nodes.length * percentage, 0);
  for (let i = 0; i < numToSet; i += 1) {
    const candidates = nodes.slice(1).filter((n) => allowedToConvertNode(Number(n.id), targetType, nodeById, paths));
    if (candidates.length === 0) {
      break;
    }
    const pick = randomChoice(random, candidates);
    nodeById.get(Number(pick.id)).type = targetType;
  }
}

function makeShops(depth, nodes, nodeById, paths, random) {
  const depthTargets = [];
  for (let d = 3; d < depth; d += 4) {
    depthTargets.push(d);
  }
  depthTargets.push(depth);

  for (const depthValue of depthTargets) {
    const atDepth = nodes.filter((n) => Number(n.depth) === depthValue);
    if (atDepth.length === 0) {
      continue;
    }
    const mustShop = randomChoice(random, atDepth);

    for (const n of atDepth) {
      const allow = Number(n.id) === Number(mustShop.id) || nextFloat(random) > 0.5;
      if (allow && allowedToConvertNode(Number(n.id), 'Shop', nodeById, paths)) {
        nodeById.get(Number(n.id)).type = 'Shop';
      }
    }
  }
}

function generateMapGraph(seed, depth) {
  const random = new DotNetRandom(seed);
  const nodes = [];
  const paths = [];
  const nodeById = new Map();

  function spawnNode(pos, d, type) {
    const id = nodes.length;
    const node = {
      id,
      depth: d,
      currentLevel: d,
      type,
      pos,
    };
    nodes.push(node);
    nodeById.set(id, node);
    return node;
  }

  spawnNode(newVec(0, 10, 0), 0, 'Default');

  for (let i = 1; i <= depth; i += 1) {
    const count = random.next(2, 4);
    for (let j = 0; j < count; j += 1) {
      for (let k = 0; k < 15; k += 1) {
        const pos = newVec(rangeFloat(random, -20, 20), 10, rangeFloat(random, 0, 2) + i * 7);
        if (isValidSpawnPosition(pos, nodes)) {
          spawnNode(pos, i, 'Default');
          break;
        }
      }
    }
  }

  const start = nodeById.get(0);
  const depth1 = nodes.filter((n) => Number(n.depth) === 1);
  for (const n of depth1) {
    addPath(paths, Number(start.id), Number(n.id));
  }

  for (let d = 1; d < depth; d += 1) {
    const fromDepth = nodes.filter((n) => Number(n.depth) === d);
    const toDepth = nodes.filter((n) => Number(n.depth) === d + 1);

    for (const fromNode of fromDepth) {
      const sorted = getClosestNodes(toDepth, fromNode.pos);
      let connected = false;
      for (const toNode of sorted) {
        if (!doesPathIntersect(fromNode, toNode, paths, nodeById)) {
          addPath(paths, Number(fromNode.id), Number(toNode.id));
          connected = true;
          break;
        }
      }
      if (!connected) {
        addRandomUniquePath(random, paths, Number(fromNode.id), toDepth);
      }
    }

    const connectedToSet = new Set();
    for (const p of paths) {
      if (Number(nodeById.get(Number(p.to)).depth) === d + 1) {
        connectedToSet.add(Number(p.to));
      }
    }

    const unconnected = toDepth.filter((n) => !connectedToSet.has(Number(n.id)));
    for (const uc of unconnected) {
      const sortedPrev = getClosestNodes(fromDepth, uc.pos);
      let linked = false;
      for (const prev of sortedPrev) {
        if (!doesPathIntersect(prev, uc, paths, nodeById)) {
          addPath(paths, Number(prev.id), Number(uc.id));
          linked = true;
          break;
        }
      }
      if (!linked) {
        const pickFrom = randomChoice(random, fromDepth);
        if (pickFrom) {
          addPath(paths, Number(pickFrom.id), Number(uc.id));
        }
      }
    }

    for (const fromNode of fromDepth) {
      if (nextFloat(random) < 0.25) {
        const sortedDesc = getClosestNodes(toDepth, fromNode.pos).sort((a, b) => vecDistance(b.pos, fromNode.pos) - vecDistance(a.pos, fromNode.pos));
        for (const toNode of sortedDesc) {
          if (!doesPathIntersect(fromNode, toNode, paths, nodeById)) {
            addPath(paths, Number(fromNode.id), Number(toNode.id));
            break;
          }
        }
      }
    }
  }

  const maxZ = nodes.slice().sort((a, b) => Number(a.pos.z) - Number(b.pos.z))[nodes.length - 1].pos.z;
  const boss = spawnNode(newVec(0, 10, maxZ + 15), depth + 1, 'Boss');
  const lastDepthNodes = nodes.filter((n) => Number(n.depth) === depth);
  for (const n of lastDepthNodes) {
    addPath(paths, Number(n.id), Number(boss.id));
  }

  makeShops(depth, nodes, nodeById, paths, random);
  setPercentageRandomToType('Challenge', 0.07, nodes, nodeById, paths, random);
  setPercentageRandomToType('Encounter', 0.1, nodes, nodeById, paths, random);
  setPercentageRandomToType('RestStop', 0.07, nodes, nodeById, paths, random);
  setPercentageRandomToType('Shop', 0.02, nodes, nodeById, paths, random);

  for (let iter = 0; iter < 10; iter += 1) {
    for (const p of paths) {
      const from = nodeById.get(Number(p.from));
      const to = nodeById.get(Number(p.to));
      const vx = Number(from.pos.x) - Number(to.pos.x);

      if (Number(from.depth) > 0) {
        from.pos.x += -1.0 * vx * 0.03;
      }
      if (Number(to.depth) > 0) {
        to.pos.x -= -1.0 * vx * 0.03;
      }

      const sameDepth = nodes.filter((n) => Number(n.depth) === Number(from.depth));
      for (const other of sameDepth) {
        if (Number(other.id) === Number(from.id)) {
          continue;
        }
        const deltaX = Number(other.pos.x) - Number(from.pos.x);
        const num3 = -1.0 * Math.sign(deltaX);
        const value = Math.abs(deltaX);
        const num5 = inverseLerp(10.0, 0.0, value);
        from.pos.x += num5 * num3 * 10.0 * 0.25;
      }
    }
  }

  const outgoingById = new Map();
  for (const n of nodes) {
    outgoingById.set(Number(n.id), []);
  }
  for (const p of paths) {
    outgoingById.get(Number(p.from)).push(Number(p.to));
  }

  return {
    nodes,
    paths,
    nodeById,
    outgoingById,
  };
}

function chooseWeightedFragmentModifier(rng, setEntries, excludedPathIds) {
  const entries = [];
  for (const e of setEntries) {
    const modPathId = Number(e.FragmentModifier.m_PathID);
    if (excludedPathIds.has(modPathId)) {
      continue;
    }
    entries.push({ PathID: modPathId, Weight: Number(e.Weight) });
  }

  if (entries.length === 0) {
    return null;
  }

  let sum = 0;
  for (const e of entries) {
    sum += Number(e.Weight);
  }
  if (sum <= 0) {
    return null;
  }

  const roll = rng.next(0, sum);
  let acc = 0;
  for (const e of entries) {
    acc += Number(e.Weight);
    if (roll < acc) {
      return e;
    }
  }
  return entries[0];
}

class PredictorDataStore {
  constructor(packedData) {
    this.initialized = false;
    this.loadFromPackedData(packedData);
  }

  loadFromPackedData(packedData) {
    const data = packedData || {};

    this.runConfigs = [];
    this.runByName = new Map();
    for (const row of getArray(data.runConfigs)) {
      const name = String(row.name ?? row.run?.m_Name ?? '');
      const run = row.run ?? null;
      const pathId = Number(row.pathId ?? 0);
      if (!name || !run) {
        continue;
      }
      this.runConfigs.push({ name, run, pathId });
      this.runByName.set(name, { run, pathId });
    }

    this.levelByPath = new Map();
    this.levelByName = new Map();
    for (const row of getArray(data.levels)) {
      const pathId = Number(row.pathId ?? 0);
      const level = row.level ?? null;
      if (!pathId || !level) {
        continue;
      }
      this.levelByPath.set(pathId, level);
      this.levelByName.set(String(level.m_Name ?? ''), level);
    }

    this.biomeByPath = new Map();
    for (const row of getArray(data.biomes)) {
      const pathId = Number(row.pathId ?? 0);
      if (!pathId) {
        continue;
      }
      this.biomeByPath.set(pathId, {
        BiomeIdentifier: Number(row.biomeIdentifier ?? 0),
        Difficulty: Number(row.difficulty ?? 0),
        Name: String(row.name ?? ''),
        MainBiomePathID: Number(row.mainBiomePathId ?? 0),
        CliffBiomePathID: Number(row.cliffBiomePathId ?? 0),
      });
    }

    this.biomeAssetNameByPath = new Map();
    for (const row of getArray(data.biomeAssetNames)) {
      this.biomeAssetNameByPath.set(Number(row.pathId ?? 0), String(row.name ?? ''));
    }

    this.fragmentSetByPath = new Map();
    for (const row of getArray(data.fragmentSets)) {
      this.fragmentSetByPath.set(Number(row.pathId ?? 0), row.fragmentSet ?? null);
    }

    this.fragmentModifierByPath = new Map();
    for (const row of getArray(data.fragmentModifiers)) {
      const pathId = Number(row.pathId ?? 0);
      this.fragmentModifierByPath.set(pathId, {
        PathID: pathId,
        Name: String(row.name ?? ''),
        ID: String(row.id ?? ''),
        IncompatiblePathIDs: getArray(row.incompatiblePathIds).map((x) => Number(x)),
      });
    }

    this.difficultyByPathId = new Map();
    for (const row of getArray(data.difficultyByPathId)) {
      this.difficultyByPathId.set(Number(row.pathId), Number(row.difficulty));
    }

    this.gameObjectStatsByPath = new Map();
    for (const row of getArray(data.gameObjectStatsByPath)) {
      this.gameObjectStatsByPath.set(Number(row.pathId), {
        Difficulty: row.difficulty === null || row.difficulty === undefined ? null : Number(row.difficulty),
        Chance: row.chance === null || row.chance === undefined ? null : Number(row.chance),
      });
    }

    this.encounterPools = {
      Normal: [],
      Challenge: [],
    };
    this.encounterGuidToName = new Map();

    for (const row of getArray(data.encounterPools?.normal)) {
      const guid = String(row.guid ?? row ?? '');
      const fileId = String(row.fileId ?? '0');
      if (!guid) {
        continue;
      }
      this.encounterPools.Normal.push({ Key: `${fileId}|${guid}`, Guid: guid, FileID: fileId });
      if (row.name) {
        this.encounterGuidToName.set(guid, String(row.name));
      }
    }

    for (const row of getArray(data.encounterPools?.challenge)) {
      const guid = String(row.guid ?? row ?? '');
      const fileId = String(row.fileId ?? '0');
      if (!guid) {
        continue;
      }
      this.encounterPools.Challenge.push({ Key: `${fileId}|${guid}`, Guid: guid, FileID: fileId });
      if (row.name) {
        this.encounterGuidToName.set(guid, String(row.name));
      }
    }

    for (const row of getArray(data.encounterGuidToName)) {
      if (row.guid && row.name) {
        this.encounterGuidToName.set(String(row.guid), String(row.name));
      }
    }

    this.encounterRequirementRulesByAlias = new Map();
    for (const row of getArray(data.encounterRequirementRules)) {
      if (!row || !row.alias || !row.rule) {
        continue;
      }
      this.encounterRequirementRulesByAlias.set(String(row.alias), row.rule);
    }

    this.encounterRewardItemsByAlias = new Map();
    for (const row of getArray(data.encounterRewards)) {
      if (!row) {
        continue;
      }

      const aliasSource = row.alias ?? row.encounterAlias ?? row.encounterId ?? row.encounterName ?? '';
      const alias = normalizeEncounterKey(aliasSource);
      if (!alias) {
        continue;
      }

      let itemList = [];
      if (Array.isArray(row.items)) {
        itemList = row.items.map((x) => String(x || '').trim()).filter(Boolean);
      } else if (Array.isArray(row.rewardItems)) {
        itemList = row.rewardItems.map((x) => String(x || '').trim()).filter(Boolean);
      } else if (Array.isArray(row.itemNames)) {
        itemList = row.itemNames.map((x) => String(x || '').trim()).filter(Boolean);
      }

      if (itemList.length > 0) {
        this.encounterRewardItemsByAlias.set(alias, itemList);
      }
    }

    this.shopItems = [];
    this.itemEffectSummaryByName = new Map();
    for (const row of getArray(data.itemInstances)) {
      const itemName = String(row.itemName ?? '');
      if (!itemName) {
        continue;
      }

      const itemDisplayName = String(row.itemDisplayName ?? '').trim();
      const itemEffectSummary = String(row.itemEffectSummary ?? '').trim();
      if (itemEffectSummary) {
        this.itemEffectSummaryByName.set(normalizeKey(itemName), itemEffectSummary);
        if (itemDisplayName) {
          this.itemEffectSummaryByName.set(normalizeKey(itemDisplayName), itemEffectSummary);
        }
      }

      this.shopItems.push({
        pathId: Number(row.pathId ?? 0),
        itemName,
        itemDisplayName,
        itemEffectSummary,
        minorItem: Boolean(row.minorItem),
        specialItem: Boolean(row.specialItem),
        rarity: Number(row.rarity ?? 0),
        costMultiplier: Number(row.costMultiplier ?? 1),
      });
    }

    const shopItemDatabase = data.itemDatabase ?? {};
    this.shopItemDatabase = {
      equalProbabilityPoint: Number(shopItemDatabase.equalProbabilityPoint ?? 1),
      legendaryProbabilityPenalty: Number(shopItemDatabase.legendaryProbabilityPenalty ?? 0),
      defaultUnlockedItemPathIds: getArray(shopItemDatabase.defaultUnlockedItemPathIds).map((x) => String(x)).filter((x) => x && x !== '0'),
      defaultUnlockedItemGuids: getArray(shopItemDatabase.defaultUnlockedItemGuids).map((x) => String(x)),
    };

    this.shopMajorItems = this.shopItems.filter((x) => !x.minorItem && !x.specialItem);
    this.shopDataAvailable = this.shopMajorItems.length > 0;

    this.etherealLevel = this.levelByName.get('Ethereal') ?? null;
    this.initialized = true;
  }

  ensureLoaded() {
    if (this.initialized) {
      return;
    }
    throw new Error('Predictor data store is not initialized from bundled data.');
  }

  getRunConfigNameOptions() {
    return this.runConfigs.map((x) => x.name).sort();
  }

  resolveRun(runConfigName) {
    return this.runByName.get(runConfigName) ?? null;
  }
}

function predictRun(dataStore, options) {
  dataStore.ensureLoaded();

  const {
    runConfigName,
    seed,
    shopRerollByNodeId = {},
    fragmentModifierFrequencyDifficulty = 1.0,
    itemRarityDifficulty = 1.0,
    playerItemRarityBonus = 0,
    challengeCompletionTier = 'S',
    obstacleDifficulty = 1.0,
    extraLevelDifficulty = 0,
    assumeCharactersInHubPresent = true,
    ignoreCharacterEncounterFactChecks = false,
    predictableFactValues = null,
    gameplayVariableValues = null,
    gameplayItemPathIds = null,
    encounterHistoryNodeIds = null,
  } = options;
  const gameplayItemPathIdSet = gameplayItemPathIds && Array.isArray(gameplayItemPathIds)
    ? new Set(gameplayItemPathIds.map((x) => String(x).trim()).filter((x) => x && x !== '0'))
    : null;

  const encounterHistoryNodeIdSet = encounterHistoryNodeIds && Array.isArray(encounterHistoryNodeIds)
    ? new Set(encounterHistoryNodeIds.map((x) => Number(x)))
    : null;

  const runEntry = dataStore.resolveRun(runConfigName);
  if (!runEntry) {
    throw new Error(`RunConfig '${runConfigName}' not found.`);
  }

  const run = runEntry.run;
  const runId = runEntry.pathId;

  const depth = Number(run.nrOfLevels);
  const graph = generateMapGraph(seed, depth);
  const nodes = graph.nodes;
  const outgoingById = graph.outgoingById;

  const categoryIds = getArray(run.categories).map((x) => Number(x.m_PathID));
  const overrideIds = getArray(run.overRideLevelConfigs).map((x) => Number(x.m_PathID));

  const fragmentSetPath = Number(run.FragmentModifierSet?.m_PathID ?? 0);
  const fragmentSet = dataStore.fragmentSetByPath.get(fragmentSetPath) ?? null;

  const playedEncounterKeys = [];
  const characterEncounterCounts = {
    captain: 0,
    heir: 0,
    wraith: 0,
    researcher: 0,
  };
  const rows = [];
  const challengeTierItemMultiplier = getChallengeTierItemMultiplier(challengeCompletionTier);
  const safeShopRerollByNodeId = Object.fromEntries(
    Object.entries(shopRerollByNodeId || {}).map(([k, v]) => [
      String(k),
      Math.max(0, Math.floor(Number(v) || 0)),
    ])
  );

  for (const node of [...nodes].sort((a, b) => Number(a.id) - Number(b.id))) {
    const nodeId = Number(node.id);
    const nodeType = String(node.type);
    const currentLevel = Number(node.currentLevel);
    const outgoing = outgoingById.get(nodeId) ?? [];
    const levelSeed = seed + nodeId;

    let overrideChance = '';
    let overrideRoll = '';
    let overrideTriggered = '';
    let selectedOverrideName = '';
    let selectedOverridePathID = '';
    let chosenCategoryName = '';
    let chosenCategoryPathID = '';
    let baseBiomePathID = '';
    let baseBiomeIdentifier = '';
    let baseBiomeIdentifierName = '';
    let probabilityOfVariation = '';
    let variantCount = '';
    let canHaveVariants = '';
    let variantRoll = '';
    let variantTriggered = '';
    let selectedVariantBiomePathID = '';
    let selectedVariantBiomeName = '';
    let selectedVariantBiomeIdentifier = '';
    let selectedVariantBiomeIdentifierName = '';
    let predictedEncounterType = '';
    let predictedEncounterGuid = '';
    let predictedEncounterName = '';
    let encounterChallengeChance = '';
    let encounterChallengeRoll = '';
    let predictedEncounterItems = [];
    let predictedEncounterItemsSummary = '';
    let predictedEncounterEffectSummary = '';
    let predictedShopItems = [];
    let predictedShopItemsSummary = '';
    let predictedChallengeItems = [];
    let predictedChallengeItemsSummary = '';
    let predictedRestStopItems = [];
    let predictedRestStopItemsSummary = '';
    let predictedFragmentOfferItems = [];
    let predictedFragmentOfferItemsSummary = '';

    if (nodeType === 'Default') {
      let progress = 0;
      if (Number(run.nrOfLevels) > 1) {
        progress = Math.max(0, Math.min(1, currentLevel / (Number(run.nrOfLevels) - 1)));
      }

      const overrideChanceValue = evaluateCurveApprox(getArray(run.overRideLevelConfigChance?.m_Curve), progress);
      overrideChance = toRounded(overrideChanceValue, 6);

      const rngOverrideRoll = new DotNetRandom(levelSeed);
      const overrideRollValue = rngOverrideRoll.nextDouble();
      overrideRoll = toRounded(overrideRollValue, 6);

      const triggered = overrideIds.length > 0 && overrideRollValue <= overrideChanceValue;
      overrideTriggered = triggered;

      let overrideLevel = null;
      if (triggered) {
        const rngOverridePick = new DotNetRandom(levelSeed);
        const pickedId = Number(overrideIds[rngOverridePick.next(0, overrideIds.length)]);
        selectedOverridePathID = pickedId;
        if (dataStore.levelByPath.has(pickedId)) {
          overrideLevel = dataStore.levelByPath.get(pickedId);
          selectedOverrideName = String(overrideLevel.m_Name ?? '');
        }
      }

      const effectiveCategories = [];
      for (const cid of categoryIds) {
        if (!dataStore.levelByPath.has(cid)) {
          continue;
        }
        const cat = dataStore.levelByPath.get(cid);
        if (cat.mainConfig && overrideLevel) {
          effectiveCategories.push(overrideLevel);
        } else {
          effectiveCategories.push(cat);
        }
      }

      const biomeChoices = [];
      for (const cid of categoryIds) {
        if (!dataStore.levelByPath.has(cid)) {
          continue;
        }
        const cat = dataStore.levelByPath.get(cid);
        if (cat.mainConfig && overrideLevel) {
          if (Number(overrideLevel.biome?.m_PathID ?? 0) !== 0) {
            biomeChoices.push({
              CategoryPathID: Number(selectedOverridePathID),
              CategoryName: String(overrideLevel.m_Name ?? ''),
              Level: overrideLevel,
            });
          }
        } else if (Number(cat.biome?.m_PathID ?? 0) !== 0) {
          biomeChoices.push({
            CategoryPathID: Number(cid),
            CategoryName: String(cat.m_Name ?? ''),
            Level: cat,
          });
        }
      }

      if (biomeChoices.length > 0) {
        const rngBiomePick = new DotNetRandom(levelSeed);
        const pick = biomeChoices[rngBiomePick.next(0, biomeChoices.length)];
        chosenCategoryPathID = pick.CategoryPathID;
        chosenCategoryName = pick.CategoryName;

        baseBiomePathID = Number(pick.Level.biome.m_PathID);
        const assemblerCandidates = buildLevelAssemblerCandidates(effectiveCategories, baseBiomePathID);
        const assemblerSelection = getLevelAssemblerSelectionProbabilities(assemblerCandidates);

        if (dataStore.biomeByPath.has(baseBiomePathID)) {
          baseBiomeIdentifier = Number(dataStore.biomeByPath.get(baseBiomePathID).BiomeIdentifier);
          baseBiomeIdentifierName = resolveBiomeIdentifierName(baseBiomeIdentifier);
        }

        probabilityOfVariation = Number(pick.Level.probabilityOfVariation ?? 0);
        variantCount = getArray(pick.Level.biomeVariants).length;
        canHaveVariants = variantCount > 0 && Number(probabilityOfVariation) > 0 && Number(run.bossTeir) !== 0;

        if (canHaveVariants) {
          const rngVariant = new DotNetRandom(levelSeed);
          const noiseP = Number(assemblerSelection?.Noise ?? 0);
          const propP = Number(assemblerSelection?.Prop ?? 0);
          const genP = Number(assemblerSelection?.Gen ?? 0);

          const progressForForced = getLevelProgress(currentLevel, Number(run.nrOfLevels));
          const forcedNoisePathId = getForcedPathIdByProgress(run.noiseAdditions, progressForForced);
          const forcedPropGroupPathId = getForcedPropGroupPathIdByProgress(run.propAdditions, progressForForced);
          const forcedGenPathId = getForcedPathIdByProgress(run.genObjects, progressForForced);
          const forcedKeyPropDifficulty = 0;

          let biomeDifficulty = 0;
          if (dataStore.biomeByPath.has(baseBiomePathID)) {
            biomeDifficulty = Number(dataStore.biomeByPath.get(baseBiomePathID).Difficulty);
          }

          const startBudget = estimateLevelBudget(
            currentLevel,
            nodeType,
            run,
            biomeDifficulty,
            obstacleDifficulty,
            extraLevelDifficulty,
            forcedKeyPropDifficulty
          );

          advanceRngForLevelAssemblerVariantCheck(
            rngVariant,
            noiseP,
            propP,
            genP,
            true,
            startBudget,
            forcedNoisePathId,
            forcedPropGroupPathId,
            forcedGenPathId,
            forcedKeyPropDifficulty,
            assemblerCandidates,
            dataStore.difficultyByPathId,
            dataStore.gameObjectStatsByPath
          );

          const variantRollValue = nextFloat(rngVariant);
          variantRoll = toRounded(variantRollValue, 6);
          const didVariantTrigger = variantRollValue < Number(probabilityOfVariation);
          variantTriggered = didVariantTrigger;

          if (didVariantTrigger) {
            const variantPathId = chooseWeightedBiomeVariant(rngVariant, getArray(pick.Level.biomeVariants));
            if (variantPathId && variantPathId !== 0) {
              selectedVariantBiomePathID = Number(variantPathId);
              if (dataStore.biomeByPath.has(selectedVariantBiomePathID)) {
                const variantBiomeObj = dataStore.biomeByPath.get(selectedVariantBiomePathID);
                if (Number(variantBiomeObj.MainBiomePathID) !== 0) {
                  selectedVariantBiomeName = resolveBiomeAssetName(dataStore.biomeAssetNameByPath, Number(variantBiomeObj.MainBiomePathID));
                } else if (variantBiomeObj.Name) {
                  selectedVariantBiomeName = String(variantBiomeObj.Name);
                } else {
                  selectedVariantBiomeName = `PathID_${selectedVariantBiomePathID}`;
                }
                selectedVariantBiomeIdentifier = Number(variantBiomeObj.BiomeIdentifier);
                selectedVariantBiomeIdentifierName = resolveBiomeIdentifierName(selectedVariantBiomeIdentifier);
              } else {
                selectedVariantBiomeName = `PathID_${selectedVariantBiomePathID}`;
              }
            }
          }
        }
      }
    } else if (nodeType === 'Challenge') {
      const etherealLevel = dataStore.etherealLevel;
      if (etherealLevel && Number(etherealLevel.biome?.m_PathID ?? 0) !== 0) {
        chosenCategoryName = String(etherealLevel.m_Name ?? '');
        baseBiomePathID = Number(etherealLevel.biome.m_PathID);

        if (dataStore.biomeByPath.has(baseBiomePathID)) {
          baseBiomeIdentifier = Number(dataStore.biomeByPath.get(baseBiomePathID).BiomeIdentifier);
          baseBiomeIdentifierName = resolveBiomeIdentifierName(baseBiomeIdentifier);
        }

        probabilityOfVariation = Number(etherealLevel.probabilityOfVariation ?? 0);
        variantCount = getArray(etherealLevel.biomeVariants).length;
        canHaveVariants = variantCount > 0 && Number(probabilityOfVariation) > 0 && Number(run.bossTeir) !== 0;

        if (canHaveVariants) {
          const rngVariant = new DotNetRandom(levelSeed);
          const dummyCandidates = { NoiseIds: [], PropGroupIds: [], GenIds: [], KeyCount: 0 };

          advanceRngForLevelAssemblerVariantCheck(
            rngVariant,
            0,
            0,
            0,
            true,
            0,
            0,
            0,
            0,
            0,
            dummyCandidates,
            dataStore.difficultyByPathId,
            dataStore.gameObjectStatsByPath
          );

          const variantRollValue = nextFloat(rngVariant);
          variantRoll = toRounded(variantRollValue, 6);
          const didVariantTrigger = variantRollValue < Number(probabilityOfVariation);
          variantTriggered = didVariantTrigger;

          if (didVariantTrigger) {
            const variantPathId = chooseWeightedBiomeVariant(rngVariant, getArray(etherealLevel.biomeVariants));
            if (variantPathId && variantPathId !== 0) {
              selectedVariantBiomePathID = Number(variantPathId);
              if (dataStore.biomeByPath.has(selectedVariantBiomePathID)) {
                const variantBiomeObj = dataStore.biomeByPath.get(selectedVariantBiomePathID);
                if (Number(variantBiomeObj.MainBiomePathID) !== 0) {
                  selectedVariantBiomeName = resolveBiomeAssetName(dataStore.biomeAssetNameByPath, Number(variantBiomeObj.MainBiomePathID));
                } else if (variantBiomeObj.Name) {
                  selectedVariantBiomeName = String(variantBiomeObj.Name);
                } else {
                  selectedVariantBiomeName = `PathID_${selectedVariantBiomePathID}`;
                }
                selectedVariantBiomeIdentifier = Number(variantBiomeObj.BiomeIdentifier);
                selectedVariantBiomeIdentifierName = resolveBiomeIdentifierName(selectedVariantBiomeIdentifier);
              } else {
                selectedVariantBiomeName = `PathID_${selectedVariantBiomePathID}`;
              }
            }
          }
        }
      }
    }

    if (nodeType === 'Encounter') {
      const encRng = new DotNetRandom(levelSeed);
      const challengeChance = playedEncounterKeys.length === 0 ? 0.5 : 0.15;
      encounterChallengeChance = toRounded(challengeChance, 6);
      const challengeRoll = nextFloat(encRng);
      encounterChallengeRoll = toRounded(challengeRoll, 6);
      const isChallengeEncounter = challengeRoll < challengeChance;
      predictedEncounterType = isChallengeEncounter ? 'ChallengeEncounter' : 'Encounter';

      const pool = isChallengeEncounter ? [...dataStore.encounterPools.Challenge] : [...dataStore.encounterPools.Normal];
      if (pool.length > 0) {
        let available = pool.filter((x) => !playedEncounterKeys.includes(String(x.Key)));
        if (available.length === 0) {
          available = pool;
        }

        if (dataStore.encounterRequirementRulesByAlias.size > 0) {
          const difficultyAtEncounter = estimateEncounterDifficulty(currentLevel, run, extraLevelDifficulty);
          const filtered = [];

          for (const candidate of available) {
            const candidateGuid = String(candidate.Guid);
            let candidateName = '';
            if (dataStore.encounterGuidToName.has(candidateGuid)) {
              candidateName = String(dataStore.encounterGuidToName.get(candidateGuid));
            }
            const aliases = getEncounterAliases(candidateName);
            const ruleAlias = aliases.find((alias) => dataStore.encounterRequirementRulesByAlias.has(alias)) || '';
            if (!ruleAlias) {
              filtered.push(candidate);
              continue;
            }

            const rule = dataStore.encounterRequirementRulesByAlias.get(ruleAlias);
            const effectivePredictableFactValues = {
              ...(predictableFactValues || {}),
              ...(ignoreCharacterEncounterFactChecks ? {} : getEncounterCharacterCountsFactValues(characterEncounterCounts)),
            };

            const passesRule = testEncounterRulePredictable(
              rule,
              difficultyAtEncounter,
              currentLevel,
              Number(run.nrOfLevels),
              assumeCharactersInHubPresent,
              effectivePredictableFactValues
            );

            if (!passesRule) {
              continue;
            }

            const components = Array.isArray(rule.Components) ? rule.Components : [];
            let passesGameplayRequirements = false;
            for (const component of components) {
              let componentPasses = true;
              for (const requirement of getArray(component.GameplayRequirements)) {
                if (!testGameplayRequirementPredictable(requirement, gameplayVariableValues, gameplayItemPathIdSet)) {
                  componentPasses = false;
                  break;
                }
              }

              if (componentPasses) {
                passesGameplayRequirements = true;
                break;
              }
            }

            if (passesGameplayRequirements || components.length === 0) {
              filtered.push(candidate);
            }
          }

          if (filtered.length > 0) {
            available = filtered;
          }
        }

        const pickedRef = available[encRng.next(0, available.length)];
        const pickedGuid = String(pickedRef.Guid);
        predictedEncounterGuid = pickedGuid;
        predictedEncounterName = dataStore.encounterGuidToName.has(pickedGuid)
          ? String(dataStore.encounterGuidToName.get(pickedGuid))
          : pickedGuid;

        if (!isChallengeEncounter && dataStore.encounterRewardItemsByAlias && dataStore.encounterRewardItemsByAlias.size > 0) {
          const encounterAlias = normalizeEncounterKey(predictedEncounterName);
          const rewardItems = dataStore.encounterRewardItemsByAlias.get(encounterAlias) || [];
          if (rewardItems.length > 0) {
            predictedEncounterItems = rewardItems;
            predictedEncounterItemsSummary = rewardItems.join(' | ');

            const rewardEffects = [];
            const seenEffects = new Set();
            for (const rewardItem of rewardItems) {
              const effect = String(dataStore.itemEffectSummaryByName.get(normalizeKey(rewardItem)) || '').trim();
              if (!effect || seenEffects.has(effect)) {
                continue;
              }
              seenEffects.add(effect);
              rewardEffects.push(effect);
            }

            if (rewardEffects.length > 0) {
              predictedEncounterEffectSummary = rewardEffects.join(' | ');
            }
          }
        }

        if (pickedRef.Key && (!encounterHistoryNodeIdSet || encounterHistoryNodeIdSet.has(nodeId))) {
          playedEncounterKeys.push(String(pickedRef.Key));
          updateCharacterEncounterCountsFromName(characterEncounterCounts, predictedEncounterName);
        }
      }
    }

    if (nodeType === 'Shop' && dataStore.shopDataAvailable) {
      const extraRarityWeight = getShopItemRarityModifier(run, currentLevel, extraLevelDifficulty);
      const safeShopRerollIndex = safeShopRerollByNodeId[String(nodeId)] || 0;
      predictedShopItems = rollRandomMajorItemsForNode(
        dataStore,
        levelSeed,
        safeShopRerollIndex,
        3,
        extraRarityWeight,
        itemRarityDifficulty,
        playerItemRarityBonus,
        true
      );

      predictedShopItemsSummary = predictedShopItems.join(' | ');
    }

    if (nodeType === 'RestStop' && dataStore.shopDataAvailable) {
      const restStopExtraRarityWeight = getShopItemRarityModifier(run, currentLevel, extraLevelDifficulty);
      // Matches UI_ItemOffer: GetCurrentLevelRandomInstance(1) and one Major item offer.
      predictedRestStopItems = rollRandomMajorItemsForNode(
        dataStore,
        levelSeed,
        1,
        1,
        restStopExtraRarityWeight,
        itemRarityDifficulty,
        playerItemRarityBonus,
        true
      );
      predictedRestStopItemsSummary = predictedRestStopItems.join(' | ');
    }

    let fragPrimaryName = '';
    let fragPrimaryID = '';
    let fragSecondaryName = '';
    let fragSecondaryID = '';
    const selectedFragmentModifiers = [];

    const canHaveFragmentModifiers = !['Shop', 'Boss', 'RestStop', 'Encounter'].includes(nodeType) && currentLevel >= 1;
    if (canHaveFragmentModifiers && fragmentSet) {
      const fragRng = new DotNetRandom(levelSeed);
      const fragmentFrequency = Number(fragmentModifierFrequencyDifficulty);

      let numModifiers = 0;
      if (nextFloat(fragRng) < Math.fround(Number(run.FragmentModifierBaseChance) * fragmentFrequency)) {
        numModifiers = 1;
        if (nextFloat(fragRng) < Math.fround(Number(run.FragmentModifierSecondaryChance) * fragmentFrequency)) {
          numModifiers = 2;
        }
      }

      const setEntries = getArray(fragmentSet.FragmentModifiers);
      if (numModifiers > 0 && setEntries.length > 0) {
        const excluded = new Set();
        const entry1 = chooseWeightedFragmentModifier(fragRng, setEntries, excluded);
        if (entry1) {
          const primaryPathId = Number(entry1.PathID);
          if (dataStore.fragmentModifierByPath.has(primaryPathId)) {
            const m = dataStore.fragmentModifierByPath.get(primaryPathId);
            fragPrimaryName = m.Name;
            fragPrimaryID = m.ID;
            selectedFragmentModifiers.push({ Name: m.Name, ID: m.ID });
            for (const inc of m.IncompatiblePathIDs) {
              excluded.add(Number(inc));
            }
          } else {
            fragPrimaryName = `PathID_${primaryPathId}`;
          }
        }

        if (numModifiers > 1) {
          const entry2 = chooseWeightedFragmentModifier(fragRng, setEntries, excluded);
          if (entry2) {
            const secondaryPathId = Number(entry2.PathID);
            if (dataStore.fragmentModifierByPath.has(secondaryPathId)) {
              const m2 = dataStore.fragmentModifierByPath.get(secondaryPathId);
              fragSecondaryName = m2.Name;
              fragSecondaryID = m2.ID;
              selectedFragmentModifiers.push({ Name: m2.Name, ID: m2.ID });
            } else {
              fragSecondaryName = `PathID_${secondaryPathId}`;
            }
          }
        }
      }
    }

    if (nodeType === 'Challenge' && dataStore.shopDataAvailable) {
      const challengeShopRarityModifier = getShopItemRarityModifier(run, currentLevel, extraLevelDifficulty);
      const challengeExtraRarityWeight = lerp(0.1, 1, challengeShopRarityModifier * challengeTierItemMultiplier);
      predictedChallengeItems = rollRandomMajorItemsForNode(
        dataStore,
        levelSeed,
        0,
        3,
        challengeExtraRarityWeight,
        itemRarityDifficulty,
        playerItemRarityBonus,
        true
      );
      predictedChallengeItemsSummary = predictedChallengeItems.join(' | ');
    }

    if (selectedFragmentModifiers.length > 0 && dataStore.shopDataAvailable) {
      const modifierExtraRarityWeight = getShopItemRarityModifier(run, currentLevel, extraLevelDifficulty);
      for (const mod of selectedFragmentModifiers) {
        const offerCount = getFragmentModifierItemOfferCount(mod.Name, mod.ID);
        if (offerCount <= 0) {
          continue;
        }

        const modifierPicks = rollRandomMajorItemsForNode(
          dataStore,
          levelSeed,
          1,
          offerCount,
          modifierExtraRarityWeight,
          itemRarityDifficulty,
          playerItemRarityBonus,
          false
        );
        if (modifierPicks.length === 0) {
          continue;
        }

        const label = offerCount === 1 ? 'frag+1' : 'frag+3';
        predictedFragmentOfferItems.push(`${label} ${modifierPicks.join(' | ')}`);
      }
      predictedFragmentOfferItemsSummary = predictedFragmentOfferItems.join(' || ');
    }

    const variantChoice = selectedOverrideName || selectedVariantBiomeName || '';
    const fragmentModifiersSummary = fragPrimaryName && fragSecondaryName
      ? `${fragPrimaryName} + ${fragSecondaryName}`
      : (fragPrimaryName || '');

    rows.push({
      RunConfigName: String(run.m_Name),
      RunConfigPathID: runId,
      Seed: seed,
      NodeId: nodeId,
      NodeType: nodeType,
      PathIndex: currentLevel,
      NodePosX: toRounded(Number(node.pos.x), 4),
      NodePosY: toRounded(Number(node.pos.y), 4),
      NodePosZ: toRounded(Number(node.pos.z), 4),
      OutgoingNodeIds: outgoing.join(';'),
      LevelSeed: levelSeed,
      OverrideChance: overrideChance,
      OverrideRoll: overrideRoll,
      OverrideTriggered: overrideTriggered,
      SelectedOverrideLevelGenPathID: selectedOverridePathID,
      SelectedOverrideLevelGenName: selectedOverrideName,
      ChosenCategoryPathID: chosenCategoryPathID,
      ChosenCategoryName: chosenCategoryName,
      BaseBiomePathID: baseBiomePathID,
      BaseBiomeIdentifier: baseBiomeIdentifier,
      BaseBiomeIdentifierName: baseBiomeIdentifierName,
      ProbabilityOfVariation: probabilityOfVariation,
      VariantCount: variantCount,
      CanHaveVariants: canHaveVariants,
      VariantRoll: variantRoll,
      VariantTriggered: variantTriggered,
      SelectedVariantBiomePathID: selectedVariantBiomePathID,
      SelectedVariantBiomeName: selectedVariantBiomeName,
      SelectedVariantBiomeIdentifier: selectedVariantBiomeIdentifier,
      SelectedVariantBiomeIdentifierName: selectedVariantBiomeIdentifierName,
      PredictedEncounterType: predictedEncounterType,
      PredictedEncounterGuid: predictedEncounterGuid,
      PredictedEncounterName: predictedEncounterName,
      EncounterChallengeChance: encounterChallengeChance,
      EncounterChallengeRoll: encounterChallengeRoll,
      PredictedEncounterItems: predictedEncounterItems,
      PredictedEncounterItemsSummary: predictedEncounterItemsSummary,
      PredictedEncounterEffectSummary: predictedEncounterEffectSummary,
      PredictedShopItems: predictedShopItems,
      PredictedShopItemsSummary: predictedShopItemsSummary,
      PredictedChallengeItems: predictedChallengeItems,
      PredictedChallengeItemsSummary: predictedChallengeItemsSummary,
      PredictedRestStopItems: predictedRestStopItems,
      PredictedRestStopItemsSummary: predictedRestStopItemsSummary,
      PredictedFragmentOfferItems: predictedFragmentOfferItems,
      PredictedFragmentOfferItemsSummary: predictedFragmentOfferItemsSummary,
      FragmentModifierPrimaryName: fragPrimaryName,
      FragmentModifierPrimaryID: fragPrimaryID,
      FragmentModifierSecondaryName: fragSecondaryName,
      FragmentModifierSecondaryID: fragSecondaryID,
      VariantChoice: variantChoice,
      FragmentModifiersSummary: fragmentModifiersSummary,
    });
  }

  const rowByNodeId = new Map(rows.map((r) => [Number(r.NodeId), r]));
  const graphOut = {
    startNodeId: 0,
    nodes: [...nodes].sort((a, b) => Number(a.id) - Number(b.id)).map((n) => {
      const row = rowByNodeId.get(Number(n.id));
      return {
        id: Number(n.id),
        type: String(n.type),
        index: Number(n.currentLevel),
        x: toRounded(Number(n.pos.x), 4),
        y: toRounded(Number(n.pos.y), 4),
        z: toRounded(Number(n.pos.z), 4),
        next: [...(outgoingById.get(Number(n.id)) ?? [])],
        variantChoice: row ? String(row.VariantChoice ?? '') : '',
        chosenCategoryName: row ? String(row.ChosenCategoryName ?? '') : '',
        baseBiomeName: row ? String(row.BaseBiomeIdentifierName ?? '') : '',
        overrideChance: row ? String(row.OverrideChance ?? '') : '',
        overrideRoll: row ? String(row.OverrideRoll ?? '') : '',
        overrideTriggered: row ? String(row.OverrideTriggered ?? '') : '',
        selectedOverrideLevelGenName: row ? String(row.SelectedOverrideLevelGenName ?? '') : '',
        selectedVariantBiomeName: row ? String(row.SelectedVariantBiomeName ?? '') : '',
        fragmentModifierPrimaryName: row ? String(row.FragmentModifierPrimaryName ?? '') : '',
        fragmentModifierSecondaryName: row ? String(row.FragmentModifierSecondaryName ?? '') : '',
        fragmentModifiersSummary: row ? String(row.FragmentModifiersSummary ?? '') : '',
        predictedEncounterType: row ? String(row.PredictedEncounterType ?? '') : '',
        predictedEncounterName: row ? String(row.PredictedEncounterName ?? '') : '',
        predictedEncounterItems: row ? getArray(row.PredictedEncounterItems).map((x) => String(x)) : [],
        predictedEncounterItemsSummary: row ? String(row.PredictedEncounterItemsSummary ?? '') : '',
        predictedEncounterEffectSummary: row ? String(row.PredictedEncounterEffectSummary ?? '') : '',
        predictedShopItems: row ? getArray(row.PredictedShopItems).map((x) => String(x)) : [],
        predictedShopItemsSummary: row ? String(row.PredictedShopItemsSummary ?? '') : '',
        predictedChallengeItems: row ? getArray(row.PredictedChallengeItems).map((x) => String(x)) : [],
        predictedChallengeItemsSummary: row ? String(row.PredictedChallengeItemsSummary ?? '') : '',
        predictedRestStopItems: row ? getArray(row.PredictedRestStopItems).map((x) => String(x)) : [],
        predictedRestStopItemsSummary: row ? String(row.PredictedRestStopItemsSummary ?? '') : '',
        predictedFragmentOfferItems: row ? getArray(row.PredictedFragmentOfferItems).map((x) => String(x)) : [],
        predictedFragmentOfferItemsSummary: row ? String(row.PredictedFragmentOfferItemsSummary ?? '') : '',
      };
    }),
  };

  return {
    runConfigName: String(run.m_Name),
    runConfigPathID: runId,
    seed,
    rows,
    graph: graphOut,
  };
}

export {
  PredictorDataStore,
  predictRun,
};
