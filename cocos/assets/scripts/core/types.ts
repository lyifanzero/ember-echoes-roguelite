export interface Vec2Value {
  x: number;
  y: number;
}

export interface InputState extends Vec2Value {}

export type EnemyKind = 'scavenger' | 'charger';
export type EnemyPhase = 'approach' | 'windup' | 'dash' | 'recover';

export interface PlayerState extends Vec2Value {
  radius: number;
  hp: number;
  maxHp: number;
  invulnerability: number;
}

export interface EnemyState extends Vec2Value {
  active: boolean;
  id: number;
  kind: EnemyKind;
  phase: EnemyPhase;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  contactCooldown: number;
  phaseTimer: number;
  vx: number;
  vy: number;
  orbitHitCooldown: number;
}

export interface ProjectileState extends Vec2Value {
  active: boolean;
  id: number;
  radius: number;
  vx: number;
  vy: number;
  damage: number;
  remainingLife: number;
}

export interface CombatStats {
  elapsed: number;
  kills: number;
  shotsFired: number;
  hits: number;
  damageDealt: number;
  damageTaken: number;
}

export type CombatEvent =
  | { type: 'shot'; x: number; y: number }
  | { type: 'hit'; x: number; y: number; damage: number; enemyId: number }
  | { type: 'enemy-killed'; x: number; y: number; enemyId: number }
  | { type: 'player-hit'; damage: number };

export interface CombatOptions {
  autoSpawn?: boolean;
  seed?: number;
  enemyCapacity?: number;
  projectileCapacity?: number;
}
