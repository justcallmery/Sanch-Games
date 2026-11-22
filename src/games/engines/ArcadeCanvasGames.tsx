import React, { useEffect, useRef } from 'react';
import { GameRuntimeProps, VirtualControlState } from '../types';
import { sound } from '../../utils/sound';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

function defaultControls(): VirtualControlState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
    justAction: false,
    justDir: null,
  };
}

export const ArcadeCanvasGames: React.FC<GameRuntimeProps> = ({
  game,
  isPaused,
  restartNonce,
  onScoreChange,
  onGameEnd,
  controlInputRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(isPaused);
  const callbacksRef = useRef({ onScoreChange, onGameEnd });
  pausedRef.current = isPaused;
  callbacksRef.current = { onScoreChange, onGameEnd };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 480;
    const H = 480;
    canvas.width = W;
    canvas.height = H;

    let rafId = 0;
    let lastTime = performance.now();
    let ended = false;
    let score = 0;
    let elapsed = 0;

    const particles: Particle[] = [];
    const spawnBurst = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 60 + Math.random() * 140;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 0.35 + Math.random() * 0.25,
          color,
          size: 2.5 + Math.random() * 3,
        });
      }
    };

    const keys = new Set<string>();
    let pointerActive = false;
    let pointerX = W / 2;
    let pointerY = H / 2;
    let pointerJustDown = false;
    let swipeStart: { x: number; y: number } | null = null;
    let pendingDir: 'up' | 'down' | 'left' | 'right' | null = null;

    const toCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / Math.max(1, rect.width)) * W,
        y: ((clientY - rect.top) / Math.max(1, rect.height)) * H,
      };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const k = e.key.toLowerCase();
      if (!keys.has(k)) {
        if (k === 'arrowup' || k === 'w') pendingDir = 'up';
        if (k === 'arrowdown' || k === 's') pendingDir = 'down';
        if (k === 'arrowleft' || k === 'a') pendingDir = 'left';
        if (k === 'arrowright' || k === 'd') pendingDir = 'right';
        if (k === ' ' || k === 'enter') pointerJustDown = true;
      }
      keys.add(k);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };

    const onPointerDown = (e: PointerEvent) => {
      const pt = toCanvasCoords(e.clientX, e.clientY);
      pointerActive = true;
      pointerX = pt.x;
      pointerY = pt.y;
      pointerJustDown = true;
      swipeStart = pt;
    };

    const onPointerMove = (e: PointerEvent) => {
      const pt = toCanvasCoords(e.clientX, e.clientY);
      pointerX = pt.x;
      pointerY = pt.y;
      if (swipeStart && pointerActive) {
        const dx = pt.x - swipeStart.x;
        const dy = pt.y - swipeStart.y;
        if (Math.hypot(dx, dy) > 22) {
          if (Math.abs(dx) > Math.abs(dy)) {
            pendingDir = dx > 0 ? 'right' : 'left';
          } else {
            pendingDir = dy > 0 ? 'down' : 'up';
          }
          swipeStart = pt;
        }
      }
    };

    const onPointerUp = () => {
      pointerActive = false;
      swipeStart = null;
    };

    const onBlur = () => {
      keys.clear();
      pointerActive = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const reportScore = (val: number, label?: string) => {
      score = val;
      callbacksRef.current.onScoreChange(val, label);
    };

    const finishGame = (won: boolean, summary: string) => {
      if (ended) return;
      ended = true;
      if (won) sound.win();
      else sound.lose();
      callbacksRef.current.onGameEnd({ won, score, summary });
    };

    // --- Per-game state initialization ---
    // 1. Snake
    const GRID = 20;
    const CELL = W / GRID;
    let snake = [
      { x: 3, y: 10 },
      { x: 2, y: 10 },
      { x: 1, y: 10 },
    ];
    let snakeDir = { x: 1, y: 0 };
    let nextSnakeDir = { x: 1, y: 0 };
    let snakeTick = 0;
    let apple = { x: 8, y: 10 };
    const placeApple = () => {
      for (let t = 0; t < 100; t++) {
        const ax = Math.floor(Math.random() * GRID);
        const ay = Math.floor(Math.random() * GRID);
        if (!snake.some((s) => s.x === ax && s.y === ay)) {
          apple = { x: ax, y: ay };
          return;
        }
      }
    };

    // 2. Brick Breaker
    let paddleX = W / 2;
    const paddleW = 92;
    let ball = { x: W / 2, y: H - 64, vx: 190, vy: -220, r: 8 };
    let lives = 3;
    const bricks: { x: number; y: number; w: number; h: number; hp: number; color: string }[] = [];
    if (game.id === 'brick-breaker') {
      const colors = ['#EA580C', '#D97706', '#0D9488', '#2563EB', '#7C3AED'];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 8; c++) {
          bricks.push({
            x: 18 + c * 56,
            y: 52 + r * 26,
            w: 50,
            h: 18,
            hp: r === 0 ? 2 : 1,
            color: colors[r],
          });
        }
      }
    }

    // 3. Flappy Hop
    let bird = { x: 120, y: H / 2, vy: 0 };
    let flappyStarted = false;
    const pipes: { x: number; gapY: number; gapH: number; passed: boolean }[] = [
      { x: 460, gapY: 220, gapH: 140, passed: false },
      { x: 660, gapY: 270, gapH: 140, passed: false },
      { x: 860, gapY: 190, gapH: 140, passed: false },
    ];

    // 4. Space Blaster
    let shipX = W / 2;
    let fireCooldown = 0;
    const bullets: { x: number; y: number; vy: number }[] = [];
    const enemyBullets: { x: number; y: number; vy: number }[] = [];
    interface Invader { x: number; y: number; alive: boolean; row: number }
    const invaders: Invader[] = [];
    let invaderDir = 1;
    let invaderWave = 1;
    const spawnInvaders = () => {
      invaders.length = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 7; c++) {
          invaders.push({ x: 64 + c * 54, y: 54 + r * 38, alive: true, row: r });
        }
      }
    };
    if (game.id === 'space-blaster') spawnInvaders();

    // 5. Meteor Dodge
    let dodgePos = { x: W / 2, y: H - 70 };
    const meteors: { x: number; y: number; r: number; vy: number; fuel: boolean }[] = [];
    let meteorSpawn = 0;

    // 6. Whack-a-Critter
    interface Burrow { state: 'empty' | 'critter' | 'gold' | 'bomb'; timer: number }
    const burrows: Burrow[] = Array.from({ length: 9 }, () => ({ state: 'empty', timer: 0.4 + Math.random() * 1.2 }));
    let whackTimeLeft = 45;

    // 7. Pong Duel
    let pongPlayerY = H / 2;
    let pongAiY = H / 2;
    let pongBall = { x: W / 2, y: H / 2, vx: 230, vy: 110 };
    let pongPScore = 0;
    let pongAScore = 0;

    // 8. Color Catch
    let catchX = W / 2;
    let catchPolarity: 0 | 1 = 0; // 0 = Orange, 1 = Teal
    const orbs: { x: number; y: number; vy: number; polarity: 0 | 1 }[] = [];
    let orbSpawn = 0;

    // 9. Tap Target
    const targets: { x: number; y: number; maxR: number; life: number; maxLife: number }[] = [
      { x: W / 2, y: H / 2, maxR: 34, life: 2.4, maxLife: 2.4 },
    ];
    let targetMisses = 0;
    let targetSpawn = 0;

    // 10. Dino Dash
    let dinoY = 0; // height above ground
    let dinoVy = 0;
    let dinoDuck = false;
    const groundY = H - 90;
    const obstacles: { x: number; w: number; h: number; flying: boolean; passed: boolean }[] = [
      { x: W + 320, w: 26, h: 44, flying: false, passed: false },
    ];

    reportScore(0);

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const ctrl = controlInputRef?.current ?? defaultControls();
      if (ctrl.justDir) {
        pendingDir = ctrl.justDir;
        ctrl.justDir = null;
      }
      const actionEdge = pointerJustDown || ctrl.justAction;
      pointerJustDown = false;
      if (ctrl.justAction) ctrl.justAction = false;

      const moveLeft = keys.has('arrowleft') || keys.has('a') || ctrl.left;
      const moveRight = keys.has('arrowright') || keys.has('d') || ctrl.right;
      const moveUp = keys.has('arrowup') || keys.has('w') || ctrl.up;
      const moveDown = keys.has('arrowdown') || keys.has('s') || ctrl.down;
      const actionHeld = keys.has(' ') || keys.has('enter') || ctrl.action;

      if (!pausedRef.current && !ended) {
        elapsed += dt;

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) particles.splice(i, 1);
        }

        // --- UPDATE LOGIC PER GAME ---
        if (game.id === 'snake') {
          if (pendingDir === 'up' && snakeDir.y !== 1) nextSnakeDir = { x: 0, y: -1 };
          if (pendingDir === 'down' && snakeDir.y !== -1) nextSnakeDir = { x: 0, y: 1 };
          if (pendingDir === 'left' && snakeDir.x !== 1) nextSnakeDir = { x: -1, y: 0 };
          if (pendingDir === 'right' && snakeDir.x !== -1) nextSnakeDir = { x: 1, y: 0 };
          pendingDir = null;

          snakeTick += dt;
          const stepRate = Math.max(0.09, 0.21 - Math.floor(score / 40) * 0.01);
          if (snakeTick >= stepRate) {
            snakeTick = 0;
            snakeDir = nextSnakeDir;
            const head = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
            if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || snake.some((s) => s.x === head.x && s.y === head.y)) {
              spawnBurst(snake[0].x * CELL + CELL / 2, snake[0].y * CELL + CELL / 2, '#EF4444', 14);
              finishGame(false, `Final length: ${snake.length} segments`);
            } else {
              snake.unshift(head);
              if (head.x === apple.x && head.y === apple.y) {
                sound.score();
                spawnBurst(apple.x * CELL + CELL / 2, apple.y * CELL + CELL / 2, '#EA580C', 10);
                reportScore(score + 10);
                placeApple();
              } else {
                snake.pop();
              }
            }
          }
        } else if (game.id === 'brick-breaker') {
          if (pointerActive) {
            paddleX += (pointerX - paddleX) * Math.min(1, dt * 18);
          } else {
            if (moveLeft) paddleX -= 360 * dt;
            if (moveRight) paddleX += 360 * dt;
          }
          paddleX = Math.max(paddleW / 2 + 8, Math.min(W - paddleW / 2 - 8, paddleX));

          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;

          if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); sound.bounce(); }
          if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); sound.bounce(); }
          if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); sound.bounce(); }

          // Paddle hit
          if (ball.vy > 0 && ball.y + ball.r >= H - 38 && ball.y - ball.r <= H - 22 && Math.abs(ball.x - paddleX) <= paddleW / 2 + ball.r) {
            const offset = (ball.x - paddleX) / (paddleW / 2);
            const speed = Math.min(430, Math.hypot(ball.vx, ball.vy) * 1.015);
            const angle = offset * 1.1;
            ball.vx = Math.sin(angle) * speed;
            ball.vy = -Math.cos(angle) * speed;
            ball.y = H - 38 - ball.r;
            sound.bounce();
          }

          // Brick hit
          for (let i = bricks.length - 1; i >= 0; i--) {
            const b = bricks[i];
            if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
              ball.vy = -ball.vy;
              b.hp--;
              sound.score();
              spawnBurst(b.x + b.w / 2, b.y + b.h / 2, b.color, 8);
              if (b.hp <= 0) {
                bricks.splice(i, 1);
                reportScore(score + 20);
              } else {
                reportScore(score + 10);
              }
              break;
            }
          }

          if (bricks.length === 0) {
            finishGame(true, `Cleared all bricks with ${lives} lives left!`);
          } else if (ball.y - ball.r > H) {
            lives--;
            sound.hit();
            if (lives <= 0) {
              finishGame(false, `Bricks remaining: ${bricks.length}`);
            } else {
              ball = { x: paddleX, y: H - 64, vx: 180 * (Math.random() > 0.5 ? 1 : -1), vy: -220, r: 8 };
            }
          }
        } else if (game.id === 'flappy-hop') {
          if (actionEdge || pendingDir === 'up') {
            flappyStarted = true;
            bird.vy = -310;
            sound.flip();
            spawnBurst(bird.x - 10, bird.y + 6, '#38BDF8', 5);
            pendingDir = null;
          }
          if (!flappyStarted && elapsed < 2.2) {
            bird.y = H / 2 + Math.sin(elapsed * 5) * 8;
          } else {
            flappyStarted = true;
            bird.vy += 860 * dt;
            bird.y += bird.vy * dt;
          }

          for (const p of pipes) {
            p.x -= 155 * dt;
            if (!p.passed && p.x + 28 < bird.x) {
              p.passed = true;
              sound.score();
              reportScore(score + 1);
            }
            if (p.x < -60) {
              p.x = Math.max(...pipes.map((o) => o.x)) + 200;
              p.gapY = 120 + Math.random() * (H - 260);
              p.passed = false;
            }
            // Collision
            const inX = bird.x + 14 > p.x && bird.x - 14 < p.x + 54;
            if (inX && (bird.y - 14 < p.gapY - p.gapH / 2 || bird.y + 14 > p.gapY + p.gapH / 2)) {
              sound.hit();
              finishGame(false, `Passed ${score} sky gates`);
            }
          }
          if (bird.y < 14 || bird.y > H - 24) {
            sound.hit();
            finishGame(false, `Passed ${score} sky gates`);
          }
        } else if (game.id === 'space-blaster') {
          if (pointerActive) {
            shipX += (pointerX - shipX) * Math.min(1, dt * 15);
          } else {
            if (moveLeft) shipX -= 310 * dt;
            if (moveRight) shipX += 310 * dt;
          }
          shipX = Math.max(26, Math.min(W - 26, shipX));

          fireCooldown -= dt;
          if ((actionHeld || actionEdge || pointerActive) && fireCooldown <= 0) {
            bullets.push({ x: shipX, y: H - 56, vy: -440 });
            fireCooldown = 0.24;
            sound.shoot();
          }

          for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].y += bullets[i].vy * dt;
            if (bullets[i].y < -10) bullets.splice(i, 1);
          }

          let hitEdge = false;
          let aliveCount = 0;
          const speed = (38 + invaderWave * 10) * dt;
          for (const inv of invaders) {
            if (!inv.alive) continue;
            aliveCount++;
            inv.x += invaderDir * speed;
            if (inv.x < 28 || inv.x > W - 28) hitEdge = true;
            if (Math.random() < dt * 0.22) {
              enemyBullets.push({ x: inv.x, y: inv.y + 12, vy: 210 });
            }
          }
          if (hitEdge) {
            invaderDir *= -1;
            for (const inv of invaders) inv.y += 18;
          }

          for (let bi = bullets.length - 1; bi >= 0; bi--) {
            const b = bullets[bi];
            for (const inv of invaders) {
              if (!inv.alive) continue;
              if (Math.abs(b.x - inv.x) < 18 && Math.abs(b.y - inv.y) < 15) {
                inv.alive = false;
                bullets.splice(bi, 1);
                sound.score();
                spawnBurst(inv.x, inv.y, '#818CF8', 9);
                reportScore(score + 25);
                break;
              }
            }
          }

          for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const eb = enemyBullets[i];
            eb.y += eb.vy * dt;
            if (Math.abs(eb.x - shipX) < 18 && Math.abs(eb.y - (H - 36)) < 16) {
              sound.hit();
              finishGame(false, `Cleared Wave ${invaderWave - 1} · ${score} pts`);
            }
            if (eb.y > H + 10) enemyBullets.splice(i, 1);
          }

          if (invaders.some((i) => i.alive && i.y > H - 64)) {
            finishGame(false, 'Invaders breached orbital perimeter!');
          } else if (aliveCount === 0) {
            invaderWave++;
            reportScore(score + 100);
            spawnInvaders();
          }
        } else if (game.id === 'meteor-dodge') {
          if (pointerActive) {
            dodgePos.x += (pointerX - dodgePos.x) * Math.min(1, dt * 12);
            dodgePos.y += (pointerY - dodgePos.y) * Math.min(1, dt * 12);
          } else {
            if (moveLeft) dodgePos.x -= 280 * dt;
            if (moveRight) dodgePos.x += 280 * dt;
            if (moveUp) dodgePos.y -= 280 * dt;
            if (moveDown) dodgePos.y += 280 * dt;
          }
          dodgePos.x = Math.max(20, Math.min(W - 20, dodgePos.x));
          dodgePos.y = Math.max(40, Math.min(H - 24, dodgePos.y));

          meteorSpawn -= dt;
          if (meteorSpawn <= 0) {
            meteorSpawn = Math.max(0.22, 0.55 - elapsed * 0.008);
            const isFuel = Math.random() < 0.22;
            meteors.push({
              x: 24 + Math.random() * (W - 48),
              y: -24,
              r: isFuel ? 11 : 14 + Math.random() * 14,
              vy: 150 + Math.min(200, elapsed * 5) + Math.random() * 60,
              fuel: isFuel,
            });
          }

          for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.y += m.vy * dt;
            const dist = Math.hypot(m.x - dodgePos.x, m.y - dodgePos.y);
            if (dist < m.r + 14) {
              if (m.fuel) {
                sound.score();
                spawnBurst(m.x, m.y, '#F59E0B', 10);
                reportScore(score + 25);
                meteors.splice(i, 1);
                continue;
              } else {
                sound.hit();
                spawnBurst(dodgePos.x, dodgePos.y, '#EF4444', 16);
                finishGame(false, `Survived ${elapsed.toFixed(1)}s`);
              }
            }
            if (m.y > H + 30) {
              meteors.splice(i, 1);
              if (!m.fuel) reportScore(score + 2);
            }
          }
        } else if (game.id === 'whack-critter') {
          whackTimeLeft -= dt;
          if (whackTimeLeft <= 0) {
            finishGame(score >= 120, `45s Blitz complete · ${score} pts`);
          }
          for (let i = 0; i < 9; i++) {
            const b = burrows[i];
            b.timer -= dt;
            if (b.timer <= 0) {
              if (b.state === 'empty') {
                const roll = Math.random();
                b.state = roll < 0.16 ? 'bomb' : roll < 0.34 ? 'gold' : 'critter';
                b.timer = 0.85 + Math.random() * 0.75;
              } else {
                b.state = 'empty';
                b.timer = 0.35 + Math.random() * 1.1;
              }
            }
            if (actionEdge) {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const bx = 95 + col * 145;
              const by = 115 + row * 135;
              if (Math.hypot(pointerX - bx, pointerY - by) < 54 && b.state !== 'empty') {
                if (b.state === 'bomb') {
                  sound.error();
                  spawnBurst(bx, by, '#EF4444', 14);
                  reportScore(Math.max(0, score - 25));
                } else if (b.state === 'gold') {
                  sound.score();
                  spawnBurst(bx, by, '#F59E0B', 12);
                  reportScore(score + 30);
                } else {
                  sound.tap();
                  spawnBurst(bx, by, '#10B981', 8);
                  reportScore(score + 10);
                }
                b.state = 'empty';
                b.timer = 0.4 + Math.random() * 0.8;
              }
            }
          }
        } else if (game.id === 'pong-duel') {
          if (pointerActive) {
            pongPlayerY += (pointerY - pongPlayerY) * Math.min(1, dt * 16);
          } else {
            if (moveUp) pongPlayerY -= 320 * dt;
            if (moveDown) pongPlayerY += 320 * dt;
          }
          pongPlayerY = Math.max(48, Math.min(H - 48, pongPlayerY));

          // Smart AI paddle
          const aiSpeed = 235;
          if (pongAiY < pongBall.y - 8) pongAiY += aiSpeed * dt;
          else if (pongAiY > pongBall.y + 8) pongAiY -= aiSpeed * dt;
          pongAiY = Math.max(48, Math.min(H - 48, pongAiY));

          pongBall.x += pongBall.vx * dt;
          pongBall.y += pongBall.vy * dt;
          if (pongBall.y < 14) { pongBall.y = 14; pongBall.vy = Math.abs(pongBall.vy); sound.bounce(); }
          if (pongBall.y > H - 14) { pongBall.y = H - 14; pongBall.vy = -Math.abs(pongBall.vy); sound.bounce(); }

          // Left player paddle
          if (pongBall.vx < 0 && pongBall.x < 38 && pongBall.x > 18 && Math.abs(pongBall.y - pongPlayerY) < 46) {
            const offset = (pongBall.y - pongPlayerY) / 46;
            const speed = Math.min(440, Math.hypot(pongBall.vx, pongBall.vy) * 1.04);
            pongBall.vx = Math.abs(Math.cos(offset * 0.9) * speed);
            pongBall.vy = Math.sin(offset * 0.9) * speed;
            sound.bounce();
          }
          // Right AI paddle
          if (pongBall.vx > 0 && pongBall.x > W - 38 && pongBall.x < W - 18 && Math.abs(pongBall.y - pongAiY) < 46) {
            const offset = (pongBall.y - pongAiY) / 46;
            const speed = Math.min(440, Math.hypot(pongBall.vx, pongBall.vy) * 1.03);
            pongBall.vx = -Math.abs(Math.cos(offset * 0.9) * speed);
            pongBall.vy = Math.sin(offset * 0.9) * speed;
            sound.bounce();
          }

          if (pongBall.x > W + 10) {
            pongPScore++;
            sound.score();
            reportScore(pongPScore, `${pongPScore} - ${pongAScore}`);
            pongBall = { x: W / 2, y: H / 2, vx: -230, vy: (Math.random() - 0.5) * 200 };
            if (pongPScore >= 7) finishGame(true, `Won Pong match ${pongPScore} - ${pongAScore}`);
          } else if (pongBall.x < -10) {
            pongAScore++;
            sound.error();
            reportScore(pongPScore, `${pongPScore} - ${pongAScore}`);
            pongBall = { x: W / 2, y: H / 2, vx: 230, vy: (Math.random() - 0.5) * 200 };
            if (pongAScore >= 7) finishGame(false, `AI won ${pongAScore} - ${pongPScore}`);
          }
        } else if (game.id === 'color-catch') {
          if (actionEdge || pendingDir === 'up' || pendingDir === 'down') {
            catchPolarity = catchPolarity === 0 ? 1 : 0;
            sound.flip();
            pendingDir = null;
          }
          if (pointerActive) {
            catchX += (pointerX - catchX) * Math.min(1, dt * 15);
          } else {
            if (moveLeft) catchX -= 340 * dt;
            if (moveRight) catchX += 340 * dt;
          }
          catchX = Math.max(44, Math.min(W - 44, catchX));

          orbSpawn -= dt;
          if (orbSpawn <= 0) {
            orbSpawn = Math.max(0.45, 0.95 - score * 0.002);
            orbs.push({
              x: 34 + Math.random() * (W - 68),
              y: -16,
              vy: 155 + Math.min(170, score * 0.5),
              polarity: Math.random() < 0.5 ? 0 : 1,
            });
          }

          for (let i = orbs.length - 1; i >= 0; i--) {
            const o = orbs[i];
            o.y += o.vy * dt;
            if (o.y >= H - 56 && o.y <= H - 22 && Math.abs(o.x - catchX) < 42) {
              if (o.polarity === catchPolarity) {
                sound.score();
                spawnBurst(o.x, o.y, o.polarity === 0 ? '#EA580C' : '#0D9488', 10);
                reportScore(score + 10);
                orbs.splice(i, 1);
              } else {
                sound.hit();
                finishGame(false, `Caught wrong polarity! Score: ${score}`);
              }
            } else if (o.y > H + 20) {
              orbs.splice(i, 1);
            }
          }
        } else if (game.id === 'tap-target') {
          targetSpawn -= dt;
          if (targetSpawn <= 0 && targets.length < 3) {
            targetSpawn = Math.max(0.45, 1.05 - score * 0.004);
            targets.push({
              x: 56 + Math.random() * (W - 112),
              y: 66 + Math.random() * (H - 132),
              maxR: 32,
              life: Math.max(1.15, 2.2 - score * 0.004),
              maxLife: Math.max(1.15, 2.2 - score * 0.004),
            });
          }
          for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            t.life -= dt;
            if (actionEdge && Math.hypot(pointerX - t.x, pointerY - t.y) <= t.maxR + 8) {
              sound.score();
              spawnBurst(t.x, t.y, '#DC2626', 10);
              reportScore(score + 15);
              targets.splice(i, 1);
              continue;
            }
            if (t.life <= 0) {
              targets.splice(i, 1);
              targetMisses++;
              sound.error();
              if (targetMisses >= 3) {
                finishGame(false, `3 targets expired · Final: ${score} pts`);
              }
            }
          }
        } else if (game.id === 'dino-dash') {
          dinoDuck = moveDown || pendingDir === 'down';
          if ((actionEdge || moveUp || pendingDir === 'up') && dinoY <= 0.5) {
            dinoVy = 460;
            sound.flip();
            pendingDir = null;
          }
          dinoVy -= 1300 * dt;
          dinoY = Math.max(0, dinoY + dinoVy * dt);
          if (dinoY === 0 && dinoVy < 0) dinoVy = 0;

          const runSpeed = 230 + Math.min(180, elapsed * 4);
          for (let i = obstacles.length - 1; i >= 0; i--) {
            const ob = obstacles[i];
            ob.x -= runSpeed * dt;
            if (!ob.passed && ob.x + ob.w < 72) {
              ob.passed = true;
              sound.score();
              reportScore(score + 10);
            }
            const dinoH = dinoDuck ? 24 : 44;
            const dinoTop = groundY - dinoY - dinoH;
            const dinoBottom = groundY - dinoY;
            const obTop = ob.flying ? groundY - 58 : groundY - ob.h;
            const obBottom = ob.flying ? groundY - 32 : groundY;
            if (72 + 28 > ob.x + 4 && 72 < ob.x + ob.w - 4 && dinoBottom > obTop + 3 && dinoTop < obBottom - 3) {
              sound.hit();
              finishGame(false, `Ran ${Math.floor(elapsed * 12)}m`);
            }
            if (ob.x < -60) obstacles.splice(i, 1);
          }

          const lastX = obstacles.length ? obstacles[obstacles.length - 1].x : 0;
          if (lastX < W - 190 - Math.random() * 140) {
            const flying = score >= 40 && Math.random() < 0.3;
            obstacles.push({
              x: W + 40,
              w: flying ? 34 : 22 + Math.random() * 16,
              h: flying ? 26 : 34 + Math.random() * 20,
              flying,
              passed: false,
            });
          }
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);

      // Subtle grid lines for spatial depth
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 24; i < W; i += 24) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
      }

      if (game.id === 'snake') {
        // Apple
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.arc(apple.x * CELL + CELL / 2, apple.y * CELL + CELL / 2, CELL * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Snake
        snake.forEach((seg, idx) => {
          ctx.fillStyle = idx === 0 ? '#2DD4BF' : idx % 2 === 0 ? '#0D9488' : '#14B8A6';
          ctx.beginPath();
          ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 5);
          ctx.fill();
        });
      } else if (game.id === 'brick-breaker') {
        bricks.forEach((b) => {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 4);
          ctx.fill();
          if (b.hp > 1) {
            ctx.strokeStyle = '#F8FAFC';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
          }
        });
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.roundRect(paddleX - paddleW / 2, H - 36, paddleW, 14, 7);
        ctx.fill();
        ctx.fillStyle = '#FB923C';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 13px monospace';
        ctx.fillText(`LIVES: ${lives}`, 16, 26);
      } else if (game.id === 'flappy-hop') {
        ctx.fillStyle = '#0C4A6E';
        ctx.fillRect(0, 0, W, H);
        pipes.forEach((p) => {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(p.x, 0, 54, p.gapY - p.gapH / 2);
          ctx.fillRect(p.x, p.gapY + p.gapH / 2, 54, H);
          ctx.fillStyle = '#059669';
          ctx.fillRect(p.x - 4, p.gapY - p.gapH / 2 - 14, 62, 14);
          ctx.fillRect(p.x - 4, p.gapY + p.gapH / 2, 62, 14);
        });
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.moveTo(bird.x + 12, bird.y - 4);
        ctx.lineTo(bird.x + 24, bird.y + 1);
        ctx.lineTo(bird.x + 12, bird.y + 6);
        ctx.fill();
      } else if (game.id === 'space-blaster') {
        invaders.forEach((inv) => {
          if (!inv.alive) return;
          ctx.fillStyle = inv.row === 0 ? '#F43F5E' : inv.row === 1 ? '#FB923C' : '#38BDF8';
          ctx.beginPath();
          ctx.roundRect(inv.x - 14, inv.y - 10, 28, 20, 5);
          ctx.fill();
        });
        ctx.fillStyle = '#FDE047';
        bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 8, 4, 14));
        ctx.fillStyle = '#F87171';
        enemyBullets.forEach((eb) => ctx.fillRect(eb.x - 2.5, eb.y - 6, 5, 12));
        // Player ship
        ctx.fillStyle = '#2DD4BF';
        ctx.beginPath();
        ctx.moveTo(shipX, H - 54);
        ctx.lineTo(shipX - 18, H - 24);
        ctx.lineTo(shipX + 18, H - 24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 13px monospace';
        ctx.fillText(`WAVE ${invaderWave}`, 16, 26);
      } else if (game.id === 'meteor-dodge') {
        meteors.forEach((m) => {
          ctx.fillStyle = m.fuel ? '#FBBF24' : '#64748B';
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
          if (!m.fuel) {
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.moveTo(dodgePos.x, dodgePos.y - 16);
        ctx.lineTo(dodgePos.x - 14, dodgePos.y + 14);
        ctx.lineTo(dodgePos.x + 14, dodgePos.y + 14);
        ctx.closePath();
        ctx.fill();
      } else if (game.id === 'whack-critter') {
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '700 15px monospace';
        ctx.fillText(`TIME: ${Math.max(0, whackTimeLeft).toFixed(0)}s`, 18, 30);
        for (let i = 0; i < 9; i++) {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const bx = 95 + col * 145;
          const by = 115 + row * 135;
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.ellipse(bx, by + 22, 48, 22, 0, 0, Math.PI * 2);
          ctx.fill();
          const b = burrows[i];
          if (b.state !== 'empty') {
            ctx.fillStyle = b.state === 'bomb' ? '#EF4444' : b.state === 'gold' ? '#F59E0B' : '#10B981';
            ctx.beginPath();
            ctx.arc(bx, by - 4, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0F172A';
            ctx.font = '700 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.state === 'bomb' ? 'BOMB' : b.state === 'gold' ? '+30' : '+10', bx, by + 2);
            ctx.textAlign = 'left';
          }
        }
      } else if (game.id === 'pong-duel') {
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#2DD4BF';
        ctx.beginPath(); ctx.roundRect(18, pongPlayerY - 42, 12, 84, 6); ctx.fill();
        ctx.fillStyle = '#FB923C';
        ctx.beginPath(); ctx.roundRect(W - 30, pongAiY - 42, 12, 84, 6); ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath(); ctx.arc(pongBall.x, pongBall.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.font = '700 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${pongPScore}   ${pongAScore}`, W / 2, 42);
        ctx.textAlign = 'left';
      } else if (game.id === 'color-catch') {
        orbs.forEach((o) => {
          ctx.fillStyle = o.polarity === 0 ? '#EA580C' : '#0D9488';
          ctx.beginPath();
          ctx.arc(o.x, o.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.fillStyle = catchPolarity === 0 ? '#EA580C' : '#0D9488';
        ctx.beginPath();
        ctx.roundRect(catchX - 38, H - 44, 76, 18, 9);
        ctx.fill();
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '600 13px sans-serif';
        ctx.fillText('TAP TO SWAP POLARITY', 16, 26);
      } else if (game.id === 'tap-target') {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 13px monospace';
        ctx.fillText(`MISSES: ${targetMisses}/3`, 16, 26);
        targets.forEach((t) => {
          const pct = Math.max(0, t.life / t.maxLife);
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.maxR * (0.4 + pct * 0.8), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#DC2626';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.maxR * 0.65, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.maxR * 0.28, 0, Math.PI * 2); ctx.fill();
        });
      } else if (game.id === 'dino-dash') {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
        // Dino
        const dinoH = dinoDuck ? 24 : 44;
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.roundRect(72, groundY - dinoY - dinoH, 30, dinoH, 6);
        ctx.fill();
        // Obstacles
        obstacles.forEach((ob) => {
          ctx.fillStyle = ob.flying ? '#F59E0B' : '#EF4444';
          const obTop = ob.flying ? groundY - 58 : groundY - ob.h;
          ctx.beginPath();
          ctx.roundRect(ob.x, obTop, ob.w, ob.h, 4);
          ctx.fill();
        });
      }

      // Draw particles
      particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [game.id, restartNonce, controlInputRef]);

  return (
    <div className="w-full h-full flex items-center justify-center p-1">
      <canvas
        ref={canvasRef}
        data-testid={`canvas-${game.id}`}
        className="touch-game-surface w-full h-full max-w-[min(100%,calc(100vh-12rem))] md:max-w-[460px] max-h-[min(100%,calc(100vw-2rem))] aspect-square rounded-2xl border border-zinc-700/60 shadow-lg bg-slate-900"
        style={{ maxHeight: '100%', maxWidth: '100%', width: 'auto', height: 'auto' }}
      />
    </div>
  );
};
