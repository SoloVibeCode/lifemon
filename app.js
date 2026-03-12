/**
 * LifeMon App — Main controller
 */
(() => {
  const $ = (id) => document.getElementById(id);

  let playerCreature = null;
  let enemyCreature = null;
  let playerHp = 0;
  let enemyHp = 0;
  let battleActive = false;
  let playerText = '';

  // ─── XP & Level system ───
  let playerXp = 0;
  let playerLevel = 1;
  let winsCount = 0;
  let battlesCount = 0;

  const XP_TABLE = [0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500]; // XP needed per level

  function xpForLevel(lv) {
    return XP_TABLE[Math.min(lv - 1, XP_TABLE.length - 1)] || (lv * 200);
  }

  function xpToNext() {
    return xpForLevel(playerLevel + 1) - playerXp;
  }

  function xpProgress() {
    const current = xpForLevel(playerLevel);
    const next = xpForLevel(playerLevel + 1);
    return Math.min(1, (playerXp - current) / Math.max(1, next - current));
  }

  let evolvedThisBattle = false;

  function addXp(amount) {
    playerXp += amount;
    evolvedThisBattle = false;
    while (playerXp >= xpForLevel(playerLevel + 1) && playerLevel < 50) {
      const prevStage = CreatureRenderer.getEvoStage(playerLevel);
      playerLevel++;
      const newStage = CreatureRenderer.getEvoStage(playerLevel);
      if (newStage > prevStage) evolvedThisBattle = true;
      // Boost stats on level up (bigger boost on evolution)
      if (playerCreature) {
        const evoBonus = newStage > prevStage ? 2 : 0;
        playerCreature.stats.hp += 5 + Math.floor(Math.random() * 5) + evoBonus * 5;
        playerCreature.stats.atk += 1 + Math.floor(Math.random() * 3) + evoBonus * 2;
        playerCreature.stats.def += 1 + Math.floor(Math.random() * 3) + evoBonus * 2;
        playerCreature.stats.spd += 1 + Math.floor(Math.random() * 2) + evoBonus;
        playerCreature.stats.int += 1 + Math.floor(Math.random() * 2) + evoBonus;
        playerCreature.stats.cha += 1 + Math.floor(Math.random() * 2) + evoBonus;
      }
    }
    saveProgress();
  }

  // ─── Inventory ───
  let inventory = []; // array of item IDs
  let activeBuff = null; // { type: 'power'|'shield', used: false }

  function loadInventory() {
    try {
      const raw = localStorage.getItem('lifemon_inventory');
      if (raw) inventory = JSON.parse(raw);
    } catch(e) {}
  }

  function saveInventory() {
    try {
      localStorage.setItem('lifemon_inventory', JSON.stringify(inventory));
    } catch(e) {}
  }

  function addItem(itemId) {
    inventory.push(itemId);
    saveInventory();
  }

  function removeItem(itemId) {
    const idx = inventory.indexOf(itemId);
    if (idx !== -1) {
      inventory.splice(idx, 1);
      saveInventory();
    }
  }

  function useItem(itemId) {
    const item = LifeEngine.ITEMS[itemId];
    if (!item) return false;

    if (item.category === 'consumible') {
      if (item.heal && battleActive && playerCreature) {
        playerHp = Math.min(playerCreature.stats.hp, playerHp + item.heal);
        updateHpBars();
        removeItem(itemId);
        SoundEngine.heal();
        return `${item.icon} ${item.name}: +${item.heal} HP!`;
      }
      if (item.healFull && battleActive && playerCreature) {
        playerHp = playerCreature.stats.hp;
        playerCreature.abilities.forEach(a => a.pp = a.maxPp);
        updateHpBars();
        renderMoves();
        removeItem(itemId);
        SoundEngine.heal();
        return `${item.icon} ${item.name}: HP y PP restaurados!`;
      }
      if (item.xp) {
        addXp(item.xp);
        removeItem(itemId);
        SoundEngine.levelUp();
        return `${item.icon} ${item.name}: +${item.xp} XP!`;
      }
      return false;
    }

    if (item.category === 'cristal') {
      if (!playerCreature) return false;
      if (item.statAll) {
        ['hp', 'atk', 'def', 'spd', 'int', 'cha'].forEach(s => {
          playerCreature.stats[s] += item.statAll;
        });
        if (battleActive) playerHp = Math.min(playerCreature.stats.hp, playerHp + item.statAll);
      } else if (item.stat) {
        playerCreature.stats[item.stat] += item.boost;
        if (item.stat === 'hp' && battleActive) playerHp += item.boost;
      }
      removeItem(itemId);
      saveProgress();
      SoundEngine.levelUp();
      return `${item.icon} ${item.name}: stats mejorados!`;
    }

    if (item.category === 'batalla') {
      if (!battleActive) return false;
      activeBuff = { type: item.buff, used: false };
      removeItem(itemId);
      SoundEngine.select();
      return `${item.icon} ${item.name}: buff activado!`;
    }

    return false;
  }

  function getInventoryCounts() {
    const counts = {};
    for (const id of inventory) {
      counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  }

  // ─── Bestiary ───
  let bestiary = {}; // keyed by creature name

  function loadBestiary() {
    try {
      const raw = localStorage.getItem('lifemon_bestiary');
      if (raw) bestiary = JSON.parse(raw);
    } catch(e) {}
  }

  function saveBestiary() {
    try {
      localStorage.setItem('lifemon_bestiary', JSON.stringify(bestiary));
    } catch(e) {}
  }

  function registerCreature(creature, defeated) {
    const key = creature.name;
    if (!bestiary[key]) {
      bestiary[key] = {
        name: creature.name,
        type: creature.type,
        secondaryType: creature.secondaryType,
        seed: creature.seed || Math.floor(Math.random() * 99999),
        level: creature.level || 1,
        seen: 1,
        defeated: defeated ? 1 : 0,
        firstSeen: Date.now(),
      };
    } else {
      bestiary[key].seen++;
      if (defeated) bestiary[key].defeated++;
      if ((creature.level || 1) > bestiary[key].level) bestiary[key].level = creature.level;
    }
    saveBestiary();
  }

  // ─── Nickname ───
  let creatureNickname = '';

  // ─── Persistence ───
  function saveProgress() {
    try {
      localStorage.setItem('lifemon_save', JSON.stringify({
        text: playerText,
        xp: playerXp,
        level: playerLevel,
        wins: winsCount,
        battles: battlesCount,
        stats: playerCreature?.stats,
        nickname: creatureNickname,
      }));
    } catch(e) {}
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem('lifemon_save');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) { return null; }
  }

  // ─── Screen management ───
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = $(id);
    if (screen) screen.classList.add('active');
  }

  // ─── Sound toggle ───
  const soundToggle = $('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      const on = SoundEngine.toggle();
      soundToggle.textContent = on ? '🔊' : '🔇';
    });
  }

  // ─── Intro screen ───
  const btnGenerate = $('btnGenerate');
  const lifeInput = $('lifeInput');

  if (btnGenerate) {
    btnGenerate.addEventListener('click', () => {
      SoundEngine.resume();
      const text = lifeInput.value.trim();
      if (text.length < 20) {
        lifeInput.style.borderColor = 'var(--red)';
        setTimeout(() => lifeInput.style.borderColor = '', 1500);
        return;
      }
      playerText = text;
      startGeneration(text);
    });
  }

  // ─── Loading animation ───
  function startGeneration(text) {
    SoundEngine.generate();
    showScreen('screen-loading');
    const fill = $('loadingFill');
    const phase = $('loadingPhase');

    const phases = [
      'Extrayendo experiencias...',
      'Analizando personalidad...',
      'Determinando tipo...',
      'Generando criatura...',
      'Calculando estadisticas...',
      'Asignando habilidades...',
    ];

    let progress = 0;
    let phaseIdx = 0;

    const interval = setInterval(() => {
      progress += 2 + Math.random() * 5;
      if (progress >= 100) progress = 100;
      if (fill) fill.style.width = progress + '%';

      if (progress > (phaseIdx + 1) * (100 / phases.length) && phaseIdx < phases.length - 1) {
        phaseIdx++;
        if (phase) phase.textContent = phases[phaseIdx];
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => revealCreature(text), 400);
      }
    }, 80);
  }

  // ─── Reveal creature ───
  function revealCreature(text) {
    playerCreature = LifeEngine.generate(text);
    if (!playerCreature) {
      showScreen('screen-intro');
      return;
    }

    // Flash effect
    const flash = $('revealFlash');
    if (flash) {
      flash.classList.add('flash');
      setTimeout(() => flash.classList.remove('flash'), 700);
    }

    showScreen('screen-reveal');

    // Name (use nickname if set)
    const nameDisplay = $('creatureName');
    if (nameDisplay) nameDisplay.textContent = creatureNickname || playerCreature.name;

    // Level display with evolution stage
    const lvEl = document.querySelector('.creature-level');
    if (lvEl) {
      const evoName = CreatureRenderer.getEvoStageName(playerLevel);
      lvEl.textContent = playerLevel >= 5 ? `${evoName} · Nv. ${playerLevel}` : `Nv. ${playerLevel}`;
    }

    // Type badge
    const badge = $('creatureTypeBadge');
    if (badge) {
      badge.textContent = playerCreature.typeInfo.icon + ' ' + playerCreature.typeInfo.name;
      badge.style.background = playerCreature.typeInfo.color + '22';
      badge.style.color = playerCreature.typeInfo.color;
      badge.style.border = `1px solid ${playerCreature.typeInfo.color}44`;
    }

    // Render creature on canvas (pass level for evolution)
    const canvas = $('creatureCanvas');
    if (canvas) {
      CreatureRenderer.render(canvas, playerCreature, { level: playerLevel });
    }

    // Stats
    const statsEl = $('creatureStats');
    if (statsEl) {
      const statLabels = {
        hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', int: 'INT', cha: 'CHA'
      };
      const statColors = {
        hp: '#50fa7b', atk: '#ff5555', def: '#6272a4',
        spd: '#f1fa8c', int: '#bd93f9', cha: '#ffb86c'
      };
      const maxStat = 130;

      statsEl.innerHTML = Object.entries(playerCreature.stats).map(([key, val]) => {
        const pct = key === 'hp' ? (val / 250 * 100) : (val / maxStat * 100);
        return `
          <div class="stat-row">
            <span class="stat-label">${statLabels[key]}</span>
            <div class="stat-bar-bg">
              <div class="stat-bar" style="width: ${pct}%; background: ${statColors[key]}"></div>
            </div>
            <span class="stat-val">${val}</span>
          </div>`;
      }).join('');

      // Animate bars
      setTimeout(() => {
        statsEl.querySelectorAll('.stat-bar').forEach(bar => {
          bar.style.width = bar.style.width; // trigger reflow
        });
      }, 50);
    }

    // Abilities
    const abilitiesEl = $('creatureAbilities');
    if (abilitiesEl) {
      abilitiesEl.innerHTML = `
        <h4>Habilidades</h4>
        ${playerCreature.abilities.map(a => {
          const typeInfo = LifeEngine.TYPES[a.type] || {};
          return `<span class="ability-chip" style="border-left: 3px solid ${typeInfo.color || '#666'}">${a.heal ? '💚' : '⚡'} ${a.name}</span>`;
        }).join('')}`;
    }

    // Bio
    const bioEl = $('creatureBio');
    if (bioEl) bioEl.textContent = playerCreature.bio;
  }

  // ─── Nickname tap ───
  const nameEl = $('creatureName');
  if (nameEl) {
    nameEl.style.cursor = 'pointer';
    nameEl.addEventListener('click', () => {
      if (!playerCreature) return;
      const current = creatureNickname || playerCreature.name;
      const newName = prompt('Renombra tu criatura:', current);
      if (newName && newName.trim()) {
        creatureNickname = newName.trim().substring(0, 20);
        nameEl.textContent = creatureNickname;
        saveProgress();
        showInventoryToast('Criatura renombrada!');
      }
    });
  }

  // ─── Navigation buttons ───
  const btnBattle = $('btnBattle');
  if (btnBattle) {
    btnBattle.addEventListener('click', startBattle);
  }

  const btnExplore = $('btnExplore');
  if (btnExplore) {
    btnExplore.addEventListener('click', showExploreScreen);
  }

  const btnShare = $('btnShare');
  if (btnShare) {
    btnShare.addEventListener('click', shareCreature);
  }

  const btnReroll = $('btnReroll');
  if (btnReroll) {
    btnReroll.addEventListener('click', () => {
      if (playerText) {
        playerText += ' ' + Date.now();
        startGeneration(playerText);
      }
    });
  }

  // ─── Explore screen ───
  let currentRegion = null;

  function showExploreScreen() {
    if (!playerCreature) return;
    showScreen('screen-explore');
    updateBestiaryBadge();
    const invBadge = $('inventoryBadge');
    if (invBadge) invBadge.textContent = inventory.length;

    $('explorePlayerName').textContent = creatureNickname || playerCreature.name;
    $('explorePlayerLevel').textContent = playerLevel;
    $('exploreWins').textContent = `${winsCount} victorias`;
    $('exploreBattles').textContent = `${battlesCount} batallas`;

    // Daily boss
    renderDailyBoss();

    const grid = $('regionGrid');
    if (!grid) return;

    grid.innerHTML = LifeEngine.REGIONS.map(r => {
      const locked = playerLevel < r.minLv;
      return `
        <div class="region-card ${locked ? 'locked' : ''}" data-region="${r.id}"
             style="border-color: ${locked ? 'var(--surface)' : r.color + '44'}; opacity: ${locked ? 0.5 : 1}">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${r.color}"></div>
          <div class="region-icon">${r.icon}</div>
          <div class="region-name">${r.name}</div>
          <div class="region-desc">${r.desc}</div>
          <span class="region-level">${locked ? '🔒 Nv. ' + r.minLv + ' necesario' : 'Nv. ' + r.minLv + '-' + r.maxLv}</span>
        </div>`;
    }).join('');

    grid.querySelectorAll('.region-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        const regionId = card.dataset.region;
        currentRegion = LifeEngine.REGIONS.find(r => r.id === regionId);
        if (currentRegion) exploreRegion();
      });
    });
  }

  // ─── Random encounters ───
  const EXPLORE_EVENTS = [
    { type: 'battle', weight: 55 },
    { type: 'item_find', weight: 20 },
    { type: 'rest', weight: 10 },
    { type: 'story', weight: 15 },
  ];

  const STORY_EVENTS = [
    { text: 'Encuentras unas ruinas antiguas con simbolos de poder. Tu criatura absorbe la energia.', effect: 'xp', value: 20 },
    { text: 'Un viajero misterioso te ofrece sabiduria. Tu criatura aprende algo nuevo.', effect: 'xp', value: 30 },
    { text: 'Descubres un manantial de energia vital. Tu criatura se siente revitalizada.', effect: 'heal_stat', value: 3 },
    { text: 'Una tormenta de energia recorre la zona. Tu criatura sale fortalecida.', effect: 'xp', value: 25 },
    { text: 'Encuentras un mapa antiguo que revela secretos de la region.', effect: 'xp', value: 15 },
    { text: 'Un eco del pasado resuena. Tu criatura conecta con sus raices.', effect: 'xp', value: 35 },
  ];

  function exploreRegion() {
    if (!playerCreature || !currentRegion) return;

    const roll = Math.random() * 100;
    let cumulative = 0;
    let chosen = 'battle';
    for (const event of EXPLORE_EVENTS) {
      cumulative += event.weight;
      if (roll <= cumulative) { chosen = event.type; break; }
    }

    switch (chosen) {
      case 'battle':
        startRegionBattle();
        break;
      case 'item_find':
        showExploreEvent('item_find');
        break;
      case 'rest':
        showExploreEvent('rest');
        break;
      case 'story':
        showExploreEvent('story');
        break;
    }
  }

  function showExploreEvent(type) {
    showScreen('screen-event');

    const icon = $('eventIcon');
    const title = $('eventTitle');
    const text = $('eventText');
    const reward = $('eventReward');
    const btnContinue = $('btnEventContinue');

    if (type === 'item_find') {
      // Roll a random item
      const drops = LifeEngine.rollItemDrops(playerLevel, true);
      const itemId = drops[0] || 'baya_energia';
      addItem(itemId);
      const item = LifeEngine.ITEMS[itemId];
      icon.textContent = item ? item.icon : '📦';
      title.textContent = '¡Hallazgo!';
      text.textContent = `Explorando ${currentRegion.name}, encuentras algo brillante entre la vegetacion...`;
      reward.innerHTML = `<div class="drop-item rarity-${item.rarity}">
        <span class="drop-icon">${item.icon}</span>
        <span class="drop-name">${item.name}</span>
        <span class="drop-rarity">${item.rarity}</span>
      </div>`;
      SoundEngine.select();
      checkAchievements();
    } else if (type === 'rest') {
      icon.textContent = '💫';
      title.textContent = 'Descanso';
      text.textContent = `Tu criatura descansa en un claro tranquilo de ${currentRegion.name}. Recupera fuerzas y gana experiencia.`;
      const xpGain = 10 + Math.floor(Math.random() * 15);
      addXp(xpGain);
      reward.innerHTML = `<span style="color: var(--accent);">+${xpGain} XP</span>`;
      SoundEngine.heal();
    } else if (type === 'story') {
      const story = STORY_EVENTS[Math.floor(Math.random() * STORY_EVENTS.length)];
      icon.textContent = '📜';
      title.textContent = 'Evento';
      text.textContent = story.text;
      if (story.effect === 'xp') {
        addXp(story.value);
        reward.innerHTML = `<span style="color: var(--accent);">+${story.value} XP</span>`;
      } else if (story.effect === 'heal_stat') {
        playerCreature.stats.hp += story.value;
        playerCreature.stats.def += story.value;
        saveProgress();
        reward.innerHTML = `<span style="color: var(--green);">+${story.value} HP, +${story.value} DEF permanente</span>`;
      }
      SoundEngine.generate();
    }

    // Replace event listener cleanly
    const newBtn = btnContinue.cloneNode(true);
    btnContinue.parentNode.replaceChild(newBtn, btnContinue);
    newBtn.addEventListener('click', () => showExploreScreen());
  }

  function startRegionBattle() {
    if (!playerCreature || !currentRegion) return;
    showScreen('screen-battle');
    battleActive = true;

    enemyCreature = LifeEngine.generateRegionEnemy(currentRegion, playerLevel);
    battlesCount++;

    playerHp = playerCreature.stats.hp;
    enemyHp = enemyCreature.stats.hp;

    playerCreature.abilities.forEach(a => a.pp = a.maxPp);
    enemyCreature.abilities.forEach(a => a.pp = a.maxPp);

    $('playerName').textContent = creatureNickname || playerCreature.name;
    $('enemyName').textContent = enemyCreature.name;
    $('enemyLevel').textContent = enemyCreature.level || 1;
    $('logPlayerName').textContent = playerCreature.name;
    const plvEl = $('playerLevel');
    if (plvEl) plvEl.textContent = playerLevel;

    CreatureRenderer.render($('playerCanvas'), playerCreature, { noShadow: true, level: playerLevel });
    CreatureRenderer.render($('enemyCanvas'), enemyCreature, { noShadow: true, level: enemyCreature.level });

    updateHpBars();
    renderMoves();
    setLog(`¡Un ${enemyCreature.name} salvaje aparece en ${currentRegion.name}!`);
    SoundEngine.encounter();
  }

  const btnBackFromExplore = $('btnBackFromExplore');
  if (btnBackFromExplore) {
    btnBackFromExplore.addEventListener('click', () => showScreen('screen-reveal'));
  }

  // ─── Bestiary screen ───
  const btnBestiary = $('btnBestiary');
  if (btnBestiary) {
    btnBestiary.addEventListener('click', showBestiaryScreen);
  }

  const btnBackFromBestiary = $('btnBackFromBestiary');
  if (btnBackFromBestiary) {
    btnBackFromBestiary.addEventListener('click', showExploreScreen);
  }

  function showBestiaryScreen() {
    showScreen('screen-bestiary');
    const grid = $('bestiaryGrid');
    const countEl = $('bestiaryCount');
    if (!grid) return;

    const entries = Object.values(bestiary).sort((a, b) => b.firstSeen - a.firstSeen);
    const totalTypes = Object.keys(LifeEngine.TYPES).length;

    // Count unique types seen
    const typesSeen = new Set(entries.map(e => e.type)).size;
    if (countEl) countEl.textContent = `${entries.length} encontrados · ${typesSeen}/${totalTypes} tipos`;

    if (!entries.length) {
      grid.innerHTML = '<div class="bestiary-empty">Aun no has encontrado criaturas.<br>¡Explora regiones para llenar tu bestiario!</div>';
      return;
    }

    grid.innerHTML = entries.map(entry => {
      const typeInfo = LifeEngine.TYPES[entry.type] || {};
      return `
        <div class="bestiary-entry ${entry.defeated > 0 ? 'defeated' : ''}" data-name="${entry.name}">
          <canvas width="64" height="64" data-type="${entry.type}" data-seed="${entry.seed}" data-level="${entry.level}"></canvas>
          <div class="bestiary-name">${entry.name}</div>
          <div class="bestiary-type" style="color:${typeInfo.color || '#888'}">${typeInfo.icon || ''} ${typeInfo.name || entry.type}</div>
          <div class="bestiary-seen">Visto ${entry.seen}x · ${entry.defeated > 0 ? 'Derrotado' : 'Sin derrotar'}</div>
        </div>`;
    }).join('');

    // Render creature canvases
    grid.querySelectorAll('canvas').forEach(canvas => {
      const type = canvas.dataset.type;
      const seed = parseInt(canvas.dataset.seed) || 0;
      const level = parseInt(canvas.dataset.level) || 1;
      CreatureRenderer.render(canvas, {
        type, seed, typeInfo: LifeEngine.TYPES[type], level
      }, { noShadow: true, level, noGlow: true });
    });
  }

  function updateBestiaryBadge() {
    const badge = $('bestiaryBadge');
    if (badge) badge.textContent = Object.keys(bestiary).length;
  }

  // ─── Share creature ───
  function shareCreature() {
    if (!playerCreature) return;

    const overlay = document.createElement('div');
    overlay.className = 'share-overlay';

    const shareCanvas = document.createElement('canvas');
    shareCanvas.width = 400;
    shareCanvas.height = 520;
    const ctx = shareCanvas.getContext('2d');

    // Background
    const palette = CreatureRenderer.TYPE_PALETTES[playerCreature.type] || CreatureRenderer.TYPE_PALETTES.tecnico;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 400, 520);

    // Top color bar
    const grad = ctx.createLinearGradient(0, 0, 400, 0);
    grad.addColorStop(0, palette.body);
    grad.addColorStop(1, palette.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 6);

    // Title
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(playerCreature.name, 200, 48);

    // Type badge with evolution
    const evoTag = playerLevel >= 5 ? ' ' + CreatureRenderer.getEvoStageName(playerLevel) : '';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.fillStyle = palette.body;
    ctx.fillText(playerCreature.typeInfo.icon + ' ' + playerCreature.typeInfo.name.toUpperCase() + evoTag + ' · Nv. ' + playerLevel, 200, 72);

    // Render creature in center (with evolution)
    const creatureCanvas = document.createElement('canvas');
    creatureCanvas.width = 160;
    creatureCanvas.height = 160;
    CreatureRenderer.render(creatureCanvas, playerCreature, { level: playerLevel });
    ctx.drawImage(creatureCanvas, 120, 90, 160, 160);

    // Stats
    const stats = playerCreature.stats;
    const statNames = ['HP', 'ATK', 'DEF', 'SPD', 'INT', 'CHA'];
    const statKeys = ['hp', 'atk', 'def', 'spd', 'int', 'cha'];
    const statColors = ['#50fa7b', '#ff5555', '#6272a4', '#f1fa8c', '#bd93f9', '#ffb86c'];
    let sy = 280;

    statKeys.forEach((key, i) => {
      const val = stats[key];
      const maxVal = key === 'hp' ? 250 : 130;
      const pct = val / maxVal;

      ctx.fillStyle = '#8892b0';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(statNames[i], 60, sy + 12);

      ctx.fillStyle = '#0f3460';
      ctx.fillRect(70, sy, 240, 14);
      ctx.fillStyle = statColors[i];
      ctx.fillRect(70, sy, 240 * pct, 14);

      ctx.fillStyle = '#e8e8e8';
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillText(val.toString(), 318, sy + 12);

      sy += 22;
    });

    // Abilities
    ctx.fillStyle = '#8892b0';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const abilityText = playerCreature.abilities.map(a => a.name).join(' · ');
    ctx.fillText(abilityText, 200, sy + 20);

    // Bio
    ctx.fillStyle = '#6272a4';
    ctx.font = 'italic 11px -apple-system, sans-serif';
    const bioLines = wrapText(ctx, playerCreature.bio, 340);
    bioLines.forEach((line, i) => {
      ctx.fillText(line, 200, sy + 44 + i * 16);
    });

    // Branding
    ctx.fillStyle = '#4a4a6a';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText('lifemon-rho.vercel.app', 200, 508);

    overlay.appendChild(shareCanvas);

    const actions = document.createElement('div');
    actions.className = 'share-actions';

    const btnDownload = document.createElement('button');
    btnDownload.className = 'btn-primary';
    btnDownload.innerHTML = '<span class="btn-icon">💾</span> Guardar imagen';
    btnDownload.style.marginTop = '0';
    btnDownload.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `lifemon-${playerCreature.name.toLowerCase()}.png`;
      link.href = shareCanvas.toDataURL('image/png');
      link.click();
    });

    const btnClose = document.createElement('button');
    btnClose.className = 'btn-secondary';
    btnClose.textContent = 'Cerrar';
    btnClose.style.marginTop = '0';
    btnClose.addEventListener('click', () => overlay.remove());

    actions.appendChild(btnDownload);
    actions.appendChild(btnClose);
    overlay.appendChild(actions);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // ─── Battle ───
  function startBattle() {
    if (!playerCreature) return;

    showScreen('screen-battle');
    battleActive = true;

    // Generate enemy scaled to player level
    const enemyLevel = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
    enemyCreature = LifeEngine.generateEnemy(enemyLevel);
    battlesCount++;

    // Set HP
    playerHp = playerCreature.stats.hp;
    enemyHp = enemyCreature.stats.hp;

    // Reset PP
    playerCreature.abilities.forEach(a => a.pp = a.maxPp);
    enemyCreature.abilities.forEach(a => a.pp = a.maxPp);

    // Render names
    $('playerName').textContent = creatureNickname || playerCreature.name;
    $('enemyName').textContent = enemyCreature.name;
    $('enemyLevel').textContent = enemyCreature.level || enemyLevel;
    $('logPlayerName').textContent = playerCreature.name;
    const plvEl = $('playerLevel');
    if (plvEl) plvEl.textContent = playerLevel;

    // Render creatures with evolution
    CreatureRenderer.render($('playerCanvas'), playerCreature, { noShadow: true, level: playerLevel });
    CreatureRenderer.render($('enemyCanvas'), enemyCreature, { noShadow: true, level: enemyCreature.level });

    // Update HP bars
    updateHpBars();

    // Render moves
    renderMoves();

    // Battle log
    setLog(`¡Un ${enemyCreature.name} salvaje aparece!`);
    SoundEngine.encounter();
  }

  function updateHpBars() {
    const playerPct = Math.max(0, playerHp / playerCreature.stats.hp * 100);
    const enemyPct = Math.max(0, enemyHp / enemyCreature.stats.hp * 100);

    const pFill = $('playerHpFill');
    const eFill = $('enemyHpFill');

    if (pFill) {
      pFill.style.width = playerPct + '%';
      pFill.className = 'hp-fill' + (playerPct < 25 ? ' low' : playerPct < 50 ? ' medium' : '');
    }
    if (eFill) {
      eFill.style.width = enemyPct + '%';
      eFill.className = 'hp-fill' + (enemyPct < 25 ? ' low' : enemyPct < 50 ? ' medium' : '');
    }

    $('playerHpText').textContent = `${Math.max(0, playerHp)} / ${playerCreature.stats.hp}`;
    $('enemyHpText').textContent = `${Math.max(0, enemyHp)} / ${enemyCreature.stats.hp}`;
  }

  function renderMoves() {
    const movesEl = $('battleMoves');
    if (!movesEl) return;

    const hasBattleItems = inventory.some(id => {
      const item = LifeEngine.ITEMS[id];
      return item && (item.category === 'consumible' && (item.heal || item.healFull) || item.category === 'batalla');
    });

    const buffHtml = activeBuff ? `<div class="battle-buff">${activeBuff.type === 'power' ? '🔥 Poder x1.5' : '🛡️ Escudo x0.5'}</div>` : '';

    movesEl.innerHTML = playerCreature.abilities.map((move, i) => {
      const typeInfo = LifeEngine.TYPES[move.type] || {};
      const disabled = move.pp <= 0 ? 'disabled' : '';
      return `
        <button class="move-btn" data-idx="${i}" ${disabled}
                style="border-bottom: 3px solid ${typeInfo.color || '#666'}">
          ${move.heal ? '💚' : '⚡'} ${move.name}
          <span class="move-type">${typeInfo.name || move.type} · PWR ${move.power || move.heal || 0}</span>
          <span class="move-pp">PP ${move.pp}/${move.maxPp}</span>
        </button>`;
    }).join('') + (hasBattleItems ? `<button class="move-btn bag-btn" id="btnBagInBattle"
      style="border-bottom: 3px solid #f1fa8c">
      🎒 Mochila
      <span class="move-type">Usar un objeto</span>
    </button>` : '') + buffHtml;

    // Add event listeners
    movesEl.querySelectorAll('.move-btn[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!battleActive) return;
        SoundEngine.select();
        const idx = parseInt(btn.dataset.idx);
        executeTurn(idx);
      });
    });

    const bagBtn = movesEl.querySelector('#btnBagInBattle');
    if (bagBtn) bagBtn.addEventListener('click', () => { if (battleActive) showBattleItemBag(); });
  }

  function setLog(text) {
    const log = $('battleLog');
    if (log) log.innerHTML = `<p>${text}</p>`;
  }

  function appendLog(text) {
    const log = $('battleLog');
    if (log) log.innerHTML += `<p>${text}</p>`;
  }

  async function executeTurn(moveIdx) {
    if (!battleActive) return;
    battleActive = false;

    const move = playerCreature.abilities[moveIdx];
    if (!move || move.pp <= 0) { battleActive = true; return; }

    // Disable buttons
    const movesEl = $('battleMoves');
    movesEl.querySelectorAll('.move-btn').forEach(b => b.disabled = true);

    // Player attacks
    move.pp--;

    if (move.heal) {
      const healAmt = BattleSystem.calcHeal(move, playerCreature);
      playerHp = Math.min(playerCreature.stats.hp, playerHp + healAmt);
      setLog(`${playerCreature.name} usa ${move.name}! Recupera ${healAmt} HP.`);
      SoundEngine.heal();
    } else {
      let dmg = BattleSystem.calcDamage(playerCreature, move, enemyCreature);
      // Apply power buff
      if (activeBuff && activeBuff.type === 'power' && !activeBuff.used) {
        dmg = Math.floor(dmg * 1.5);
        activeBuff.used = true;
        activeBuff = null;
      }
      enemyHp -= dmg;
      setLog(`${playerCreature.name} usa ${move.name}! Hace ${dmg} de dano.`);
      SoundEngine.hit();

      const eff = BattleSystem.effectivenessText(move.type, enemyCreature.type);
      if (eff) {
        appendLog(eff);
        if (eff.includes('super')) SoundEngine.superEffective();
        else SoundEngine.notEffective();
      }

      // Shake enemy
      const enemyWrap = document.querySelector('.enemy-creature');
      if (enemyWrap) {
        enemyWrap.classList.add('shake');
        setTimeout(() => enemyWrap.classList.remove('shake'), 300);
      }
    }

    updateHpBars();
    await delay(1200);

    // Check enemy fainted
    if (enemyHp <= 0) {
      endBattle(true);
      return;
    }

    // Enemy turn
    const enemyMove = BattleSystem.pickEnemyMove(enemyCreature, playerCreature);
    if (!enemyMove) {
      appendLog(`${enemyCreature.name} no tiene movimientos disponibles!`);
    } else {
      enemyMove.pp--;
      if (enemyMove.heal) {
        const healAmt = BattleSystem.calcHeal(enemyMove, enemyCreature);
        enemyHp = Math.min(enemyCreature.stats.hp, enemyHp + healAmt);
        appendLog(`${enemyCreature.name} usa ${enemyMove.name}! Recupera ${healAmt} HP.`);
        SoundEngine.heal();
      } else {
        let dmg = BattleSystem.calcDamage(enemyCreature, enemyMove, playerCreature);
        // Apply shield buff
        if (activeBuff && activeBuff.type === 'shield' && !activeBuff.used) {
          dmg = Math.floor(dmg * 0.5);
          activeBuff.used = true;
          activeBuff = null;
        }
        playerHp -= dmg;
        appendLog(`${enemyCreature.name} usa ${enemyMove.name}! Hace ${dmg} de dano.`);
        SoundEngine.hit();

        const eff = BattleSystem.effectivenessText(enemyMove.type, playerCreature.type);
        if (eff) appendLog(eff);

        // Shake player
        const playerWrap = document.querySelector('.player-creature');
        if (playerWrap) {
          playerWrap.classList.add('shake');
          setTimeout(() => playerWrap.classList.remove('shake'), 300);
        }
      }
    }

    updateHpBars();
    await delay(800);

    // Check player fainted
    if (playerHp <= 0) {
      endBattle(false);
      return;
    }

    // Re-enable moves
    battleActive = true;
    renderMoves();
  }

  function endBattle(won) {
    battleActive = false;
    activeBuff = null;
    const prevLevel = playerLevel;

    // Register enemy in bestiary
    if (enemyCreature) registerCreature(enemyCreature, won);

    // Track perfect win
    lastBattlePerfect = won && playerHp === playerCreature.stats.hp;

    // Roll item drops (boss gives guaranteed rare+ drops)
    const enemyLv = enemyCreature.level || 1;
    let droppedItems;
    if (enemyCreature.isBoss && won) {
      markDailyBossDefeated();
      // Guaranteed 2 rare+ items for boss
      const rareItems = Object.values(LifeEngine.ITEMS).filter(i => i.rarity !== 'comun');
      const rng = LifeEngine.seededRandom(Date.now());
      droppedItems = [
        rareItems[Math.floor(rng() * rareItems.length)].id,
        rareItems[Math.floor(rng() * rareItems.length)].id,
      ];
    } else {
      droppedItems = LifeEngine.rollItemDrops(enemyLv, won);
    }
    droppedItems.forEach(id => {
      addItem(id);
      const item = LifeEngine.ITEMS[id];
      if (item && item.rarity === 'legendario') foundLegendary = true;
    });

    if (won) {
      winsCount++;
      const bossBonus = enemyCreature.isBoss ? 3 : 1;
      const xpGain = (15 + enemyLv * 10 + Math.floor(Math.random() * 10)) * bossBonus;
      addXp(xpGain);

      setTimeout(() => {
        showScreen('screen-result');
        const evoName = CreatureRenderer.getEvoStageName(playerLevel);

        if (evolvedThisBattle) {
          $('resultIcon').textContent = '🌟';
          $('resultTitle').textContent = `¡${playerCreature.name} evoluciono!`;
          SoundEngine.evolution();
        } else if (playerLevel > prevLevel) {
          $('resultIcon').textContent = '⭐';
          $('resultTitle').textContent = `¡Nivel ${playerLevel}!`;
          SoundEngine.levelUp();
        } else {
          $('resultIcon').textContent = '🏆';
          $('resultTitle').textContent = '¡Victoria!';
          SoundEngine.victory();
        }

        let text = `${playerCreature.name} derroto a ${enemyCreature.name}! +${xpGain} XP`;
        if (evolvedThisBattle) {
          text += ` — ¡Tu criatura evoluciono a forma ${evoName}! Nueva apariencia y stats potenciados.`;
        } else if (playerLevel > prevLevel) {
          text += ` — ¡Has subido a nivel ${playerLevel}! Stats mejorados.`;
        }
        $('resultText').textContent = text;

        renderResultXpBar();
        renderResultDrops(droppedItems);
        checkAchievements();
      }, 1000);
    } else {
      const xpGain = 5 + Math.floor(Math.random() * 5);
      addXp(xpGain);

      setTimeout(() => {
        showScreen('screen-result');
        $('resultIcon').textContent = '💀';
        $('resultTitle').textContent = 'Derrotado...';
        SoundEngine.defeat();
        $('resultText').textContent = `${enemyCreature.name} derroto a ${playerCreature.name}. +${xpGain} XP de consolacion. La vida sigue.`;
        renderResultXpBar();
        renderResultDrops(droppedItems);
        checkAchievements();
      }, 1000);
    }
  }

  function renderResultDrops(droppedItems) {
    const container = $('resultDrops');
    if (!container) return;
    if (!droppedItems || droppedItems.length === 0) {
      container.innerHTML = '';
      return;
    }
    const html = droppedItems.map(id => {
      const item = LifeEngine.ITEMS[id];
      if (!item) return '';
      return `<div class="drop-item rarity-${item.rarity}">
        <span class="drop-icon">${item.icon}</span>
        <span class="drop-name">${item.name}</span>
        <span class="drop-rarity">${item.rarity}</span>
      </div>`;
    }).join('');
    container.innerHTML = `<div class="drops-title">Objetos encontrados</div>${html}`;
  }

  function renderResultXpBar() {
    const container = $('resultXpBar');
    if (!container) return;
    const pct = Math.floor(xpProgress() * 100);
    container.innerHTML = `
      <div class="xp-info">
        <span>Nv. ${playerLevel}</span>
        <span>${Math.floor(xpToNext())} XP para Nv. ${playerLevel + 1}</span>
      </div>
      <div class="xp-bar-bg">
        <div class="xp-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="xp-record">
        <span>Batallas: ${battlesCount}</span>
        <span>Victorias: ${winsCount}</span>
      </div>`;
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── Result buttons ───
  const btnPlayAgain = $('btnPlayAgain');
  if (btnPlayAgain) {
    btnPlayAgain.addEventListener('click', () => {
      if (currentRegion) {
        startRegionBattle();
      } else {
        startBattle();
      }
    });
  }

  const btnBackToCard = $('btnBackToCard');
  if (btnBackToCard) {
    btnBackToCard.addEventListener('click', () => {
      currentRegion = null;
      showScreen('screen-reveal');
    });
  }

  const btnBackToMap = $('btnBackToMap');
  if (btnBackToMap) {
    btnBackToMap.addEventListener('click', () => {
      currentRegion = null;
      showExploreScreen();
    });
  }

  const btnNewLife = $('btnNewLife');
  if (btnNewLife) {
    btnNewLife.addEventListener('click', () => {
      playerCreature = null;
      playerText = '';
      playerXp = 0;
      playerLevel = 1;
      winsCount = 0;
      battlesCount = 0;
      try { localStorage.removeItem('lifemon_save'); localStorage.removeItem('lifemon_bestiary'); localStorage.removeItem('lifemon_inventory'); localStorage.removeItem('lifemon_achievements'); } catch(e) {}
      bestiary = {};
      inventory = [];
      unlockedAchievements = {};
      creatureNickname = '';
      if (lifeInput) lifeInput.value = '';
      showScreen('screen-intro');
    });
  }

  // ─── Inventory screen ───
  function showInventoryScreen() {
    showScreen('screen-inventory');
    const grid = $('inventoryGrid');
    if (!grid) return;

    const counts = getInventoryCounts();
    const uniqueItems = Object.keys(counts);

    if (uniqueItems.length === 0) {
      grid.innerHTML = '<p class="inventory-empty">Tu mochila esta vacia. Gana batallas para encontrar objetos!</p>';
      return;
    }

    grid.innerHTML = uniqueItems.map(id => {
      const item = LifeEngine.ITEMS[id];
      if (!item) return '';
      const qty = counts[id];
      const canUse = item.category === 'cristal' || item.category === 'consumible' && item.xp;
      return `<div class="inventory-item rarity-${item.rarity}" data-item="${id}">
        <div class="inv-icon">${item.icon}</div>
        <div class="inv-info">
          <span class="inv-name">${item.name}</span>
          <span class="inv-desc">${item.desc}</span>
        </div>
        <span class="inv-qty">x${qty}</span>
        ${canUse ? `<button class="inv-use" data-item="${id}">Usar</button>` : ''}
      </div>`;
    }).join('');

    // Wire use buttons
    grid.querySelectorAll('.inv-use').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.item;
        const result = useItem(itemId);
        if (result) {
          showInventoryToast(result);
          showInventoryScreen(); // refresh
        }
      });
    });

    const badge = $('inventoryBadge');
    if (badge) badge.textContent = inventory.length;
  }

  function showInventoryToast(text) {
    const toast = document.createElement('div');
    toast.className = 'inventory-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Battle item bag
  function showBattleItemBag() {
    const counts = getInventoryCounts();
    const usableInBattle = Object.keys(counts).filter(id => {
      const item = LifeEngine.ITEMS[id];
      return item && (item.category === 'consumible' && (item.heal || item.healFull) || item.category === 'batalla');
    });

    if (usableInBattle.length === 0) {
      setLog('No tienes objetos usables en batalla.');
      return;
    }

    const movesEl = $('battleMoves');
    if (!movesEl) return;

    movesEl.innerHTML = usableInBattle.map(id => {
      const item = LifeEngine.ITEMS[id];
      return `<button class="move-btn item-btn" data-item="${id}"
              style="border-bottom: 3px solid #f1fa8c">
        ${item.icon} ${item.name}
        <span class="move-type">${item.desc}</span>
        <span class="move-pp">x${counts[id]}</span>
      </button>`;
    }).join('') + `<button class="move-btn" id="btnBackToMoves"
      style="border-bottom: 3px solid #666">
      ← Ataques
      <span class="move-type">Volver a movimientos</span>
    </button>`;

    movesEl.querySelectorAll('.item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!battleActive) return;
        const itemId = btn.dataset.item;
        const result = useItem(itemId);
        if (result) {
          setLog(result);
          // Item use costs a turn — enemy attacks
          battleActive = false;
          setTimeout(async () => {
            await enemyTurn();
            if (playerHp <= 0) { endBattle(false); return; }
            battleActive = true;
            renderMoves();
          }, 800);
        }
      });
    });

    const backBtn = movesEl.querySelector('#btnBackToMoves');
    if (backBtn) backBtn.addEventListener('click', () => renderMoves());
  }

  async function enemyTurn() {
    const enemyMove = BattleSystem.pickEnemyMove(enemyCreature, playerCreature);
    if (!enemyMove) {
      appendLog(`${enemyCreature.name} no tiene movimientos disponibles!`);
      return;
    }
    enemyMove.pp--;
    if (enemyMove.heal) {
      const healAmt = BattleSystem.calcHeal(enemyMove, enemyCreature);
      enemyHp = Math.min(enemyCreature.stats.hp, enemyHp + healAmt);
      appendLog(`${enemyCreature.name} usa ${enemyMove.name}! Recupera ${healAmt} HP.`);
      SoundEngine.heal();
    } else {
      let dmg = BattleSystem.calcDamage(enemyCreature, enemyMove, playerCreature);
      if (activeBuff && activeBuff.type === 'shield' && !activeBuff.used) {
        dmg = Math.floor(dmg * 0.5);
        activeBuff.used = true;
        activeBuff = null;
      }
      playerHp -= dmg;
      appendLog(`${enemyCreature.name} usa ${enemyMove.name}! Hace ${dmg} de dano.`);
      SoundEngine.hit();
      const eff = BattleSystem.effectivenessText(enemyMove.type, playerCreature.type);
      if (eff) appendLog(eff);
      const playerWrap = document.querySelector('.player-creature');
      if (playerWrap) {
        playerWrap.classList.add('shake');
        setTimeout(() => playerWrap.classList.remove('shake'), 300);
      }
    }
    updateHpBars();
  }

  // Inventory button on explore screen
  const btnInventory = $('btnInventory');
  if (btnInventory) {
    btnInventory.addEventListener('click', showInventoryScreen);
  }

  // Back from inventory
  const btnBackFromInventory = $('btnBackFromInventory');
  if (btnBackFromInventory) {
    btnBackFromInventory.addEventListener('click', () => showExploreScreen());
  }

  // Battle item bag button
  const btnBattleItems = $('btnBattleItems');
  if (btnBattleItems) {
    btnBattleItems.addEventListener('click', () => {
      if (battleActive) showBattleItemBag();
    });
  }

  // ─── Achievements ───
  const ACHIEVEMENTS = [
    { id: 'first_blood',   name: 'Primera Sangre',    icon: '🗡️', desc: 'Gana tu primera batalla',           check: () => winsCount >= 1 },
    { id: 'fighter_10',    name: 'Luchador',           icon: '⚔️', desc: 'Gana 10 batallas',                  check: () => winsCount >= 10 },
    { id: 'champion_25',   name: 'Campeon',            icon: '🏆', desc: 'Gana 25 batallas',                  check: () => winsCount >= 25 },
    { id: 'legend_100',    name: 'Leyenda',            icon: '👑', desc: 'Gana 100 batallas',                 check: () => winsCount >= 100 },
    { id: 'collector_5',   name: 'Coleccionista',      icon: '📖', desc: 'Registra 5 criaturas en el bestiario', check: () => Object.keys(bestiary).length >= 5 },
    { id: 'collector_20',  name: 'Enciclopedista',     icon: '📚', desc: 'Registra 20 criaturas en el bestiario', check: () => Object.keys(bestiary).length >= 20 },
    { id: 'hoarder',       name: 'Acaparador',         icon: '🎒', desc: 'Ten 10+ objetos en la mochila',     check: () => inventory.length >= 10 },
    { id: 'evolved',       name: 'Evolucion',          icon: '🌟', desc: 'Evoluciona tu criatura',            check: () => playerLevel >= 5 },
    { id: 'mega',          name: 'Mega Evolucion',     icon: '💎', desc: 'Alcanza la forma Mega',             check: () => playerLevel >= 10 },
    { id: 'lv_20',         name: 'Veterano',           icon: '🎖️', desc: 'Alcanza el nivel 20',               check: () => playerLevel >= 20 },
    { id: 'perfect_win',   name: 'Victoria Perfecta',  icon: '✨', desc: 'Gana sin recibir dano',             check: () => lastBattlePerfect },
    { id: 'legendary_drop',name: 'Hallazgo Legendario',icon: '🔮', desc: 'Encuentra un objeto legendario',    check: () => foundLegendary },
  ];

  let unlockedAchievements = {};
  let lastBattlePerfect = false;
  let foundLegendary = false;

  function loadAchievements() {
    try {
      const raw = localStorage.getItem('lifemon_achievements');
      if (raw) unlockedAchievements = JSON.parse(raw);
    } catch(e) {}
  }

  function saveAchievements() {
    try {
      localStorage.setItem('lifemon_achievements', JSON.stringify(unlockedAchievements));
    } catch(e) {}
  }

  function checkAchievements() {
    let newlyUnlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (unlockedAchievements[ach.id]) continue;
      try {
        if (ach.check()) {
          unlockedAchievements[ach.id] = Date.now();
          newlyUnlocked.push(ach);
        }
      } catch(e) {}
    }
    if (newlyUnlocked.length > 0) {
      saveAchievements();
      // Show toast for each new achievement
      newlyUnlocked.forEach((ach, i) => {
        setTimeout(() => showAchievementToast(ach), i * 1500);
      });
    }
  }

  function showAchievementToast(ach) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `<span class="ach-toast-icon">${ach.icon}</span><div><strong>Logro desbloqueado!</strong><br>${ach.name}</div>`;
    document.body.appendChild(toast);
    SoundEngine.levelUp();
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function showAchievementsScreen() {
    showScreen('screen-achievements');
    const grid = $('achievementsGrid');
    if (!grid) return;

    const total = ACHIEVEMENTS.length;
    const unlocked = Object.keys(unlockedAchievements).length;
    const countEl = $('achievementsCount');
    if (countEl) countEl.textContent = `${unlocked}/${total}`;

    grid.innerHTML = ACHIEVEMENTS.map(ach => {
      const done = !!unlockedAchievements[ach.id];
      return `<div class="ach-item ${done ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${done ? ach.icon : '🔒'}</span>
        <div class="ach-info">
          <span class="ach-name">${ach.name}</span>
          <span class="ach-desc">${ach.desc}</span>
        </div>
        ${done ? '<span class="ach-check">✓</span>' : ''}
      </div>`;
    }).join('');
  }

  // Achievements button
  const btnAchievements = $('btnAchievements');
  if (btnAchievements) {
    btnAchievements.addEventListener('click', showAchievementsScreen);
  }
  const btnBackFromAchievements = $('btnBackFromAchievements');
  if (btnBackFromAchievements) {
    btnBackFromAchievements.addEventListener('click', () => showExploreScreen());
  }

  // ─── Type chart screen ───
  function showTypeChartScreen() {
    showScreen('screen-typechart');
    const grid = $('typeChartGrid');
    if (!grid) return;

    grid.innerHTML = Object.entries(LifeEngine.TYPES).map(([key, type]) => {
      const strong = LifeEngine.TYPES[type.strong];
      const weak = LifeEngine.TYPES[type.weak];
      return `<div class="typechart-row" style="border-left: 3px solid ${type.color}">
        <div class="tc-type">
          <span class="tc-icon">${type.icon}</span>
          <span class="tc-name" style="color:${type.color}">${type.name}</span>
        </div>
        <div class="tc-matchups">
          <span class="tc-strong">⚡ Fuerte vs ${strong ? strong.icon + ' ' + strong.name : '?'}</span>
          <span class="tc-weak">🛡️ Debil vs ${weak ? weak.icon + ' ' + weak.name : '?'}</span>
        </div>
      </div>`;
    }).join('');
  }

  const btnTypeChart = $('btnTypeChart');
  if (btnTypeChart) {
    btnTypeChart.addEventListener('click', showTypeChartScreen);
  }
  const btnBackFromTypeChart = $('btnBackFromTypeChart');
  if (btnBackFromTypeChart) {
    btnBackFromTypeChart.addEventListener('click', () => showExploreScreen());
  }

  // ─── Daily Boss ───
  const BOSS_NAMES = ['Titanox', 'Omegaron', 'Supremax', 'Eternix', 'Colossur', 'Primordex', 'Infinor'];

  function getDailyBossSeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function isDailyBossDefeated() {
    try {
      const data = localStorage.getItem('lifemon_daily_boss');
      if (!data) return false;
      const parsed = JSON.parse(data);
      return parsed.seed === getDailyBossSeed();
    } catch(e) { return false; }
  }

  function markDailyBossDefeated() {
    try {
      localStorage.setItem('lifemon_daily_boss', JSON.stringify({ seed: getDailyBossSeed() }));
    } catch(e) {}
  }

  function generateDailyBoss() {
    const seed = getDailyBossSeed();
    const rng = LifeEngine.seededRandom(seed);
    const typeKeys = Object.keys(LifeEngine.TYPES);
    const type = typeKeys[Math.floor(rng() * typeKeys.length)];
    const name = BOSS_NAMES[Math.floor(rng() * BOSS_NAMES.length)];
    const level = Math.max(5, playerLevel + 3 + Math.floor(rng() * 3));
    const mult = 1.2 + (level * 0.12);
    const base = 50;

    return {
      name: name,
      type: type,
      secondaryType: typeKeys[Math.floor(rng() * typeKeys.length)],
      typeInfo: LifeEngine.TYPES[type],
      secondaryTypeInfo: LifeEngine.TYPES[typeKeys[Math.floor(rng() * typeKeys.length)]],
      stats: {
        hp:  Math.floor((base + 100 + rng() * 50) * mult),
        atk: Math.floor((base + 10 + rng() * 50) * mult),
        def: Math.floor((base + 10 + rng() * 50) * mult),
        spd: Math.floor((base + rng() * 50) * mult),
        int: Math.floor((base + rng() * 50) * mult),
        cha: Math.floor((base + rng() * 50) * mult),
      },
      abilities: (LifeEngine.TYPES[type] ? [] : []).length === 0 ? (() => {
        // Use same ability pool approach
        const enemy = LifeEngine.generateEnemy(level);
        enemy.type = type;
        enemy.typeInfo = LifeEngine.TYPES[type];
        return enemy.abilities;
      })() : [],
      bio: '',
      level: level,
      isBoss: true,
    };
  }

  function renderDailyBoss() {
    const container = $('dailyBossCard');
    if (!container) return;
    const defeated = isDailyBossDefeated();
    const seed = getDailyBossSeed();
    const rng = LifeEngine.seededRandom(seed);
    const typeKeys = Object.keys(LifeEngine.TYPES);
    const type = typeKeys[Math.floor(rng() * typeKeys.length)];
    const typeInfo = LifeEngine.TYPES[type];
    const name = BOSS_NAMES[Math.floor(rng() * BOSS_NAMES.length)];

    if (defeated) {
      container.innerHTML = `<div class="daily-boss defeated">
        <span class="boss-icon">✅</span>
        <div class="boss-info">
          <span class="boss-name">${name} derrotado</span>
          <span class="boss-desc">Vuelve manana para un nuevo desafio</span>
        </div>
      </div>`;
    } else {
      container.innerHTML = `<div class="daily-boss" id="btnDailyBoss">
        <span class="boss-icon">👹</span>
        <div class="boss-info">
          <span class="boss-name">Jefe diario: ${name}</span>
          <span class="boss-desc">${typeInfo.icon} ${typeInfo.name} · Recompensas raras garantizadas</span>
        </div>
        <span class="boss-go">⚔️</span>
      </div>`;

      const btn = $('btnDailyBoss');
      if (btn) {
        btn.addEventListener('click', startDailyBoss);
      }
    }
  }

  function startDailyBoss() {
    if (!playerCreature) return;
    currentRegion = null;
    showScreen('screen-battle');
    battleActive = true;

    enemyCreature = generateDailyBoss();
    // Fix: generate proper abilities for boss
    const bossEnemy = LifeEngine.generateEnemy(enemyCreature.level);
    enemyCreature.abilities = bossEnemy.abilities;
    enemyCreature.isBoss = true;
    battlesCount++;

    playerHp = playerCreature.stats.hp;
    enemyHp = enemyCreature.stats.hp;
    playerCreature.abilities.forEach(a => a.pp = a.maxPp);

    $('playerName').textContent = creatureNickname || playerCreature.name;
    $('enemyName').textContent = '👹 ' + enemyCreature.name;
    $('enemyLevel').textContent = enemyCreature.level;
    $('logPlayerName').textContent = creatureNickname || playerCreature.name;
    const plvEl = $('playerLevel');
    if (plvEl) plvEl.textContent = playerLevel;

    CreatureRenderer.render($('playerCanvas'), playerCreature, { noShadow: true, level: playerLevel });
    CreatureRenderer.render($('enemyCanvas'), enemyCreature, { noShadow: true, level: enemyCreature.level });

    updateHpBars();
    renderMoves();
    setLog(`¡El jefe diario ${enemyCreature.name} aparece! Un enemigo formidable...`);
    SoundEngine.encounter();
  }

  // ─── Load saved game on startup ───
  loadBestiary();
  loadInventory();
  loadAchievements();
  const saved = loadProgress();
  if (saved && saved.text) {
    const intro = document.querySelector('.intro-container');
    if (intro) {
      const continueBtn = document.createElement('button');
      continueBtn.className = 'btn-continue';
      continueBtn.innerHTML = `<span>⚡</span> Continuar (Nv. ${saved.level || 1} · ${saved.wins || 0} victorias)`;
      continueBtn.addEventListener('click', () => {
        playerText = saved.text;
        playerXp = saved.xp || 0;
        playerLevel = saved.level || 1;
        winsCount = saved.wins || 0;
        battlesCount = saved.battles || 0;
        creatureNickname = saved.nickname || '';
        playerCreature = LifeEngine.generate(saved.text);
        if (playerCreature && saved.stats) {
          playerCreature.stats = { ...saved.stats };
        }
        if (playerCreature) {
          revealCreature(saved.text);
        }
      });
      intro.appendChild(continueBtn);
    }
  }
})();
