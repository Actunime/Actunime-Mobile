// Branchement de `@react-native/normalize-colors` (voir `metro.config.js`) : même fonction, puis remplacement des
// couleurs de la charte par celles du thème du membre (`lib/color-remap.ts`). Sans thème, la couleur passe telle quelle.
// L'original est lu par son chemin pour ne pas être redirigé vers ce fichier.
const original = require('../../node_modules/@react-native/normalize-colors/index.js');
const { applyRemap, currentColorRemap } = require('./color-remap');

function normalizeColor(color) {
  const value = original(color);
  const table = currentColorRemap();
  return table === undefined || typeof value !== 'number' ? value : applyRemap(value, table);
}

module.exports = normalizeColor;
