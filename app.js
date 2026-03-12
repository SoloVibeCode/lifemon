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

  function addXp(amount) {
    playerXp += amount;
    while (playerXp >= xpForLevel(playerLevel + 1) && playerLevel < 50) {
      playerLevel++;
      // Boost stats on level up
      if (playerCreature) {
        playerCreature.stats.hp += 5 + Math.floor(Math.random() * 5);
        playerCreature.stats.atk += 1 + Math.floor(Math.random() * 3);
        playerCreature.stats.def += 1 + Math.floor(Math.random() * 3);
        playerCreature.stats.spd += 1 + Math.floor(Math.random() * 2);
        playerCreature.stats.int += 1 + Math.floor(Math.random() * 2);
        playerCreature.stats.cha += 1 + Math.floor(Math.random() * 2);
      }
    }
    saveProgress();
  }

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

  // ─── Intro screen ───
  const btnGenerate = $('btnGenerate');
  const lifeInput = $('lifeInput');

  if (btnGenerate) {
    btnGenerate.addEventListener('click', () => {
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

    // Name
    const nameEl = $('creatureName');
    if (nameEl) nameEl.textContent = playerCreature.name;

    // Level display
    const lvEl = document.querySelector('.creature-level');
    if (lvEl) lvEl.textContent = `Nv. ${playerLevel}`;

    // Type badge
    const badge = $('creatureTypeBadge');
    if (badge) {
      badge.textContent = playerCreature.typeInfo.icon + ' ' + playerCreature.typeInfo.name;
      badge.style.background = playerCreature.typeInfo.color + '22';
      badge.style.color = playerCreature.typeInfo.color;
      badge.style.border = `1px solid ${playerCreature.typeInfo.color}44`;
    }

    // Render creature on canvas
    const canvas = $('creatureCanvas');
    if (canvas) {
      CreatureRenderer.render(canvas, playerCreature);
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

    $('explorePlayerName').textContent = playerCreature.name;
    $('explorePlayerLevel').textContent = playerLevel;
    $('exploreWins').textContent = `${winsCount} victorias`;
    $('exploreBattles').textContent = `${battlesCount} batallas`;

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
        if (currentRegion) startRegionBattle();
      });
    });
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

    $('playerName').textContent = playerCreature.name;
    $('enemyName').textContent = enemyCreature.name;
    $('enemyLevel').textContent = enemyCreature.level || 1;
    $('logPlayerName').textContent = playerCreature.name;
    const plvEl = $('playerLevel');
    if (plvEl) plvEl.textContent = playerLevel;

    CreatureRenderer.render($('playerCanvas'), playerCreature, { noShadow: true });
    CreatureRenderer.render($('enemyCanvas'), enemyCreature, { noShadow: true });

    updateHpBars();
    renderMoves();
    setLog(`¡Un ${enemyCreature.name} salvaje aparece en ${currentRegion.name}!`);
  }

  const btnBackFromExplore = $('btnBackFromExplore');
  if (btnBackFromExplore) {
    btnBackFromExplore.addEventListener('click', () => showScreen('screen-reveal'));
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

    // Type badge
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.fillStyle = palette.body;
    ctx.fillText(playerCreature.typeInfo.icon + ' ' + playerCreature.typeInfo.name.toUpperCase() + ' · Nv. ' + playerLevel, 200, 72);

    // Render creature in center
    const creatureCanvas = document.createElement('canvas');
    creatureCanvas.width = 160;
    creatureCanvas.height = 160;
    CreatureRenderer.render(creatureCanvas, playerCreature);
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
    $('playerName').textContent = playerCreature.name;
    $('enemyName').textContent = enemyCreature.name;
    $('enemyLevel').textContent = enemyCreature.level || enemyLevel;
    $('logPlayerName').textContent = playerCreature.name;
    const plvEl = $('playerLevel');
    if (plvEl) plvEl.textContent = playerLevel;

    // Render creatures
    CreatureRenderer.render($('playerCanvas'), playerCreature, { noShadow: true });
    CreatureRenderer.render($('enemyCanvas'), enemyCreature, { noShadow: true });

    // Update HP bars
    updateHpBars();

    // Render moves
    renderMoves();

    // Battle log
    setLog(`¡Un ${enemyCreature.name} salvaje aparece!`);
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
    }).join('');

    // Add event listeners
    movesEl.querySelectorAll('.move-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!battleActive) return;
        const idx = parseInt(btn.dataset.idx);
        executeTurn(idx);
      });
    });
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
      const heal = BattleSystem.calcHeal(move, playerCreature);
      playerHp = Math.min(playerCreature.stats.hp, playerHp + heal);
      setLog(`${playerCreature.name} usa ${move.name}! Recupera ${heal} HP.`);
    } else {
      const dmg = BattleSystem.calcDamage(playerCreature, move, enemyCreature);
      enemyHp -= dmg;
      setLog(`${playerCreature.name} usa ${move.name}! Hace ${dmg} de dano.`);

      const eff = BattleSystem.effectivenessText(move.type, enemyCreature.type);
      if (eff) appendLog(eff);

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
        const heal = BattleSystem.calcHeal(enemyMove, enemyCreature);
        enemyHp = Math.min(enemyCreature.stats.hp, enemyHp + heal);
        appendLog(`${enemyCreature.name} usa ${enemyMove.name}! Recupera ${heal} HP.`);
      } else {
        const dmg = BattleSystem.calcDamage(enemyCreature, enemyMove, playerCreature);
        playerHp -= dmg;
        appendLog(`${enemyCreature.name} usa ${enemyMove.name}! Hace ${dmg} de dano.`);

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
    const prevLevel = playerLevel;

    if (won) {
      winsCount++;
      const enemyLv = enemyCreature.level || 1;
      const xpGain = 15 + enemyLv * 10 + Math.floor(Math.random() * 10);
      addXp(xpGain);

      setTimeout(() => {
        showScreen('screen-result');
        $('resultIcon').textContent = playerLevel > prevLevel ? '⭐' : '🏆';
        $('resultTitle').textContent = playerLevel > prevLevel ? `¡Nivel ${playerLevel}!` : '¡Victoria!';

        let text = `${playerCreature.name} derroto a ${enemyCreature.name}! +${xpGain} XP`;
        if (playerLevel > prevLevel) {
          text += ` — ¡Has subido a nivel ${playerLevel}! Stats mejorados.`;
        }
        $('resultText').textContent = text;

        renderResultXpBar();
      }, 1000);
    } else {
      const xpGain = 5 + Math.floor(Math.random() * 5);
      addXp(xpGain);

      setTimeout(() => {
        showScreen('screen-result');
        $('resultIcon').textContent = '💀';
        $('resultTitle').textContent = 'Derrotado...';
        $('resultText').textContent = `${enemyCreature.name} derroto a ${playerCreature.name}. +${xpGain} XP de consolacion. La vida sigue.`;
        renderResultXpBar();
      }, 1000);
    }
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
      try { localStorage.removeItem('lifemon_save'); } catch(e) {}
      if (lifeInput) lifeInput.value = '';
      showScreen('screen-intro');
    });
  }

  // ─── Load saved game on startup ───
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
