import kaplay from 'kaplay';

/**
 * Initialize and run the kaplay game
 */
export function initGame(canvasId: string): void {
  const ctx = kaplay({
    canvas: document.getElementById(canvasId) as HTMLCanvasElement,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Set up the game scene
  ctx.scene('main', () => {
    // Add a simple background
    ctx.add([ctx.rect(ctx.width(), ctx.height()), ctx.color(51, 55, 61)]);

    // Add a title
    ctx.add([
      ctx.text('Kaplay Game', { size: 48 }),
      ctx.pos(ctx.width() / 2, 100),
      ctx.anchor('center'),
      ctx.color(255, 255, 255),
    ]);

    // Add some game objects to demonstrate
    const box = ctx.add([
      ctx.rect(50, 50),
      ctx.pos(ctx.width() / 2, ctx.height() / 2),
      ctx.anchor('center'),
      ctx.color(100, 200, 255),
      ctx.area(),
    ]);

    // Make the box interactive
    box.onHoverUpdate(() => {
      ctx.setCursor('pointer');
    });

    box.onHoverEnd(() => {
      ctx.setCursor('default');
    });

    box.onClick(() => {
      box.color.r = Math.random() * 255;
      box.color.g = Math.random() * 255;
      box.color.b = Math.random() * 255;
    });

    // Add instructions
    ctx.add([
      ctx.text('Click the box to change colors. Press SPACE to move.', {
        size: 16,
      }),
      ctx.pos(ctx.width() / 2, ctx.height() - 50),
      ctx.anchor('center'),
      ctx.color(200, 200, 200),
    ]);

    // Handle keyboard input
    ctx.onKeyPress('space', () => {
      box.pos.x = Math.random() * ctx.width();
      box.pos.y = Math.random() * ctx.height();
    });
  });

  // Start the game
  ctx.go('main');
}
