import { CanvasTexture, SRGBColorSpace } from 'three';
import { isRedSuit, rankLabel, SUIT_LABELS, suitOf, type Card } from './cards';

const W = 128;
const H = 180;
const faces = new Map<Card, CanvasTexture>();
let back: CanvasTexture | undefined;

function makeTexture(draw: (g: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (g) draw(g);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundedRect(g: CanvasRenderingContext2D, inset: number, radius: number) {
  g.beginPath();
  g.roundRect(inset, inset, W - 2 * inset, H - 2 * inset, radius);
}

export function cardFace(card: Card): CanvasTexture {
  let texture = faces.get(card);
  if (!texture) {
    texture = makeTexture((g) => {
      g.fillStyle = '#f7f4ec';
      roundedRect(g, 1, 12);
      g.fill();
      g.strokeStyle = '#b9b3a4';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = isRedSuit(card) ? '#c1121f' : '#16121d';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const suit = SUIT_LABELS[suitOf(card)] ?? '';
      g.font = 'bold 44px system-ui, sans-serif';
      g.fillText(rankLabel(card), 30, 34);
      g.font = '34px system-ui, sans-serif';
      g.fillText(suit, 30, 72);
      g.font = '78px system-ui, sans-serif';
      g.fillText(suit, W / 2 + 6, H / 2 + 34);
    });
    faces.set(card, texture);
  }
  return texture;
}

export function cardBack(): CanvasTexture {
  back ??= makeTexture((g) => {
    g.fillStyle = '#5a1f9a';
    roundedRect(g, 1, 12);
    g.fill();
    g.strokeStyle = '#f2c14e';
    g.lineWidth = 4;
    roundedRect(g, 10, 8);
    g.stroke();
    g.fillStyle = '#f2c14e';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '56px system-ui, sans-serif';
    g.fillText('♠', W / 2, H / 2);
  });
  return back;
}
