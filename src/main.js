import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-600.css';
import '@fontsource/noto-serif-devanagari/devanagari-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './ui/hud.css';
import './ui/phone.css';
import './ui/scene-hud.css';
import './ui/navigation.css';
import './ui/touch.css';
import './ui/menu.css';
import './ui/landscape.css';
import './ui/chat.css';
import './ui/orientation.js';
import { Game } from './game/Game.js';
import { WindAmbience } from './game/audio/WindAmbience.js';
import { Hud } from './ui/Hud.js';
import { ChatClient } from './network/ChatClient.js';
import { ChatPanel } from './ui/ChatPanel.js';

const shell = document.getElementById('game-shell');
const canvas = document.getElementById('game-view');
const startup = window.villageStartup;
let game, hud, ambience, chatClient, chatPanel;

function dispose() {
  chatClient?.dispose();
  chatPanel?.dispose();
  game?.dispose();
  hud?.dispose();
  ambience?.dispose();
}

async function startVillage() {
  if (startup?.blocked) return;
  let checkingGraphics = false;
  try {
    ambience = new WindAmbience();
    hud = new Hud(shell, ambience);
    chatClient = new ChatClient({ character: hud.character });
    chatPanel = new ChatPanel(shell, { client: chatClient });
    hud.attachChat(chatPanel);
    hud.onCharacter = character => chatClient.setName(character.name);
    chatClient.start();
    startup?.stage('3D इंजन शुरू हो रहा है…');
    checkingGraphics = true;
    game = new Game(canvas, hud);
    checkingGraphics = false;
    await game.start({
      onTextureProgress: startup?.progress,
      onPrepare: () => startup?.stage('गाँव तैयार हो रहा है…'),
    });
    if (startup) {
      if (!startup.ready()) dispose(); // An essential script or stylesheet failed during startup.
    } else {
      // Hosts that block inline scripts can still run the bundled game.
      shell.removeAttribute('inert');
      document.getElementById('startup-screen').hidden = true;
      document.documentElement.dataset.bootState = 'ready';
    }
  } catch (error) {
    console.error('The Empty Village failed to start:', error);
    const message = checkingGraphics
      ? '3D इंजन नहीं खुल पाया। गेम के लिए WebGL 2 और हार्डवेयर एक्सेलरेशन वाला ब्राउज़र चाहिए।'
      : error?.name === 'TextureLoadError'
        ? 'गाँव की तस्वीरें लोड नहीं हुईं। कनेक्शन जाँचो या पूरी dist फ़ोल्डर से गेम चलाओ।'
        : 'गाँव पूरा नहीं खुल पाया। पेज दोबारा खोलकर फिर कोशिश करो।';
    if (startup) startup.fail(message);
    else {
      document.getElementById('loading-note').textContent = message;
      document.getElementById('startup-actions').hidden = false;
    }
    dispose();
  }
}

await startVillage();
if (import.meta.hot) import.meta.hot.dispose(dispose);
