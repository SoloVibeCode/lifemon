/**
 * LifeMon Battle System — Turn-based combat
 */
const BattleSystem = (() => {
  const TYPES = LifeEngine.TYPES;

  function typeMultiplier(atkType, defType) {
    const info = TYPES[atkType];
    if (!info) return 1;
    if (info.strong === defType) return 1.5;
    if (info.weak === defType) return 0.65;
    return 1;
  }

  function calcDamage(attacker, move, defender) {
    if (move.heal) return 0;

    const atkStat = attacker.stats.atk;
    const defStat = defender.stats.def;
    const power = move.power || 50;

    // Base damage formula (Pokemon-inspired)
    const base = ((2 * 1 / 5 + 2) * power * (atkStat / defStat)) / 50 + 2;

    // Type effectiveness
    const mult = typeMultiplier(move.type, defender.type);

    // STAB (Same Type Attack Bonus)
    const stab = (move.type === attacker.type || move.type === attacker.secondaryType) ? 1.3 : 1;

    // Random variance (0.85 - 1.0)
    const rand = 0.85 + Math.random() * 0.15;

    return Math.max(1, Math.floor(base * mult * stab * rand));
  }

  function calcHeal(move, creature) {
    if (!move.heal) return 0;
    return Math.floor(move.heal + creature.stats.def * 0.2 + Math.random() * 10);
  }

  function effectivenessText(atkType, defType) {
    const mult = typeMultiplier(atkType, defType);
    if (mult > 1) return '¡Es super efectivo!';
    if (mult < 1) return 'No es muy efectivo...';
    return '';
  }

  // Simple AI for enemy moves
  function pickEnemyMove(enemy, player) {
    const available = enemy.abilities.filter(m => m.pp > 0);
    if (!available.length) return null;

    // If HP < 30%, try to heal
    const hpPct = enemy.currentHp / enemy.stats.hp;
    if (hpPct < 0.3) {
      const heals = available.filter(m => m.heal);
      if (heals.length) return heals[0];
    }

    // Pick best damage move considering type
    let best = available[0];
    let bestScore = 0;

    for (const m of available) {
      if (m.heal) continue;
      const mult = typeMultiplier(m.type, player.type);
      const stab = (m.type === enemy.type) ? 1.3 : 1;
      const score = (m.power || 50) * mult * stab;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    return best;
  }

  return { calcDamage, calcHeal, effectivenessText, pickEnemyMove, typeMultiplier };
})();
