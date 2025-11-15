import './app.element.css';
import { initGame } from '../game/game';

export class AppElement extends HTMLElement {
  public static observedAttributes = [];

  connectedCallback() {
    // Create canvas element for the game
    this.innerHTML = `
      <div id="game-container">
        <canvas id="game-canvas"></canvas>
      </div>
    `;

    // Initialize the kaplay game once the DOM is ready
    requestAnimationFrame(() => {
      initGame('game-canvas');
    });
  }
}
customElements.define('kaplay-root', AppElement);
