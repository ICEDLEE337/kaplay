import './app.element.css';
import { initGame } from '../game/game';

export class AppElement extends HTMLElement {
  public static observedAttributes = [];

  connectedCallback() {
    // Create canvas element for the game with mobile controls
    this.innerHTML = `
      <div id="game-container">
        <canvas id="game-canvas"></canvas>
        <div id="mobile-controls" class="mobile-controls">
          <div class="dpad-container">
            <button id="btn-left" class="control-btn dpad-btn left-btn" aria-label="Move left">
              <span class="arrow">◀</span>
            </button>
            <button id="btn-right" class="control-btn dpad-btn right-btn" aria-label="Move right">
              <span class="arrow">▶</span>
            </button>
          </div>
          <div class="action-container">
            <button id="btn-jump" class="control-btn jump-btn" aria-label="Jump">
              <span class="jump-text">JUMP</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize the kaplay game once the DOM is ready
    requestAnimationFrame(() => {
      initGame('game-canvas');
    });
  }
}
customElements.define('kaplay-root', AppElement);
