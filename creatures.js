/**
 * LifeMon Creature Renderer — Pixel art generation on canvas
 */
const CreatureRenderer = (() => {

  // Color palettes per type
  const TYPE_PALETTES = {
    creativo:    { body: '#bd93f9', accent: '#ff79c6', eye: '#f8f8f2', bg: '#2d1b4e' },
    tecnico:     { body: '#8be9fd', accent: '#6272a4', eye: '#f8f8f2', bg: '#1a2a3e' },
    social:      { body: '#f1fa8c', accent: '#ffb86c', eye: '#282a36', bg: '#3e3a1a' },
    explorador:  { body: '#50fa7b', accent: '#8be9fd', eye: '#f8f8f2', bg: '#1a3e2a' },
    academico:   { body: '#6272a4', accent: '#bd93f9', eye: '#f8f8f2', bg: '#1a1a3e' },
    atletico:    { body: '#ff5555', accent: '#ffb86c', eye: '#f8f8f2', bg: '#3e1a1a' },
    emprendedor: { body: '#ffb86c', accent: '#f1fa8c', eye: '#282a36', bg: '#3e2a1a' },
    mistico:     { body: '#ff79c6', accent: '#bd93f9', eye: '#f8f8f2', bg: '#3e1a2e' },
  };

  // Body shapes (pixel patterns, 12x12 grid)
  // 0 = empty, 1 = body, 2 = accent, 3 = eye, 4 = dark
  const BODY_SHAPES = [
    // Shape 0: Round blob
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,3,3,1,1,3,3,1,1,0],
      [0,1,1,3,4,1,1,3,4,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,2,2,1,1,1,1,1],
      [1,1,2,1,1,1,1,1,1,2,1,1],
      [0,1,1,2,1,1,1,1,2,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,1,1,0,0,0],
      [0,0,0,1,1,0,0,1,1,0,0,0],
    ],
    // Shape 1: Spiky
    [
      [0,0,1,0,0,0,0,0,0,1,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,3,3,1,1,3,3,1,1,0],
      [1,1,1,3,4,1,1,3,4,1,1,1],
      [1,2,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,2,2,2,2,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,2,1,1,0,0,1,1,2,0,0],
      [0,0,0,1,0,0,0,0,1,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0],
    ],
    // Shape 2: Tall
    [
      [0,0,0,0,2,2,2,2,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,1,3,3,1,1,3,3,1,0,0],
      [0,0,1,3,4,1,1,3,4,1,0,0],
      [0,0,1,1,1,2,2,1,1,1,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,2,1,1,2,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,1,1,0,0,1,1,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0],
    ],
    // Shape 3: Wide
    [
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,3,3,1,1,3,3,1,1,0],
      [0,1,1,3,4,1,1,3,4,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,1,1,2,2,1,1,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,0,0,0,0,0,0,1,1,0],
      [0,1,1,0,0,0,0,0,0,1,1,0],
    ],
    // Shape 4: Dragon-like
    [
      [0,2,0,0,0,0,0,0,0,0,2,0],
      [0,2,1,0,0,0,0,0,0,1,2,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,3,3,1,1,3,3,1,1,1],
      [1,1,1,3,4,1,1,3,4,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,2,2,2,2,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [2,0,1,1,1,1,1,1,1,1,0,2],
      [0,0,0,1,1,0,0,1,1,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0],
      [0,0,2,0,0,0,0,0,0,2,0,0],
    ],
    // Shape 5: Ghost-like
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,3,3,1,1,3,3,1,1,0],
      [0,1,1,3,4,1,1,3,4,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,2,1,1,2,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,0,1,1,0,0,1,1,0,1,0],
      [0,1,0,0,1,0,0,1,0,0,1,0],
    ],
    // Shape 6: Serpent
    [
      [0,0,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,3,3,1,0,0,0],
      [0,0,0,0,1,1,3,4,1,0,0,0],
      [0,0,0,1,1,2,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,0,0,0,0,0],
      [0,1,1,2,1,1,0,0,0,0,0,0],
      [0,1,1,1,1,0,0,0,0,0,0,0],
      [0,0,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,1,2,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,2,0,0,0,0],
    ],
    // Shape 7: Bird/Winged
    [
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,1,3,3,3,3,1,0,0,0],
      [0,0,0,1,3,4,3,4,1,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [2,2,0,1,1,1,1,1,1,0,2,2],
      [0,2,2,1,1,2,2,1,1,2,2,0],
      [0,0,2,1,1,1,1,1,1,2,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,1,0,0,1,0,0,0,0],
      [0,0,0,1,1,0,0,1,1,0,0,0],
    ],
    // Shape 8: Insect/Multi-leg
    [
      [0,0,0,2,0,0,0,0,2,0,0,0],
      [0,0,0,0,2,1,1,2,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,3,1,1,3,1,1,0,0],
      [0,0,1,1,4,1,1,4,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,2,2,1,1,2,2,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,2,0,1,1,0,0,1,1,0,2,0],
      [2,0,0,0,1,0,0,1,0,0,0,2],
      [0,0,0,1,0,0,0,0,1,0,0,0],
      [0,0,1,0,0,0,0,0,0,1,0,0],
    ],
    // Shape 9: Golem/Rock
    [
      [0,0,0,2,2,2,2,2,2,0,0,0],
      [0,0,2,1,1,1,1,1,1,2,0,0],
      [0,2,1,1,1,1,1,1,1,1,2,0],
      [0,1,1,1,3,1,1,3,1,1,1,0],
      [0,1,1,1,4,1,1,4,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,2,2,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,0,0,0,0,1,1,0,0],
      [0,1,1,1,0,0,0,0,1,1,1,0],
    ],
    // Shape 10: Feline
    [
      [0,2,0,0,0,0,0,0,0,0,2,0],
      [0,2,1,0,0,0,0,0,0,1,2,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,1,3,3,1,1,3,3,1,0,0],
      [0,0,1,3,4,1,1,3,4,1,0,0],
      [0,0,1,1,1,2,2,1,1,1,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,0,1,1,0,0,0,0,1,1,0,0],
      [0,0,1,0,0,0,0,0,0,1,0,0],
      [0,0,2,0,0,0,0,0,0,2,0,0],
    ],
    // Shape 11: Jellyfish
    [
      [0,0,0,0,2,2,2,2,0,0,0,0],
      [0,0,0,2,1,1,1,1,2,0,0,0],
      [0,0,2,1,1,1,1,1,1,2,0,0],
      [0,2,1,1,3,1,1,3,1,1,2,0],
      [0,2,1,1,4,1,1,4,1,1,2,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,2,1,1,2,1,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,1,0,0,1,1,0,0,1,0,0],
      [0,1,0,0,1,0,0,1,0,0,1,0],
      [1,0,0,1,0,0,0,0,1,0,0,1],
      [0,0,1,0,0,0,0,0,0,1,0,0],
    ],
  ];

  // Evolution stage names
  const EVO_STAGES = ['Base', 'Evo', 'Mega'];

  function getEvoStage(level) {
    if (level >= 10) return 2; // Mega
    if (level >= 5) return 1;  // Evo
    return 0;                   // Base
  }

  function getEvoStageName(level) {
    return EVO_STAGES[getEvoStage(level)];
  }

  function render(canvas, creature, opts = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const palette = TYPE_PALETTES[creature.type] || TYPE_PALETTES.tecnico;
    const level = opts.level || creature.level || 1;
    const evoStage = getEvoStage(level);

    // Pick shape based on seed + evolution stage (different shape per stage)
    const baseSeed = creature.seed || 0;
    const shapeIdx = (baseSeed + evoStage * 4) % BODY_SHAPES.length;
    const shape = BODY_SHAPES[shapeIdx];

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Pixel size
    const gridSize = 12;
    const px = Math.floor(Math.min(w, h) / gridSize);
    const offsetX = Math.floor((w - gridSize * px) / 2);
    const offsetY = Math.floor((h - gridSize * px) / 2);

    // Evolved palettes get brighter/more saturated
    const bodyColor = evoStage >= 2 ? shadeColor(palette.body, 20) : evoStage >= 1 ? shadeColor(palette.body, 10) : palette.body;
    const accentColor = evoStage >= 2 ? shadeColor(palette.accent, 25) : evoStage >= 1 ? shadeColor(palette.accent, 12) : palette.accent;

    // Color map
    const colors = {
      0: null,
      1: bodyColor,
      2: accentColor,
      3: palette.eye,
      4: '#000000',
    };

    // Draw with slight variation based on seed
    const rng = LifeEngine.seededRandom(baseSeed);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const val = shape[y]?.[x] || 0;
        if (val === 0) continue;

        let color = colors[val];

        // Add slight shade variation to body pixels
        if (val === 1 && rng() > 0.7) {
          color = shadeColor(bodyColor, -15);
        }
        if (val === 2 && rng() > 0.5) {
          color = shadeColor(accentColor, 10);
        }

        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x * px, offsetY + y * px, px, px);
      }
    }

    // Evo glow effect (stage 1+)
    if (evoStage >= 1 && !opts.noGlow) {
      ctx.save();
      ctx.globalAlpha = evoStage >= 2 ? 0.25 : 0.12;
      ctx.shadowColor = palette.body;
      ctx.shadowBlur = evoStage >= 2 ? 20 : 10;
      ctx.fillStyle = palette.body;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, gridSize * px * 0.35, gridSize * px * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Mega crown/mark (stage 2)
    if (evoStage >= 2) {
      ctx.fillStyle = palette.accent;
      const crownY = offsetY - px;
      const cx = w / 2;
      // Small diamond mark above head
      ctx.beginPath();
      ctx.moveTo(cx, crownY - px * 1.5);
      ctx.lineTo(cx + px, crownY);
      ctx.lineTo(cx, crownY + px * 0.5);
      ctx.lineTo(cx - px, crownY);
      ctx.closePath();
      ctx.fill();
    }

    // Add a subtle shadow
    if (!opts.noShadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 6, gridSize * px * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function shadeColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  return { render, TYPE_PALETTES, getEvoStage, getEvoStageName };
})();
