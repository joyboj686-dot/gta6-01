// save.js - localStorage persistence for Continue. A compact JSON blob holds
// the player's cash, health, armor, wanted state, completed missions, the
// current world seed and a short mission progress list.

const KEY = 'leonida-nights-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    const blob = {
      cash: Math.round(state.player.cash),
      hp: Math.round(state.player.hp),
      armor: Math.round(state.player.armor),
      ammo: state.player.ammo,
      wanted: state.wanted.stars,
      missionsDone: state.missionsDone,
      currentMission: state.currentMission ? state.currentMission.id : null,
      missionStep: state.currentMission ? state.currentMission.step : 0,
      seed: state.seed,
      time: state.timeOfDay,
    };
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch {
    // storage may be unavailable in some contexts; ignore
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave() {
  return !!loadSave();
}