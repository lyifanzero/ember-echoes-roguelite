import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  EventMouse,
  EventTouch,
  Graphics,
  input,
  Input,
  KeyCode,
  Label,
  Node,
  profiler,
  ResolutionPolicy,
  UITransform,
  view,
} from 'cc';
import { A0_CONTRACT, ARENA, CAT_SCOUT, EMBER_REPEATER, STAR_RING_BLADE } from '../core/config';
import { CombatSimulation } from '../core/CombatSimulation';
import type { CombatEvent, EnemyState, InputState, ProjectileState, Vec2Value } from '../core/types';

const { ccclass } = _decorator;

interface ImpactFx extends Vec2Value {
  life: number;
  maxLife: number;
  radius: number;
  color: Color;
}

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
  private simulation = new CombatSimulation({ seed: 0xa0c0c05 });
  private worldGraphics: Graphics | null = null;
  private hudLabel: Label | null = null;
  private helpLabel: Label | null = null;
  private readonly heldKeys = new Set<KeyCode>();
  private readonly impacts: ImpactFx[] = [];
  private touchId: number | null = null;
  private pointerSource: 'touch' | 'mouse' | null = null;
  private touchOrigin: Vec2Value = { x: 0, y: 0 };
  private touchCurrent: Vec2Value = { x: 0, y: 0 };
  private touchInput: InputState = { x: 0, y: 0 };

  protected onLoad(): void {
    profiler.hideStats();
    view.setDesignResolutionSize(ARENA.width, ARENA.height, ResolutionPolicy.SHOW_ALL);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
  }

  protected start(): void {
    this.createPresentation();
  }

  protected update(deltaTime: number): void {
    const movement = this.readMovement();
    this.simulation.update(deltaTime, movement);
    this.consumeCombatEvents();
    this.updateImpacts(deltaTime);
    this.drawFrame();
    this.updateHud();
  }

  protected onDestroy(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
  }

  private createPresentation(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(ARENA.width, ARENA.height);

    const world = new Node('A0 Greybox World');
    world.layer = this.node.layer;
    world.addComponent(UITransform).setContentSize(ARENA.width, ARENA.height);
    this.worldGraphics = world.addComponent(Graphics);
    this.node.addChild(world);

    this.hudLabel = this.createLabel('Combat HUD', -ARENA.width / 2 + 24, ARENA.height / 2 - 22, 18);
    this.helpLabel = this.createLabel('Control Help', -ARENA.width / 2 + 24, -ARENA.height / 2 + 38, 15);
    this.helpLabel.string = 'WASD / 方向键移动 · 手机在屏幕任意位置拖动 · R 重新开始';
  }

  private createLabel(name: string, x: number, y: number, fontSize: number): Label {
    const labelNode = new Node(name);
    labelNode.layer = this.node.layer;
    labelNode.setPosition(x, y);
    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setContentSize(900, 32);
    labelTransform.setAnchorPoint(0, 1);
    const label = labelNode.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 4;
    label.color = new Color(226, 236, 240, 255);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.node.addChild(labelNode);
    return label;
  }

  private readMovement(): InputState {
    let x = this.touchInput.x;
    let y = this.touchInput.y;
    if (this.heldKeys.has(KeyCode.KEY_A) || this.heldKeys.has(KeyCode.ARROW_LEFT)) x -= 1;
    if (this.heldKeys.has(KeyCode.KEY_D) || this.heldKeys.has(KeyCode.ARROW_RIGHT)) x += 1;
    if (this.heldKeys.has(KeyCode.KEY_S) || this.heldKeys.has(KeyCode.ARROW_DOWN)) y -= 1;
    if (this.heldKeys.has(KeyCode.KEY_W) || this.heldKeys.has(KeyCode.ARROW_UP)) y += 1;
    return { x, y };
  }

  private onKeyDown(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.KEY_R) {
      this.simulation = new CombatSimulation({ seed: 0xa0c0c05 });
      this.impacts.length = 0;
      return;
    }
    this.heldKeys.add(event.keyCode);
  }

  private onKeyUp(event: EventKeyboard): void {
    this.heldKeys.delete(event.keyCode);
  }

  private onTouchStart(event: EventTouch): void {
    if (this.pointerSource !== null) {
      return;
    }
    const location = event.getUILocation();
    this.pointerSource = 'touch';
    this.touchId = event.getID();
    this.beginPointer(location.x, location.y);
  }

  private onTouchMove(event: EventTouch): void {
    if (event.getID() !== this.touchId) {
      return;
    }
    const location = event.getUILocation();
    this.movePointer(location.x, location.y);
  }

  private onTouchEnd(event: EventTouch): void {
    if (this.pointerSource !== 'touch' || event.getID() !== this.touchId) {
      return;
    }
    this.touchId = null;
    this.endPointer();
  }

  private onMouseDown(event: EventMouse): void {
    if (this.pointerSource !== null || event.getButton() !== EventMouse.BUTTON_LEFT) {
      return;
    }
    const location = event.getUILocation();
    this.pointerSource = 'mouse';
    this.beginPointer(location.x, location.y);
  }

  private onMouseMove(event: EventMouse): void {
    if (this.pointerSource !== 'mouse') {
      return;
    }
    const location = event.getUILocation();
    this.movePointer(location.x, location.y);
  }

  private onMouseUp(event: EventMouse): void {
    if (this.pointerSource === 'mouse' && event.getButton() === EventMouse.BUTTON_LEFT) {
      this.endPointer();
    }
  }

  private beginPointer(x: number, y: number): void {
    this.touchOrigin = { x, y };
    this.touchCurrent = { x, y };
    this.touchInput = { x: 0, y: 0 };
  }

  private movePointer(x: number, y: number): void {
    this.touchCurrent = { x, y };
    const dx = x - this.touchOrigin.x;
    const dy = y - this.touchOrigin.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const deadZone = 8;
    const maximum = 72;
    if (length <= deadZone) {
      this.touchInput = { x: 0, y: 0 };
      return;
    }
    const strength = Math.min(1, (length - deadZone) / (maximum - deadZone));
    this.touchInput = { x: (dx / length) * strength, y: (dy / length) * strength };
  }

  private endPointer(): void {
    this.pointerSource = null;
    this.touchInput = { x: 0, y: 0 };
  }

  private consumeCombatEvents(): void {
    for (const event of this.simulation.consumeEvents()) {
      this.addImpactForEvent(event);
    }
  }

  private addImpactForEvent(event: CombatEvent): void {
    if (event.type === 'hit') {
      this.impacts.push({ x: event.x, y: event.y, life: 0.16, maxLife: 0.16, radius: 8, color: new Color(255, 244, 160, 230) });
    } else if (event.type === 'enemy-killed') {
      this.impacts.push({ x: event.x, y: event.y, life: 0.34, maxLife: 0.34, radius: 18, color: new Color(255, 154, 72, 240) });
    } else if (event.type === 'player-hit') {
      this.impacts.push({ x: this.simulation.player.x, y: this.simulation.player.y, life: 0.3, maxLife: 0.3, radius: 28, color: new Color(255, 76, 94, 240) });
    }
  }

  private updateImpacts(deltaTime: number): void {
    for (let index = this.impacts.length - 1; index >= 0; index--) {
      this.impacts[index].life -= deltaTime;
      if (this.impacts[index].life <= 0) {
        this.impacts.splice(index, 1);
      }
    }
  }

  private drawFrame(): void {
    const graphics = this.worldGraphics;
    if (!graphics) {
      return;
    }
    graphics.clear();
    this.drawArena(graphics);
    this.simulation.visitEnemies((enemy) => this.drawEnemy(graphics, enemy));
    this.simulation.visitProjectiles((projectile) => this.drawProjectile(graphics, projectile));
    this.drawOrbitBlades(graphics);
    this.drawPlayer(graphics);
    this.drawImpacts(graphics);
    this.drawTouchJoystick(graphics);
  }

  private drawArena(graphics: Graphics): void {
    graphics.fillColor = new Color(14, 20, 27, 255);
    graphics.rect(-ARENA.width / 2, -ARENA.height / 2, ARENA.width, ARENA.height);
    graphics.fill();
    graphics.strokeColor = new Color(52, 72, 80, 255);
    graphics.lineWidth = 2;
    graphics.rect(-ARENA.width / 2 + 8, -ARENA.height / 2 + 8, ARENA.width - 16, ARENA.height - 16);
    graphics.stroke();
  }

  private drawPlayer(graphics: Graphics): void {
    const player = this.simulation.player;
    const flashing = player.invulnerability > 0 && Math.floor(player.invulnerability * 18) % 2 === 0;
    graphics.fillColor = flashing ? new Color(255, 255, 255, 220) : new Color(78, 220, 232, 255);
    graphics.circle(player.x, player.y, player.radius);
    graphics.fill();
    graphics.fillColor = new Color(26, 46, 58, 255);
    graphics.circle(player.x - 6, player.y + 3, 2.5);
    graphics.circle(player.x + 6, player.y + 3, 2.5);
    graphics.fill();
    graphics.fillColor = new Color(78, 220, 232, 255);
    graphics.moveTo(player.x - 14, player.y + 12);
    graphics.lineTo(player.x - 8, player.y + 27);
    graphics.lineTo(player.x - 2, player.y + 15);
    graphics.close();
    graphics.moveTo(player.x + 14, player.y + 12);
    graphics.lineTo(player.x + 8, player.y + 27);
    graphics.lineTo(player.x + 2, player.y + 15);
    graphics.close();
    graphics.fill();
  }

  private drawEnemy(graphics: Graphics, enemy: Readonly<EnemyState>): void {
    if (enemy.kind === 'charger') {
      graphics.fillColor = enemy.phase === 'dash' ? new Color(255, 68, 117, 255) : new Color(174, 82, 210, 255);
      graphics.rect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
      graphics.fill();
      if (enemy.phase === 'windup') {
        graphics.strokeColor = new Color(255, 102, 126, 240);
        graphics.lineWidth = 4;
        graphics.circle(enemy.x, enemy.y, enemy.radius + 12);
        graphics.stroke();
      }
    } else {
      graphics.fillColor = new Color(240, 128, 62, 255);
      graphics.circle(enemy.x, enemy.y, enemy.radius);
      graphics.fill();
    }
    const healthRatio = Math.max(0, enemy.hp / enemy.maxHp);
    graphics.fillColor = new Color(42, 30, 35, 230);
    graphics.rect(enemy.x - enemy.radius, enemy.y + enemy.radius + 7, enemy.radius * 2, 4);
    graphics.fill();
    graphics.fillColor = new Color(255, 92, 88, 255);
    graphics.rect(enemy.x - enemy.radius, enemy.y + enemy.radius + 7, enemy.radius * 2 * healthRatio, 4);
    graphics.fill();
  }

  private drawProjectile(graphics: Graphics, projectile: Readonly<ProjectileState>): void {
    graphics.strokeColor = new Color(125, 245, 255, 180);
    graphics.lineWidth = 3;
    const speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy) || 1;
    graphics.moveTo(projectile.x, projectile.y);
    graphics.lineTo(projectile.x - (projectile.vx / speed) * 13, projectile.y - (projectile.vy / speed) * 13);
    graphics.stroke();
    graphics.fillColor = new Color(235, 255, 255, 255);
    graphics.circle(projectile.x, projectile.y, projectile.radius);
    graphics.fill();
  }

  private drawOrbitBlades(graphics: Graphics): void {
    graphics.fillColor = new Color(255, 218, 98, 255);
    for (const blade of this.simulation.getOrbitBlades()) {
      graphics.circle(blade.x, blade.y, STAR_RING_BLADE.bladeRadius);
      graphics.fill();
      graphics.strokeColor = new Color(255, 247, 190, 190);
      graphics.lineWidth = 2;
      graphics.circle(blade.x, blade.y, STAR_RING_BLADE.bladeRadius + 4);
      graphics.stroke();
    }
  }

  private drawImpacts(graphics: Graphics): void {
    for (const impact of this.impacts) {
      const progress = 1 - impact.life / impact.maxLife;
      graphics.strokeColor = impact.color;
      graphics.lineWidth = 3;
      graphics.circle(impact.x, impact.y, impact.radius * (0.6 + progress));
      graphics.stroke();
    }
  }

  private drawTouchJoystick(graphics: Graphics): void {
    if (this.pointerSource === null) {
      return;
    }
    const visibleOrigin = this.screenToArena(this.touchOrigin);
    const visibleCurrent = this.screenToArena(this.touchCurrent);
    graphics.strokeColor = new Color(126, 223, 235, 150);
    graphics.lineWidth = 3;
    graphics.circle(visibleOrigin.x, visibleOrigin.y, 36);
    graphics.stroke();
    graphics.fillColor = new Color(126, 223, 235, 130);
    graphics.circle(visibleCurrent.x, visibleCurrent.y, 15);
    graphics.fill();
  }

  private screenToArena(position: Vec2Value): Vec2Value {
    const visibleSize = view.getVisibleSize();
    return {
      x: position.x - visibleSize.width / 2,
      y: position.y - visibleSize.height / 2,
    };
  }

  private updateHud(): void {
    if (!this.hudLabel) {
      return;
    }
    const stats = this.simulation.stats;
    const remaining = Math.max(0, A0_CONTRACT.durationSeconds - stats.elapsed);
    const accuracy = stats.shotsFired > 0 ? Math.round((stats.hits / stats.shotsFired) * 100) : 0;
    this.hudLabel.string = [
      `${CAT_SCOUT.name}  HP ${Math.ceil(this.simulation.player.hp)}/${this.simulation.player.maxHp}`,
      `${EMBER_REPEATER.name} + ${STAR_RING_BLADE.name}`,
      `剩余 ${remaining.toFixed(1)}s  敌人 ${this.simulation.enemyCount}  击杀 ${stats.kills}  命中 ${accuracy}%`,
    ].join('\n');
  }
}
