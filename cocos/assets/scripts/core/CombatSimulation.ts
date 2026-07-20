import { A0_CONTRACT, ARENA, CAT_SCOUT, EMBER_REPEATER, ENEMY_CONFIG, STAR_RING_BLADE } from './config';
import { FixedPool } from './FixedPool';
import { clamp, distanceSquared, normalized, SeededRandom } from './math';
import type {
  CombatEvent,
  CombatOptions,
  CombatStats,
  EnemyKind,
  EnemyState,
  InputState,
  PlayerState,
  ProjectileState,
  Vec2Value,
} from './types';

export class CombatSimulation {
  public readonly player: PlayerState;
  public readonly stats: CombatStats;

  private readonly enemies: FixedPool<EnemyState>;
  private readonly projectiles: FixedPool<ProjectileState>;
  private readonly random: SeededRandom;
  private readonly autoSpawn: boolean;
  private readonly events: CombatEvent[] = [];
  private nextEntityId = 1;
  private shootCooldown = 0;
  private spawnCooldown = 0;
  private orbitAngle = 0;

  public constructor(options: CombatOptions = {}) {
    this.autoSpawn = options.autoSpawn ?? true;
    this.random = new SeededRandom(options.seed);
    this.enemies = new FixedPool(options.enemyCapacity ?? A0_CONTRACT.enemyCapacity, () => this.makeEnemy());
    this.projectiles = new FixedPool(options.projectileCapacity ?? A0_CONTRACT.projectileCapacity, () => this.makeProjectile());
    this.player = {
      x: 0,
      y: 0,
      radius: CAT_SCOUT.radius,
      hp: CAT_SCOUT.maxHp,
      maxHp: CAT_SCOUT.maxHp,
      invulnerability: 0,
    };
    this.stats = this.makeStats();
    if (this.autoSpawn) {
      for (let index = 0; index < A0_CONTRACT.initialEnemies; index++) {
        this.spawnAtEdge(index % 4 === 3 ? 'charger' : 'scavenger');
      }
    }
  }

