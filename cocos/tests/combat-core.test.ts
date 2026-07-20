import { EMBER_REPEATER } from '../assets/scripts/core/config';
import { CombatSimulation } from '../assets/scripts/core/CombatSimulation';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function approximatelyEqual(actual: number, expected: number, tolerance = 0.0001): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

{
  const simulation = new CombatSimulation({ autoSpawn: false, seed: 1 });
  simulation.spawnEnemy('scavenger', 200, 0);
  simulation.update(0.01, { x: 0, y: 0 });
  let projectileVelocityX = Number.NaN;
  let projectileVelocityY = Number.NaN;
  simulation.visitProjectiles((projectile) => {
    projectileVelocityX = projectile.vx;
    projectileVelocityY = projectile.vy;
  });
  assert(Number.isFinite(projectileVelocityX), 'auto-targeting should fire when an enemy is in range');
  assert(projectileVelocityX > 0, 'the projectile should travel toward the target');
  assert(approximatelyEqual(projectileVelocityY, 0), 'precision must not add angular spread');
}

{
  const simulation = new CombatSimulation({ autoSpawn: false, seed: 8 });
  for (let index = 0; index < 100; index++) {
    const damage = simulation.sampleRepeaterDamage();
    assert(damage <= EMBER_REPEATER.damageMax, 'damage roll must not exceed the weapon maximum');
    assert(damage >= 16.2, 'cat precision should raise the damage floor instead of changing aim');
  }
}

{
  const simulation = new CombatSimulation({ autoSpawn: false, enemyCapacity: 2 });
  assert(simulation.spawnEnemy('scavenger', 100, 100), 'first pooled enemy should spawn');
  assert(simulation.spawnEnemy('charger', -100, 100), 'second pooled enemy should spawn');
  assert(simulation.spawnEnemy('scavenger', 0, -100) === null, 'fixed pool must reject overflow');
  assert(simulation.enemyCount === 2, 'pool count should remain capped');
}

{
  const simulation = new CombatSimulation({ autoSpawn: false, seed: 4 });
  const scavenger = simulation.spawnEnemy('scavenger', 180, 40);
  const charger = simulation.spawnEnemy('charger', -180, -40);
  assert(scavenger && charger, 'both enemy archetypes should spawn');
  simulation.update(0.05, { x: 0, y: 0 });
  assert(scavenger.phase === 'approach', 'scavenger should remain a continuous chaser');
  assert(charger.phase === 'windup', 'charger should telegraph before dashing');
}

{
  const simulation = new CombatSimulation({ autoSpawn: false, seed: 2 });
  simulation.spawnEnemy('scavenger', 110, 0);
  for (let frame = 0; frame < 240; frame++) {
    simulation.update(1 / 60, { x: 0, y: 0 });
  }
  assert(simulation.stats.shotsFired > 0, 'repeater should fire during combat');
  assert(simulation.stats.hits > 0, 'auto-targeted projectiles should hit');
  assert(simulation.stats.kills === 1, 'the combined loadout should kill the test enemy');
}

console.log('Cocos combat core test passed: targeting, precision, pools, enemies and weapons.');
