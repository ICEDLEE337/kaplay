import kaplay from 'kaplay';

/**
 * Initialize and run the kaplay game
 */
export function initGame(canvasId: string): void {
  const ctx = kaplay({
    canvas: document.getElementById(canvasId) as HTMLCanvasElement,
    width: 800,
    height: 600,
    background: [20, 20, 40],
    touchToMouse: true, // Enable touch events
    pixelDensity: 1, // Cap at 1x to avoid Retina overhead on mobile
  });

  // Set gravity
  ctx.setGravity(1600);

  let score = 0;
  let highScore = 0;
  try {
    const stored = (globalThis as any).localStorage?.getItem('highScore');
    if (stored) highScore = parseInt(stored);
  } catch (e) {
    // LocalStorage not available
  }
  let gameOver = false;
  let lives = 3;
  let combo = 0;
  let comboTimer = 0;
  let baseObstacleSpeed = 200;
  let hasDoubleJump = false;
  let hasShield = false;
  let jumpsLeft = 1;
  let sceneRestarts = 0; // Track scene resets to ignore stale timers

  // Platform definitions for smart coin spawning
  const platformData = [
    { x: 150, y: 450, w: 200, h: 20 },
    { x: 450, y: 350, w: 150, h: 20 },
    { x: 100, y: 250, w: 180, h: 20 },
    { x: 500, y: 200, w: 200, h: 20 },
  ];

  // Set up the game scene
  ctx.scene('main', () => {
    // Capture the scene ID to detect restart/stale callbacks
    const currentSceneRestart = ++sceneRestarts;
    // Score display
    const scoreLabel = ctx.add([
      ctx.text('Score: 0', { size: 24 }),
      ctx.pos(20, 20),
      ctx.color(255, 255, 255),
      ctx.z(100),
    ]);

    // High score display
    const highScoreLabel = ctx.add([
      ctx.text(`Best: ${highScore}`, { size: 18 }),
      ctx.pos(20, 50),
      ctx.color(255, 200, 100),
      ctx.z(100),
    ]);

    // Combo display
    const comboLabel = ctx.add([
      ctx.text('', { size: 20 }),
      ctx.pos(ctx.width() / 2, 60),
      ctx.anchor('center'),
      ctx.color(255, 255, 100),
      ctx.z(100),
    ]);

    // Lives display
    const livesLabel = ctx.add([
      ctx.text(`Lives: ${lives}`, { size: 24 }),
      ctx.pos(ctx.width() - 20, 20),
      ctx.anchor('topright'),
      ctx.color(255, 100, 100),
      ctx.z(100),
    ]);

    // Create ground
    ctx.add([
      ctx.rect(ctx.width(), 40),
      ctx.pos(0, ctx.height() - 40),
      ctx.area(),
      ctx.body({ isStatic: true }),
      ctx.color(100, 100, 100),
      'ground',
      'platform', // Make ground also a platform
    ]);

    // Create platforms
    const platforms: any[] = [];
    platformData.forEach((p) => {
      const platform = ctx.add([
        ctx.rect(p.w, p.h),
        ctx.pos(p.x, p.y),
        ctx.area(),
        ctx.body({ isStatic: true }),
        ctx.color(80, 150, 200),
        'platform',
      ]);
      platforms.push({ ...p, obj: platform });
    });

    // Create player
    const player = ctx.add([
      ctx.rect(30, 30),
      ctx.pos(100, 100),
      ctx.area(),
      ctx.body(),
      ctx.color(100, 255, 100),
      ctx.anchor('center'),
      'player',
    ]);

    // Smart coin spawning - only near platforms
    function spawnCoin() {
      const platform = ctx.choose(platformData);
      const x = platform.x + ctx.rand(20, platform.w - 20);
      const y = platform.y - ctx.rand(40, 80); // Above platform

      ctx.add([
        ctx.circle(10),
        ctx.pos(x, y),
        ctx.area(),
        ctx.color(255, 220, 0),
        ctx.anchor('center'),
        ctx.outline(2, ctx.rgb(200, 180, 0)),
        'coin',
      ]);
    }

    // Spawn power-ups
    function spawnPowerUp() {
      if (gameOver || currentSceneRestart !== sceneRestarts) return;

      const types = ['doubleJump', 'shield'];
      const type = ctx.choose(types);
      const platform = ctx.choose(platformData);
      const x = platform.x + ctx.rand(20, platform.w - 20);
      const y = platform.y - 60;

      const color = type === 'doubleJump' ? ctx.rgb(100, 200, 255) : ctx.rgb(255, 100, 200);

      ctx.add([
        ctx.rect(20, 20),
        ctx.pos(x, y),
        ctx.area(),
        ctx.color(color),
        ctx.anchor('center'),
        ctx.outline(2),
        'powerup',
        { type },
      ]);

      ctx.wait(ctx.rand(10, 15), spawnPowerUp);
    }

    // Initial coins
    for (let i = 0; i < 6; i++) {
      spawnCoin();
    }

    ctx.wait(8, spawnPowerUp);

    // Spawn obstacles with variety
    function spawnObstacle() {
      if (gameOver || currentSceneRestart !== sceneRestarts) return;

      const currentSpeed = baseObstacleSpeed + (score / 10);
      const pattern = ctx.choose(['straight', 'wave', 'bounce']);

      const obstacle = ctx.add([
        ctx.rect(30, 30),
        ctx.pos(ctx.width(), ctx.rand(100, ctx.height() - 100)),
        ctx.area(),
        ctx.color(255, 50, 50),
        ctx.anchor('center'),
        'obstacle',
        { speed: currentSpeed, pattern, time: 0, startY: 0 },
      ]);

      obstacle.startY = obstacle.pos.y;

      obstacle.onUpdate(() => {
        obstacle.time += ctx.dt();
        obstacle.move(-obstacle.speed, 0);

        // Different movement patterns
        if (obstacle.pattern === 'wave') {
          obstacle.pos.y = obstacle.startY + Math.sin(obstacle.time * 3) * 50;
        } else if (obstacle.pattern === 'bounce') {
          obstacle.pos.y = obstacle.startY + Math.abs(Math.sin(obstacle.time * 4)) * 80;
        }

        if (obstacle.pos.x < -50) {
          safeDestroy(obstacle);
        }
      });

      ctx.wait(ctx.rand(1.5, 3), spawnObstacle);
    }

    ctx.wait(3, spawnObstacle);

    // Mobile control state
    let leftPressed = false;
    let rightPressed = false;

    // Set up mobile button controls (grab elements once)
    const leftBtn = document.getElementById('btn-left') as HTMLElement | null;
    const rightBtn = document.getElementById('btn-right') as HTMLElement | null;
    const jumpBtn = document.getElementById('btn-jump') as HTMLElement | null;
    const restartBtn = document.getElementById('btn-restart') as HTMLElement | null;

    // Define handlers so we can remove/add them idempotently
    const startLeft = (e: Event) => { if (e.cancelable) e.preventDefault(); leftPressed = true; };
    const endLeft = (e: Event) => { if (e.cancelable) e.preventDefault(); leftPressed = false; };

    const startRight = (e: Event) => { if (e.cancelable) e.preventDefault(); rightPressed = true; };
    const endRight = (e: Event) => { if (e.cancelable) e.preventDefault(); rightPressed = false; };

    // Handle jumping with double jump - define before handlers that reference it
    function doJump() {
      if (gameOver) return;
      if (player.isGrounded()) {
        player.jump(600); // Increased from 500
        jumpsLeft = hasDoubleJump ? 2 : 1;
      } else if (jumpsLeft > 0 && hasDoubleJump) {
        player.jump(600); // Increased from 500
        jumpsLeft--;
      }
    }

    const handleJump = (e: Event) => { if (e.cancelable) e.preventDefault(); doJump(); };

    const handleRestart = (e: Event) => { if (e.cancelable) e.preventDefault(); if (gameOver) restartGame(); };

    // Restart function
    function restartGame() {
      // reset game state
      score = 0;
      lives = 3;
      gameOver = false;
      combo = 0;
      hasDoubleJump = false;
      hasShield = false;
      jumpsLeft = 1;
      baseObstacleSpeed = 200;
      leftPressed = false;
      rightPressed = false;

      // hide restart UI
      if (restartBtn) {
        restartBtn.classList.add('hidden');
      }

      // navigate back to main scene (kaplay should clear previous scene timers)
      ctx.go('main');
    }

    // Idempotently attach mobile listeners (remove first to avoid duplicates)
    if (restartBtn) {
      restartBtn.removeEventListener('touchstart', handleRestart as EventListener);
      restartBtn.removeEventListener('click', handleRestart as EventListener);
      restartBtn.addEventListener('touchstart', handleRestart, { passive: false });
      restartBtn.addEventListener('click', handleRestart);
    }

    if (leftBtn) {
      leftBtn.removeEventListener('touchstart', startLeft as EventListener);
      leftBtn.removeEventListener('touchend', endLeft as EventListener);
      leftBtn.removeEventListener('touchcancel', endLeft as EventListener);
      leftBtn.removeEventListener('mousedown', startLeft as EventListener);
      leftBtn.removeEventListener('mouseup', endLeft as EventListener);
      leftBtn.removeEventListener('mouseleave', endLeft as EventListener);

      leftBtn.addEventListener('touchstart', startLeft, { passive: false });
      leftBtn.addEventListener('touchend', endLeft, { passive: false });
      leftBtn.addEventListener('touchcancel', endLeft, { passive: false });
      leftBtn.addEventListener('mousedown', startLeft);
      leftBtn.addEventListener('mouseup', endLeft);
      leftBtn.addEventListener('mouseleave', endLeft);
    }

    if (rightBtn) {
      rightBtn.removeEventListener('touchstart', startRight as EventListener);
      rightBtn.removeEventListener('touchend', endRight as EventListener);
      rightBtn.removeEventListener('touchcancel', endRight as EventListener);
      rightBtn.removeEventListener('mousedown', startRight as EventListener);
      rightBtn.removeEventListener('mouseup', endRight as EventListener);
      rightBtn.removeEventListener('mouseleave', endRight as EventListener);

      rightBtn.addEventListener('touchstart', startRight, { passive: false });
      rightBtn.addEventListener('touchend', endRight, { passive: false });
      rightBtn.addEventListener('touchcancel', endRight, { passive: false });
      rightBtn.addEventListener('mousedown', startRight);
      rightBtn.addEventListener('mouseup', endRight);
      rightBtn.addEventListener('mouseleave', endRight);
    }

    if (jumpBtn) {
      jumpBtn.removeEventListener('touchstart', handleJump as EventListener);
      jumpBtn.removeEventListener('mousedown', handleJump as EventListener);
      jumpBtn.addEventListener('touchstart', handleJump, { passive: false });
      jumpBtn.addEventListener('mousedown', handleJump);
    }

    // Player controls - keyboard
    ctx.onKeyDown('left', () => {
      if (!gameOver) player.move(-300, 0);
    });

    ctx.onKeyDown('right', () => {
      if (!gameOver) player.move(300, 0);
    });

    ctx.onKeyDown('a', () => {
      if (!gameOver) player.move(-300, 0);
    });

    ctx.onKeyDown('d', () => {
      if (!gameOver) player.move(300, 0);
    });

    ctx.onKeyPress('space', doJump);
    ctx.onKeyPress('up', doJump);
    ctx.onKeyPress('w', doJump);

    // Reset jumps when grounded
    player.onGround(() => {
      jumpsLeft = hasDoubleJump ? 2 : 1;
    });

    // Deferred destroy: avoid destroying objects mid-collision-check
    // which can cause null references in kaplay's internal overlap tests.
    const pendingDestroy = new Set<any>();
    function safeDestroy(obj: any) {
      if (!obj || pendingDestroy.has(obj)) return;
      pendingDestroy.add(obj);
      // Hide immediately so it doesn't interact further
      obj.hidden = true;
      if (obj.area) {
        try { obj.pos = ctx.vec2(-9999, -9999); } catch (_) { /* already gone */ }
      }
    }
    ctx.onUpdate(() => {
      if (pendingDestroy.size > 0) {
        pendingDestroy.forEach((obj) => {
          try { ctx.destroy(obj); } catch (_) { /* already destroyed */ }
        });
        pendingDestroy.clear();
      }
    });

    // Collect coins with combo system
    player.onCollide('coin', (coin) => {
      safeDestroy(coin);

      // Combo system
      combo++;
      comboTimer = 3; // 3 seconds to maintain combo
      const multiplier = Math.min(combo, 10);
      const points = 10 * multiplier;
      score += points;

      scoreLabel.text = `Score: ${score}`;
      comboLabel.text = combo > 1 ? `Combo x${combo}!` : '';

      // Visual feedback
      ctx.shake(2);

      spawnCoin();
    });

    // Collect power-ups
    player.onCollide('powerup', (powerup) => {
      safeDestroy(powerup);
      ctx.shake(4);

      if (powerup.type === 'doubleJump') {
        hasDoubleJump = true;
        jumpsLeft = 2;
        ctx.add([
          ctx.text('Double Jump!', { size: 24 }),
          ctx.pos(ctx.width() / 2, ctx.height() / 2),
          ctx.anchor('center'),
          ctx.color(100, 200, 255),
          ctx.opacity(1),
          ctx.lifespan(2),
          ctx.z(100),
        ]);
      } else if (powerup.type === 'shield') {
        hasShield = true;
        player.color = ctx.rgb(255, 200, 255);
        ctx.add([
          ctx.text('Shield Active!', { size: 24 }),
          ctx.pos(ctx.width() / 2, ctx.height() / 2),
          ctx.anchor('center'),
          ctx.color(255, 100, 200),
          ctx.opacity(1),
          ctx.lifespan(2),
          ctx.z(100),
        ]);

        ctx.wait(10, () => {
          hasShield = false;
          player.color = ctx.rgb(100, 255, 100);
        });
      }
    });

    // Hit obstacle - lose life or game over
    player.onCollide('obstacle', (obstacle) => {
      if (gameOver) return;

      safeDestroy(obstacle);
      ctx.shake(10);

      if (hasShield) {
        // Shield absorbs hit
        hasShield = false;
        player.color = ctx.rgb(100, 255, 100);
        return;
      }

      lives--;
      livesLabel.text = `Lives: ${lives}`;
      combo = 0;
      comboLabel.text = '';

      if (lives <= 0) {
        gameOver = true;

        // Show restart button
        if (restartBtn) {
          restartBtn.classList.remove('hidden');
        }

        // Update high score
        if (score > highScore) {
          highScore = score;
          highScoreLabel.text = `Best: ${highScore}`;
          try {
            (globalThis as any).localStorage?.setItem('highScore', highScore.toString());
          } catch (e) {
            // LocalStorage not available
          }
        }

        ctx.add([
          ctx.text('GAME OVER!', { size: 48 }),
          ctx.pos(ctx.width() / 2, ctx.height() / 2 - 50),
          ctx.anchor('center'),
          ctx.color(255, 100, 100),
        ]);

        ctx.add([
          ctx.text(`Final Score: ${score}`, { size: 32 }),
          ctx.pos(ctx.width() / 2, ctx.height() / 2 + 20),
          ctx.anchor('center'),
          ctx.color(255, 255, 255),
        ]);

        if (score === highScore && score > 0) {
          ctx.add([
            ctx.text('NEW HIGH SCORE!', { size: 24 }),
            ctx.pos(ctx.width() / 2, ctx.height() / 2 - 100),
            ctx.anchor('center'),
            ctx.color(255, 215, 0),
          ]);
        }

        ctx.add([
          ctx.text('Press R to restart', { size: 24 }),
          ctx.pos(ctx.width() / 2, ctx.height() / 2 + 70),
          ctx.anchor('center'),
          ctx.color(200, 200, 200),
        ]);
      } else {
        // Flash red when hit
        player.color = ctx.rgb(255, 100, 100);
        ctx.wait(0.2, () => {
          player.color = ctx.rgb(100, 255, 100);
        });
      }
    });

    // Keep player in bounds and reset if falling off
    player.onUpdate(() => {
      // Handle mobile touch controls
      if (!gameOver) {
        if (leftPressed) player.move(-300, 0);
        if (rightPressed) player.move(300, 0);
      }

      if (player.pos.x < 0) player.pos.x = 0;
      if (player.pos.x > ctx.width()) player.pos.x = ctx.width();
      if (player.pos.y > ctx.height() + 50) {
        // Reset to starting position
        player.pos = ctx.vec2(100, 100);
        lives--;
        livesLabel.text = `Lives: ${lives}`;
        combo = 0;
        comboLabel.text = '';

        if (lives <= 0) {
          gameOver = true;
        }
      }

      // Update combo timer
      if (comboTimer > 0 && !gameOver) {
        comboTimer -= ctx.dt();
        if (comboTimer <= 0 && combo > 0) {
          combo = 0;
          comboLabel.text = '';
        }
      }
    });

    // Restart game with keyboard
    ctx.onKeyPress('r', () => {
      if (gameOver) {
        restartGame();
      }
    });

    // Instructions
    ctx.add([
      ctx.text('WASD/Arrows: Move & Jump | Collect coins! Avoid red! Get powerups!', {
        size: 14,
      }),
      ctx.pos(ctx.width() / 2, ctx.height() - 20),
      ctx.anchor('center'),
      ctx.color(200, 200, 200),
    ]);
  });

  // Start the game
  ctx.go('main');
}
