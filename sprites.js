// Compositor de sprites por capas (misma lógica que tools/sprites/lib.js, versión navegador)

// sprite: {size, palette, layers:[{part, x?, y?, flip?, palette?}]}
// parts:  {id: {width, height, offset_x, offset_y, pixels[], palette}}
export function composeSprite(sprite, parts) {
  const size = sprite.size || 32;
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  for (const layer of sprite.layers || []) {
    const part = parts[layer.part];
    if (!part) continue;
    const ox = layer.x ?? part.offset_x ?? 0;
    const oy = layer.y ?? part.offset_y ?? 0;
    for (let py = 0; py < part.height; py++) {
      const row = part.pixels[py] || '';
      for (let px = 0; px < part.width; px++) {
        const ch = row[layer.flip ? part.width - 1 - px : px];
        if (!ch || ch === '.' || ch === ' ') continue;
        const color = (layer.palette && layer.palette[ch]) || (sprite.palette || {})[ch] || (part.palette || {})[ch];
        if (!color) continue;
        const x = ox + px, y = oy + py;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        grid[y][x] = color;
      }
    }
  }
  return grid;
}

// Dibuja el sprite en un canvas (1 px de canvas por píxel; el CSS lo escala con image-rendering: pixelated)
export function drawSprite(canvas, sprite, parts, { flip = false } = {}) {
  const grid = composeSprite(sprite, parts);
  const size = grid.length;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = grid[y][x];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(flip ? size - 1 - x : x, y, 1, 1);
  }
  return canvas;
}
