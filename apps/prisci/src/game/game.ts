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
  });

  // Set gravity
  ctx.setGravity(1600);

  let score = 0;
  let gameOver = false;

  // Set up the game scene
  ctx.scene('main', () => {
    // Score display
    const scoreLabel = ctx.add([
      ctx.text('Score: 0', { size: 24 }),
      ctx.pos(20, 20),
      ctx.color(255, 255, 255),
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
    ]);

    // Create platforms
    const platforms = [
      { x: 150, y: 450, w: 200, h: 20 },
      { x: 450, y: 350, w: 150, h: 20 },
      { x: 100, y: 250, w: 180, h: 20 },
      { x: 500, y: 200, w: 200, h: 20 },
    ];

    platforms.forEach((p) => {
      ctx.add([
        ctx.rect(p.w, p.h),
        ctx.pos(p.x, p.y),
        ctx.area(),
        ctx.body({ isStatic: true }),
        ctx.color(80, 150, 200),
        'platform',
      ]);
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

    // Spawn coins
    function spawnCoin() {
      const x = ctx.rand(50, ctx.width() - 50);
      const y = ctx.rand(100, 400);

      ctx.add([
        ctx.circle(10),
        ctx.pos(x, y),
        ctx.area(),
        ctx.color(255, 220, 0),
        ctx.anchor('center'),
        'coin',
      ]);
    }

    // Initial coins
    for (let i = 0; i < 5; i++) {
      spawnCoin();
    }

    // Spawn obstacles
    function spawnObstacle() {
      if (gameOver) return;

      const obstacle = ctx.add([
        ctx.rect(30, 30),
        ctx.pos(ctx.width(), ctx.rand(100, ctx.height() - 100)),
        ctx.area(),
        ctx.color(255, 50, 50),
        ctx.anchor('center'),
        'obstacle',
        { speed: 200 },
      ]);

      obstacle.onUpdate(() => {
        obstacle.move(-obstacle.speed, 0);
        if (obstacle.pos.x < -50) {
          ctx.destroy(obstacle);
        }
      });

      ctx.wait(ctx.rand(2, 4), spawnObstacle);
    }

    ctx.wait(3, spawnObstacle);

    // Player controls
    ctx.onKeyDown('left', () => {
      if (!gameOver) player.move(-300, 0);
    });

    ctx.onKeyDown('right', () => {
      if (!gameOver) player.move(300, 0);
    });

    ctx.onKeyPress('space', () => {
      if (!gameOver && player.isGrounded()) {
        player.jump(500);
      }
    });

    ctx.onKeyPress('up', () => {
      if (!gameOver && player.isGrounded()) {
        player.jump(500);
      }
    });

    // Collect coins
    player.onCollide('coin', (coin) => {
      ctx.destroy(coin);
      score += 10;
      scoreLabel.text = `Score: ${score}`;
      spawnCoin();
    });

    // Hit obstacle - game over
    player.onCollide('obstacle', () => {
      if (gameOver) return;
      gameOver = true;

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

      ctx.add([
        ctx.text('Press R to restart', { size: 24 }),
        ctx.pos(ctx.width() / 2, ctx.height() / 2 + 70),
        ctx.anchor('center'),
        ctx.color(200, 200, 200),
      ]);
    });

    // Keep player in bounds
    player.onUpdate(() => {
      if (player.pos.x < 0) player.pos.x = 0;
      if (player.pos.x > ctx.width()) player.pos.x = ctx.width();
      if (player.pos.y > ctx.height()) {
        gameOver = true;
      }
    });

    // Restart game
    ctx.onKeyPress('r', () => {
      if (gameOver) {
        score = 0;
        gameOver = false;
        ctx.go('main');
      }
    });

    // Instructions
    ctx.add([
      ctx.text('Arrow Keys/WASD: Move | SPACE/UP: Jump | Collect coins, avoid red squares!', {
        size: 14,
      }),
      ctx.pos(ctx.width() / 2, 20),
      ctx.anchor('center'),
      ctx.color(200, 200, 200),
    ]);
  });

  // Start the game
  ctx.go('main');
}
