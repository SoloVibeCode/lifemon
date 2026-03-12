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

    // Generate enemy
    const level = 1 + Math.floor(Math.random() * 2);
    enemyCreature = LifeEngine.generateEnemy(level);

    // Set HP
    playerHp = playerCreature.stats.hp;
    enemyHp = enemyCreature.stats.hp;

    // Reset PP
    playerCreature.abilities.forEach(a => a.pp = a.maxPp);
    enemyCreature.abilities.forEach(a => a.pp = a.maxPp);

    // Render names
    $('playerName').textContent = playerCreature.name;
    $('enemyName').textContent = enemyCreature.name;
    $('enemyLevel').textContent = enemyCreature.level || level;
    $('logPlayerName').textContent = playerCreature.name;

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
    setTimeout(() => {
      showScreen('screen-result');

      $('resultIcon').textContent = won ? '🏆' : '💀';
      $('resultTitle').textContent = won ? '¡Victoria!' : 'Derrotado...';
      $('resultText').textContent = won
        ? `${playerCreature.name} ha derrotado a ${enemyCreature.name}! Tu experiencia de vida te da fuerza.`
        : `${enemyCreature.name} ha derrotado a ${playerCreature.name}. Pero la vida sigue, y habra revancha.`;
    }, 1000);
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
      if (lifeInput) lifeInput.value = '';
      showScreen('screen-intro');
    });
  }
})();
