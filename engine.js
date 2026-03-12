/**
 * LifeMon Engine — Text analysis and creature generation
 */
const LifeEngine = (() => {
  // ─── Type System ───
  const TYPES = {
    creativo:    { name: 'Creativo',    color: '#bd93f9', icon: '🎨', strong: 'academico',   weak: 'tecnico' },
    tecnico:     { name: 'Tecnico',     color: '#8be9fd', icon: '💻', strong: 'creativo',    weak: 'social' },
    social:      { name: 'Social',      color: '#f1fa8c', icon: '🤝', strong: 'tecnico',     weak: 'atletico' },
    explorador:  { name: 'Explorador',  color: '#50fa7b', icon: '🌍', strong: 'mistico',     weak: 'emprendedor' },
    academico:   { name: 'Academico',   color: '#6272a4', icon: '📚', strong: 'emprendedor', weak: 'creativo' },
    atletico:    { name: 'Atletico',    color: '#ff5555', icon: '💪', strong: 'social',      weak: 'mistico' },
    emprendedor: { name: 'Emprendedor', color: '#ffb86c', icon: '🚀', strong: 'atletico',    weak: 'explorador' },
    mistico:     { name: 'Mistico',     color: '#ff79c6', icon: '✨', strong: 'explorador',  weak: 'atletico' },
  };

  // ─── Keyword → Type mapping ───
  const TYPE_KEYWORDS = {
    creativo: [
      'arte', 'artista', 'musica', 'musico', 'pintura', 'diseño', 'diseno', 'escritor',
      'escritura', 'poeta', 'creativo', 'creativa', 'fotografia', 'cine', 'teatro',
      'baile', 'danza', 'dibujo', 'escultura', 'composicion', 'imaginacion',
      'art', 'artist', 'music', 'musician', 'painting', 'design', 'writer', 'creative',
      'photography', 'film', 'dance', 'drawing',
    ],
    tecnico: [
      'programador', 'programacion', 'codigo', 'software', 'ingeniero', 'ingenieria',
      'computadora', 'tecnologia', 'developer', 'datos', 'algoritmo', 'sistemas',
      'robot', 'ia', 'inteligencia artificial', 'hacker', 'web', 'app',
      'programmer', 'programming', 'code', 'engineer', 'engineering', 'computer',
      'technology', 'data', 'algorithm', 'ai', 'machine learning',
    ],
    social: [
      'lider', 'comunidad', 'equipo', 'comunicacion', 'amigos', 'familia', 'social',
      'politica', 'voluntario', 'ensenar', 'profesor', 'coach', 'mentor', 'networking',
      'relaciones', 'gente', 'personas', 'carisma', 'influencer',
      'leader', 'community', 'team', 'communication', 'friends', 'family', 'teacher',
      'people', 'charisma',
    ],
    explorador: [
      'viaje', 'viajar', 'paises', 'aventura', 'montaña', 'montana', 'naturaleza',
      'explorar', 'mundo', 'culturas', 'mochilero', 'senderismo', 'camping',
      'oceano', 'selva', 'desierto', 'expedicion', 'descubrir', 'nomada',
      'travel', 'countries', 'adventure', 'mountain', 'nature', 'explore', 'world',
      'cultures', 'backpacker', 'hiking', 'discover', 'nomad',
    ],
    academico: [
      'universidad', 'estudio', 'investigacion', 'ciencia', 'libro', 'lectura',
      'doctorado', 'master', 'tesis', 'profesor', 'academia', 'conocimiento',
      'filosofia', 'historia', 'matematicas', 'fisica', 'quimica', 'biologia',
      'university', 'study', 'research', 'science', 'book', 'reading', 'phd',
      'thesis', 'knowledge', 'philosophy', 'history', 'math', 'physics',
    ],
    atletico: [
      'deporte', 'deportista', 'futbol', 'basket', 'correr', 'maraton', 'gimnasio',
      'fitness', 'entrenamiento', 'competicion', 'musculos', 'resistencia', 'fuerza',
      'natacion', 'ciclismo', 'boxeo', 'artes marciales', 'crossfit', 'yoga',
      'sport', 'athlete', 'football', 'soccer', 'running', 'marathon', 'gym',
      'training', 'competition', 'strength', 'swimming', 'cycling',
    ],
    emprendedor: [
      'negocio', 'empresa', 'startup', 'emprendedor', 'emprender', 'dinero', 'inversion',
      'ceo', 'fundador', 'vender', 'ventas', 'marketing', 'producto', 'mercado',
      'beneficio', 'autonomo', 'freelance', 'innovacion', 'comercio', 'economia',
      'business', 'company', 'entrepreneur', 'money', 'investment', 'founder',
      'sales', 'profit', 'freelancer', 'innovation', 'commerce',
    ],
    mistico: [
      'espiritual', 'meditacion', 'alma', 'energia', 'universo', 'intuicion',
      'suenos', 'sueños', 'cosmos', 'destino', 'zen', 'mindfulness', 'paz',
      'consciencia', 'tarot', 'astrologia', 'chakra', 'sabiduria', 'iluminacion',
      'spiritual', 'meditation', 'soul', 'energy', 'universe', 'intuition',
      'dreams', 'destiny', 'wisdom', 'enlightenment',
    ],
  };

  // ─── Ability pools per type ───
  const ABILITY_POOLS = {
    creativo: [
      { name: 'Inspiracion', power: 65, type: 'creativo', desc: 'Onda de creatividad pura' },
      { name: 'Musa Salvaje', power: 80, type: 'creativo', desc: 'Invoca la musa interior' },
      { name: 'Paleta Cromatica', power: 50, type: 'creativo', desc: 'Explosion de colores' },
      { name: 'Melodia Hipnotica', power: 70, type: 'creativo', desc: 'Sonido que paraliza' },
    ],
    tecnico: [
      { name: 'Debug Fatal', power: 75, type: 'tecnico', desc: 'Encuentra y explota el error' },
      { name: 'Overflow', power: 85, type: 'tecnico', desc: 'Sobrecarga de datos' },
      { name: 'Firewall', power: 40, type: 'tecnico', desc: 'Escudo digital', heal: 30 },
      { name: 'Algoritmo Oscuro', power: 70, type: 'tecnico', desc: 'Calculo letal' },
    ],
    social: [
      { name: 'Discurso', power: 60, type: 'social', desc: 'Palabras que hieren' },
      { name: 'Red de Contactos', power: 50, type: 'social', desc: 'Pide refuerzos', heal: 25 },
      { name: 'Carisma Brutal', power: 80, type: 'social', desc: 'Encanto irresistible' },
      { name: 'Negociacion', power: 65, type: 'social', desc: 'Convence y debilita' },
    ],
    explorador: [
      { name: 'Tormenta Arena', power: 70, type: 'explorador', desc: 'Arena del desierto' },
      { name: 'Brujula Vital', power: 45, type: 'explorador', desc: 'Encuentra el camino', heal: 35 },
      { name: 'Avalancha', power: 85, type: 'explorador', desc: 'Fuerza de la montaña' },
      { name: 'Viento Nomada', power: 60, type: 'explorador', desc: 'Rafaga viajera' },
    ],
    academico: [
      { name: 'Tesis Mortal', power: 75, type: 'academico', desc: 'Conocimiento aplastante' },
      { name: 'Cita Bibliografica', power: 50, type: 'academico', desc: 'Referencia precisa' },
      { name: 'Eureka', power: 90, type: 'academico', desc: 'Descubrimiento devastador' },
      { name: 'Estudio Profundo', power: 40, type: 'academico', desc: 'Concentracion sanadora', heal: 30 },
    ],
    atletico: [
      { name: 'Sprint Brutal', power: 70, type: 'atletico', desc: 'Velocidad letal' },
      { name: 'Golpe Titan', power: 85, type: 'atletico', desc: 'Puño de acero' },
      { name: 'Resistencia', power: 35, type: 'atletico', desc: 'Aguanta y recupera', heal: 40 },
      { name: 'Patada Voladora', power: 75, type: 'atletico', desc: 'Ataque aereo' },
    ],
    emprendedor: [
      { name: 'Pitch Perfecto', power: 65, type: 'emprendedor', desc: 'Presentacion letal' },
      { name: 'Leverage', power: 80, type: 'emprendedor', desc: 'Apalancamiento brutal' },
      { name: 'Pivot', power: 45, type: 'emprendedor', desc: 'Cambia de estrategia', heal: 25 },
      { name: 'Disrupcion', power: 90, type: 'emprendedor', desc: 'Rompe el mercado' },
    ],
    mistico: [
      { name: 'Meditacion', power: 30, type: 'mistico', desc: 'Paz interior', heal: 45 },
      { name: 'Vision Cosmica', power: 75, type: 'mistico', desc: 'Ve mas alla' },
      { name: 'Karma', power: 80, type: 'mistico', desc: 'Lo que das, vuelve' },
      { name: 'Chakra Blast', power: 70, type: 'mistico', desc: 'Energia espiritual' },
    ],
  };

  // ─── Creature name parts ───
  const NAME_PREFIXES = [
    'Lumi', 'Dra', 'Fen', 'Zor', 'Kra', 'Vel', 'Nyx', 'Sol',
    'Tor', 'Axi', 'Pyr', 'Gal', 'Ori', 'Zan', 'Bri', 'Cel',
    'Eko', 'Flo', 'Hex', 'Ion', 'Kai', 'Mor', 'Neo', 'Rix',
  ];
  const NAME_SUFFIXES = [
    'mon', 'zar', 'don', 'rex', 'lux', 'fox', 'mus', 'tor',
    'nix', 'bus', 'cor', 'dex', 'fur', 'gen', 'hex', 'jin',
    'kin', 'lex', 'max', 'nor', 'pax', 'que', 'rok', 'syn',
  ];

  // ─── Hash function ───
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  // ─── Seeded random ───
  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // ─── Analyze text for type scores ───
  function analyzeText(text) {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const scores = {};

    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
      scores[type] = 0;
      for (const kw of keywords) {
        // Check single words and multi-word phrases
        if (kw.includes(' ')) {
          const count = (lower.match(new RegExp(kw, 'gi')) || []).length;
          scores[type] += count * 3;
        } else {
          for (const w of words) {
            if (w.includes(kw) || kw.includes(w)) {
              scores[type] += 2;
            }
          }
        }
      }
    }

    // Sort by score
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return {
      primary: sorted[0][0],
      secondary: sorted[1] ? sorted[1][0] : sorted[0][0],
      scores,
    };
  }

  // ─── Generate stats from text ───
  function generateStats(text, typeAnalysis) {
    const h = hash(text);
    const rng = seededRandom(h);
    const len = text.length;

    // Base stats influenced by text characteristics
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = (text.match(/[.!?]+/g) || []).length || 1;
    const avgWordLen = len / Math.max(wordCount, 1);

    // Generate stats with some variance
    const base = 40;
    const variance = 35;

    const stats = {
      hp:  Math.min(200, Math.max(80, base + 80 + Math.floor(rng() * variance) + Math.floor(wordCount / 5))),
      atk: Math.min(120, Math.max(30, base + Math.floor(rng() * variance) + Math.floor(avgWordLen * 3))),
      def: Math.min(120, Math.max(30, base + Math.floor(rng() * variance) + Math.floor(sentenceCount * 2))),
      spd: Math.min(120, Math.max(30, base + Math.floor(rng() * variance) + Math.floor(Math.min(wordCount, 50)))),
      int: Math.min(120, Math.max(30, base + Math.floor(rng() * variance) + Math.floor(len / 30))),
      cha: Math.min(120, Math.max(30, base + Math.floor(rng() * variance) + Math.floor(sentenceCount * 3))),
    };

    // Boost stats based on primary type
    const boosts = {
      creativo: { cha: 15, int: 10 },
      tecnico: { int: 20, spd: 5 },
      social: { cha: 20, def: 5 },
      explorador: { spd: 15, hp: 10 },
      academico: { int: 20, def: 10 },
      atletico: { atk: 15, hp: 15 },
      emprendedor: { cha: 10, atk: 10, spd: 5 },
      mistico: { int: 10, def: 10, hp: 5 },
    };

    const boost = boosts[typeAnalysis.primary] || {};
    for (const [k, v] of Object.entries(boost)) {
      stats[k] = Math.min(k === 'hp' ? 250 : 130, stats[k] + v);
    }

    return stats;
  }

  // ─── Generate creature name ───
  function generateName(text) {
    const h = hash(text);
    const rng = seededRandom(h + 42);
    const prefix = NAME_PREFIXES[Math.floor(rng() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(rng() * NAME_SUFFIXES.length)];
    return prefix + suffix;
  }

  // ─── Pick abilities ───
  function pickAbilities(typeAnalysis, text) {
    const h = hash(text);
    const rng = seededRandom(h + 99);

    const primary = ABILITY_POOLS[typeAnalysis.primary] || ABILITY_POOLS.tecnico;
    const secondary = ABILITY_POOLS[typeAnalysis.secondary] || ABILITY_POOLS.social;

    // Pick 2 from primary, 2 from secondary
    const shuffle = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const moves = [
      ...shuffle(primary).slice(0, 2),
      ...shuffle(secondary).slice(0, 2),
    ];

    // Add PP
    return moves.map(m => ({
      ...m,
      pp: Math.floor(rng() * 5) + 5,
      maxPp: 0, // set below
    })).map(m => ({ ...m, maxPp: m.pp }));
  }

  // ─── Generate bio ───
  function generateBio(name, typeAnalysis, stats) {
    const type = TYPES[typeAnalysis.primary];
    const secondary = TYPES[typeAnalysis.secondary];

    const bios = [
      `${name} nacio de las experiencias de una vida ${type.name.toLowerCase()}. Su naturaleza ${secondary.name.toLowerCase()} le da un equilibrio unico.`,
      `Criatura forjada en vivencias reales. La esencia ${type.name.toLowerCase()} fluye por sus venas, con toques de espiritu ${secondary.name.toLowerCase()}.`,
      `Una entidad ${type.name.toLowerCase()} que canaliza la fuerza de una vida vivida. Su lado ${secondary.name.toLowerCase()} le otorga profundidad.`,
    ];

    const h = hash(name);
    return bios[h % bios.length];
  }

  // ─── Main: Generate creature ───
  function generate(text) {
    if (!text || text.trim().length < 20) {
      return null;
    }

    const trimmed = text.trim();
    const typeAnalysis = analyzeText(trimmed);
    const stats = generateStats(trimmed, typeAnalysis);
    const name = generateName(trimmed);
    const abilities = pickAbilities(typeAnalysis, trimmed);
    const bio = generateBio(name, typeAnalysis, stats);

    return {
      name,
      type: typeAnalysis.primary,
      secondaryType: typeAnalysis.secondary,
      typeInfo: TYPES[typeAnalysis.primary],
      secondaryTypeInfo: TYPES[typeAnalysis.secondary],
      stats,
      abilities,
      bio,
      seed: hash(trimmed),
      sourceLength: trimmed.length,
    };
  }

  // ─── Generate random enemy ───
  function generateEnemy(level) {
    const typeKeys = Object.keys(TYPES);
    const rng = seededRandom(Date.now());
    const type = typeKeys[Math.floor(rng() * typeKeys.length)];
    const secondary = typeKeys[Math.floor(rng() * typeKeys.length)];

    const name = NAME_PREFIXES[Math.floor(rng() * NAME_PREFIXES.length)] +
                 NAME_SUFFIXES[Math.floor(rng() * NAME_SUFFIXES.length)];

    const mult = 0.8 + (level * 0.1);
    const base = 40;
    const stats = {
      hp:  Math.floor((base + 80 + rng() * 40) * mult),
      atk: Math.floor((base + rng() * 40) * mult),
      def: Math.floor((base + rng() * 40) * mult),
      spd: Math.floor((base + rng() * 40) * mult),
      int: Math.floor((base + rng() * 40) * mult),
      cha: Math.floor((base + rng() * 40) * mult),
    };

    const pool = ABILITY_POOLS[type] || ABILITY_POOLS.tecnico;
    const abilities = pool.map(m => ({ ...m, pp: m.heal ? 3 : 8, maxPp: m.heal ? 3 : 8 }));

    return {
      name,
      type,
      secondaryType: secondary,
      typeInfo: TYPES[type],
      secondaryTypeInfo: TYPES[secondary],
      stats,
      abilities,
      bio: '',
      level: level || 1,
    };
  }

  return { TYPES, generate, generateEnemy, hash, seededRandom };
})();
