import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutPhotoPins, layoutPosterPhotos, nudgeBoxClear } from '../../app/metro/map-label.ts';

const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;

/** Touch target from hero-map.css: .pin .hit is left -23, top -54, 46×62. */
function hitBox(x, y) {
  return { x: x - 23, y: y - 54, width: 46, height: 62 };
}

function pinBox(x, y, diameter) {
  return {
    x: x - Math.max(24, diameter / 2 + 4),
    y: y - diameter - 12,
    width: Math.max(48, diameter + 8),
    height: diameter + 24,
  };
}

function assertHitInside(point, width, height) {
  const hit = hitBox(point.x, point.y);
  assert.ok(hit.x >= 2 && hit.y >= 2, `hit left/top ${hit.x},${hit.y}`);
  assert.ok(hit.x + hit.width <= width - 2 && hit.y + hit.height <= height - 2,
    `hit right/bottom ${hit.x + hit.width},${hit.y + hit.height}`);
}

test('photo pins stay inside the map and clear of the caption, zoom controls, and labels', () => {
  const width = 800;
  const height = 600;
  const caption = { x: 8, y: 8, width: 220, height: 48 };
  const zoomIn = { x: 740, y: 492, width: 48, height: 48 };
  const zoomOut = { x: 740, y: 544, width: 48, height: 48 };
  const label = { x: 180, y: 250, width: 72, height: 22 };
  const obstacles = [caption, zoomIn, zoomOut, label];
  const homes = {
    caption: { x: 80, y: 36 },
    zoom: { x: 764, y: 548 },
    label: { x: 210, y: 280 },
  };
  assert.equal(intersects(pinBox(homes.caption.x, homes.caption.y, 44), caption), true);
  assert.equal(intersects(pinBox(homes.zoom.x, homes.zoom.y, 44), zoomOut), true);
  assert.equal(intersects(pinBox(homes.label.x, homes.label.y, 44), label), true);
  const placed = layoutPhotoPins([
    { id: 'caption', ...homes.caption, diameter: 44 },
    { id: 'zoom', ...homes.zoom, diameter: 44 },
    { id: 'label', ...homes.label, diameter: 44 },
    { id: 'open', x: 400, y: 300, diameter: 44 },
  ], obstacles, width, height);

  assert.deepEqual(placed.get('open'), { x: 400, y: 300 });
  for (const [id, home] of Object.entries(homes)) {
    assert.notDeepEqual(placed.get(id), home, `${id} stayed on its obstacle`);
  }
  for (const id of ['caption', 'zoom', 'label', 'open']) {
    const point = placed.get(id);
    assert.ok(point, id);
    assertHitInside(point, width, height);
    const box = pinBox(point.x, point.y, 44);
    for (const obstacle of obstacles) {
      assert.equal(intersects(box, obstacle), false, `${id} overlaps an obstacle`);
    }
  }
  const boxes = [...placed.values()].map(point => pinBox(point.x, point.y, 44));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      assert.equal(intersects(boxes[i], boxes[j]), false, 'pins overlap each other');
    }
  }
});

test('a photo pin that starts offscreen stays put while the map is panned', () => {
  const placed = layoutPhotoPins(
    [{ id: 'off', x: -40, y: 80, diameter: 44 }],
    [{ x: 0, y: 0, width: 400, height: 80 }],
    800,
    600,
  );
  const off = placed.get('off');
  assert.equal(off.x, -40);
  assert.equal(off.y, 80);
});

test('nudgeBoxClear moves a label off a photo and leaves a clear label alone', () => {
  const width = 800;
  const height = 600;
  const photo = { x: 300, y: 240, width: 52, height: 68 };
  const covered = { x: 312, y: 260, width: 64, height: 18 };
  const nudge = nudgeBoxClear(covered, [photo], width, height);
  assert.ok(nudge.dx !== 0 || nudge.dy !== 0);
  const moved = { ...covered, x: covered.x + nudge.dx, y: covered.y + nudge.dy };
  assert.equal(intersects(moved, photo), false);
  assert.ok(moved.x >= 1 && moved.y >= 1);
  assert.ok(moved.x + moved.width <= width - 1 && moved.y + moved.height <= height - 1);

  const clear = { x: 40, y: 40, width: 64, height: 18 };
  assert.deepEqual(nudgeBoxClear(clear, [photo], width, height), { dx: 0, dy: 0 });
});

test('poster photos leave labels and each other, and a clear photo stays on its station', () => {
  const label = { x: 80, y: 70, width: 90, height: 20 };
  const placed = layoutPosterPhotos([
    { id: 'covered', homeX: 120, homeY: 90, r: 26 },
    { id: 'twin-a', homeX: 360, homeY: 240, r: 26 },
    { id: 'twin-b', homeX: 360, homeY: 240, r: 26 },
    { id: 'open', homeX: 40, homeY: 40, r: 26 },
  ], [label]);
  const boxOf = id => {
    const point = placed.get(id);
    return { x: point.x - 26, y: point.y - 26, width: 52, height: 52 };
  };
  assert.equal(intersects(boxOf('covered'), label), false);
  assert.equal(intersects(boxOf('twin-a'), boxOf('twin-b')), false);
  assert.deepEqual(placed.get('open'), { x: 40, y: 40 });
  for (const id of ['covered', 'twin-a', 'twin-b']) {
    assert.equal(intersects(boxOf(id), label), false, id);
  }
});
