export const ARENA = Object.freeze({
  width: 960,
  height: 540,
  margin: 32,
});

export const CAT_SCOUT = Object.freeze({
  id: 'cat-scout',
  name: '猫 · 瞭望员',
  maxHp: 100,
  moveSpeed: 210,
  precision: 0.78,
  invulnerabilitySeconds: 0.55,
  radius: 18,
});

export const EMBER_REPEATER = Object.freeze({
  id: 'ember-repeater',
  name: '余烬连弩',
  attackInterval: 0.38,
  projectileSpeed: 660,
  projectileLife: 1.35,
  projectileRadius: 5,
  range: 620,
  damageMin: 10,
  damageMax: 18,
});

export const STAR_RING_BLADE = Object.freeze({
  id: 'star-ring-blade',
  name: '星环刃',
  bladeCount: 2,
  radius: 76,
  bladeRadius: 12,
  angularSpeed: 3.4,
  damage: 9,
  repeatHitInterval: 0.32,
});

export const ENEMY_CONFIG = Object.freeze({
  scavenger: Object.freeze({
    maxHp: 34,
    radius: 15,
    speed: 72,
    contactDamage: 6,
  }),
  charger: Object.freeze({
    maxHp: 70,
    radius: 21,
    speed: 46,
    dashSpeed: 330,
    contactDamage: 12,
    triggerDistance: 250,
    windupSeconds: 0.68,
    dashSeconds: 0.42,
    recoverSeconds: 0.82,
  }),
});

export const A0_CONTRACT = Object.freeze({
  durationSeconds: 180,
  initialEnemies: 5,
  enemyCapacity: 160,
  projectileCapacity: 256,
  spawnIntervalStart: 1.5,
  spawnIntervalFloor: 0.55,
});