  public update(deltaTime: number, input: InputState): void {
    if (this.player.hp <= 0) {
      return;
    }
    const dt = clamp(deltaTime, 0, 0.05);
    this.stats.elapsed += dt;
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);
    this.movePlayer(dt, input);
    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateRepeater(dt);
    this.updateProjectiles(dt);
    this.updateOrbitBlade(dt);
  }

  public spawnEnemy(kind: EnemyKind, x: number, y: number): EnemyState | null {
    const config = ENEMY_CONFIG[kind];
    return this.enemies.acquire((enemy) => {
      enemy.id = this.nextEntityId++;
      enemy.kind = kind;
      enemy.phase = 'approach';
      enemy.x = x;
      enemy.y = y;
      enemy.radius = config.radius;
      enemy.hp = config.maxHp;
      enemy.maxHp = config.maxHp;
      enemy.speed = config.speed;
      enemy.contactDamage = config.contactDamage;
      enemy.contactCooldown = 0;
      enemy.phaseTimer = 0;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.orbitHitCooldown = 0;
    });
  }

  public visitEnemies(visitor: (enemy: Readonly<EnemyState>) => void): void {
    this.enemies.forEachActive(visitor);
  }

  public visitProjectiles(visitor: (projectile: Readonly<ProjectileState>) => void): void {
    this.projectiles.forEachActive(visitor);
  }

  public getOrbitBlades(): Vec2Value[] {
    const blades: Vec2Value[] = [];
    for (let index = 0; index < STAR_RING_BLADE.bladeCount; index++) {
      const angle = this.orbitAngle + (Math.PI * 2 * index) / STAR_RING_BLADE.bladeCount;
      blades.push({
        x: this.player.x + Math.cos(angle) * STAR_RING_BLADE.radius,
        y: this.player.y + Math.sin(angle) * STAR_RING_BLADE.radius,
      });
    }
    return blades;
  }

  public consumeEvents(): CombatEvent[] {
    return this.events.splice(0, this.events.length);
  }

  public sampleRepeaterDamage(): number {
    const precisionFloor = EMBER_REPEATER.damageMin
      + (EMBER_REPEATER.damageMax - EMBER_REPEATER.damageMin) * CAT_SCOUT.precision;
    return this.random.range(precisionFloor, EMBER_REPEATER.damageMax);
  }

  public get enemyCount(): number {
    return this.enemies.activeCount;
  }

  public get projectileCount(): number {
    return this.projectiles.activeCount;
  }

  private movePlayer(dt: number, input: InputState): void {
    const direction = normalized(input);
    this.player.x = clamp(
      this.player.x + direction.x * CAT_SCOUT.moveSpeed * dt,
      -ARENA.width / 2 + ARENA.margin,
      ARENA.width / 2 - ARENA.margin,
    );
    this.player.y = clamp(
      this.player.y + direction.y * CAT_SCOUT.moveSpeed * dt,
      -ARENA.height / 2 + ARENA.margin,
      ARENA.height / 2 - ARENA.margin,
    );
  }

  private updateSpawning(dt: number): void {
    if (!this.autoSpawn || this.stats.elapsed >= A0_CONTRACT.durationSeconds) {
      return;
    }
    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) {
      return;
    }
    const progress = this.stats.elapsed / A0_CONTRACT.durationSeconds;
    this.spawnCooldown = Math.max(
      A0_CONTRACT.spawnIntervalFloor,
      A0_CONTRACT.spawnIntervalStart * (1 - progress * 0.72),
    );
    const chargerChance = 0.08 + progress * 0.2;
    this.spawnAtEdge(this.random.next() < chargerChance ? 'charger' : 'scavenger');
  }

  private spawnAtEdge(kind: EnemyKind): void {
    const side = Math.floor(this.random.next() * 4);
    const halfWidth = ARENA.width / 2 - 12;
    const halfHeight = ARENA.height / 2 - 12;
    const alongX = this.random.range(-halfWidth, halfWidth);
    const alongY = this.random.range(-halfHeight, halfHeight);
    if (side === 0) this.spawnEnemy(kind, alongX, halfHeight);
    if (side === 1) this.spawnEnemy(kind, halfWidth, alongY);
    if (side === 2) this.spawnEnemy(kind, alongX, -halfHeight);
    if (side === 3) this.spawnEnemy(kind, -halfWidth, alongY);
  }

  private updateEnemies(dt: number): void {
    this.enemies.forEachActive((enemy) => {
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
      enemy.orbitHitCooldown = Math.max(0, enemy.orbitHitCooldown - dt);
      if (enemy.kind === 'charger') {
        this.updateCharger(enemy, dt);
      } else {
        this.moveTowardPlayer(enemy, enemy.speed, dt);
      }
      const touchRadius = enemy.radius + this.player.radius;
      if (enemy.contactCooldown <= 0 && distanceSquared(enemy, this.player) <= touchRadius * touchRadius) {
        enemy.contactCooldown = 0.7;
        this.damagePlayer(enemy.contactDamage);
      }
    });
  }

  private updateCharger(enemy: EnemyState, dt: number): void {
    const config = ENEMY_CONFIG.charger;
    if (enemy.phase === 'approach') {
      this.moveTowardPlayer(enemy, config.speed, dt);
      if (distanceSquared(enemy, this.player) <= config.triggerDistance * config.triggerDistance) {
        enemy.phase = 'windup';
        enemy.phaseTimer = config.windupSeconds;
      }
      return;
    }
    enemy.phaseTimer -= dt;
    if (enemy.phase === 'windup') {
      if (enemy.phaseTimer <= 0) {
        const direction = normalized({ x: this.player.x - enemy.x, y: this.player.y - enemy.y });
        enemy.vx = direction.x * config.dashSpeed;
        enemy.vy = direction.y * config.dashSpeed;
        enemy.phase = 'dash';
        enemy.phaseTimer = config.dashSeconds;
      }
      return;
    }
    if (enemy.phase === 'dash') {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.phaseTimer <= 0) {
        enemy.phase = 'recover';
        enemy.phaseTimer = config.recoverSeconds;
      }
      return;
    }
    if (enemy.phaseTimer <= 0) {
      enemy.phase = 'approach';
    }
  }

  private moveTowardPlayer(enemy: EnemyState, speed: number, dt: number): void {
    const direction = normalized({ x: this.player.x - enemy.x, y: this.player.y - enemy.y });
    enemy.x += direction.x * speed * dt;
    enemy.y += direction.y * speed * dt;
  }

  private updateRepeater(dt: number): void {
    this.shootCooldown -= dt;
    if (this.shootCooldown > 0) {
      return;
    }
    const target = this.findNearestEnemy(EMBER_REPEATER.range);
    if (!target) {
      this.shootCooldown = 0;
      return;
    }
    const direction = normalized({ x: target.x - this.player.x, y: target.y - this.player.y });
    const projectile = this.projectiles.acquire((item) => {
      item.id = this.nextEntityId++;
      item.x = this.player.x;
      item.y = this.player.y;
      item.radius = EMBER_REPEATER.projectileRadius;
      item.vx = direction.x * EMBER_REPEATER.projectileSpeed;
      item.vy = direction.y * EMBER_REPEATER.projectileSpeed;
      item.damage = this.sampleRepeaterDamage();
      item.remainingLife = EMBER_REPEATER.projectileLife;
    });
    if (projectile) {
      this.stats.shotsFired++;
      this.events.push({ type: 'shot', x: projectile.x, y: projectile.y });
      this.shootCooldown = EMBER_REPEATER.attackInterval;
    }
  }

  private updateProjectiles(dt: number): void {
    this.projectiles.forEachActive((projectile) => {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.remainingLife -= dt;
      if (projectile.remainingLife <= 0) {
        this.projectiles.release(projectile);
        return;
      }
      const hitEnemy = this.enemies.findActive((enemy) => {
        const hitRadius = enemy.radius + projectile.radius;
        return distanceSquared(enemy, projectile) <= hitRadius * hitRadius;
      });
      if (!hitEnemy) {
        return;
      }
      this.projectiles.release(projectile);
      this.stats.hits++;
      this.damageEnemy(hitEnemy, projectile.damage);
    });
  }

  private updateOrbitBlade(dt: number): void {
    this.orbitAngle = (this.orbitAngle + STAR_RING_BLADE.angularSpeed * dt) % (Math.PI * 2);
    const blades = this.getOrbitBlades();
    this.enemies.forEachActive((enemy) => {
      if (enemy.orbitHitCooldown > 0) {
        return;
      }
      const hitRadius = enemy.radius + STAR_RING_BLADE.bladeRadius;
      if (blades.some((blade) => distanceSquared(enemy, blade) <= hitRadius * hitRadius)) {
        enemy.orbitHitCooldown = STAR_RING_BLADE.repeatHitInterval;
        this.damageEnemy(enemy, STAR_RING_BLADE.damage);
      }
    });
  }

  private findNearestEnemy(range: number): EnemyState | null {
    const maximumDistance = range * range;
    let nearest: EnemyState | null = null;
    let nearestDistance = maximumDistance;
    this.enemies.forEachActive((enemy) => {
      const distance = distanceSquared(this.player, enemy);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = enemy;
      }
    });
    return nearest;
  }

  private damageEnemy(enemy: EnemyState, damage: number): void {
    enemy.hp -= damage;
    this.stats.damageDealt += damage;
    this.events.push({ type: 'hit', x: enemy.x, y: enemy.y, damage, enemyId: enemy.id });
    if (enemy.hp > 0) {
      return;
    }
    this.stats.kills++;
    this.events.push({ type: 'enemy-killed', x: enemy.x, y: enemy.y, enemyId: enemy.id });
    this.enemies.release(enemy);
  }

  private damagePlayer(damage: number): void {
    if (this.player.invulnerability > 0) {
      return;
    }
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.player.invulnerability = CAT_SCOUT.invulnerabilitySeconds;
    this.stats.damageTaken += damage;
    this.events.push({ type: 'player-hit', damage });
  }

  private makeEnemy(): EnemyState {
    return {
      active: false,
      id: 0,
      kind: 'scavenger',
      phase: 'approach',
      x: 0,
      y: 0,
      radius: 0,
      hp: 0,
      maxHp: 0,
      speed: 0,
      contactDamage: 0,
      contactCooldown: 0,
      phaseTimer: 0,
      vx: 0,
      vy: 0,
      orbitHitCooldown: 0,
    };
  }

  private makeProjectile(): ProjectileState {
    return {
      active: false,
      id: 0,
      x: 0,
      y: 0,
      radius: 0,
      vx: 0,
      vy: 0,
      damage: 0,
      remainingLife: 0,
    };
  }

  private makeStats(): CombatStats {
    return {
      elapsed: 0,
      kills: 0,
      shotsFired: 0,
      hits: 0,
      damageDealt: 0,
      damageTaken: 0,
    };
  }
}
