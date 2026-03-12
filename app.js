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

  // ─── Battle button ───
  const btnBattle = $('btnBattle');
  if (btnBattle) {
    btnBattle.addEventListener('click', startBattle);
  }

  const btnReroll = $('btnReroll');
  if (btnReroll) {
    btnReroll.addEventListener('click', () => {
      if (playerText) {
        // Modify text slightly for different result
        playerText += ' ' + Date.now();
        startGeneration(playerText);
      }
    });
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
    btnPlayAgain.addEventListener('click', startBattle);
  }

  const btnBackToCard = $('btnBackToCard');
  if (btnBackToCard) {
    btnBackToCard.addEventListener('click', () => showScreen('screen-reveal'));
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
