// [파이보] themakerrobot/teach-lab 74f421a lib/theme.js 에서 가져옴 (MIT). 바꾼 곳: 없음
// ═══════════════════════════════════════════════════════════
// 테마 색 읽기 — 그래프·오버레이·표 색칠에 쓴다
// ═══════════════════════════════════════════════════════════
// css/maker-ui.css 의 토큰을 그대로 따라간다. 색을 코드에 적지 않는다.
// --acc 가 var(--pen-blue) 처럼 다른 토큰을 가리킬 수 있으므로 몇 단계 따라간다.

let accCache = null;

export function accentColor() {
  if (accCache) return accCache;
  const cs = getComputedStyle(document.documentElement);
  let v = (cs.getPropertyValue('--acc') || '').trim();
  for (let i = 0; i < 4 && /^var\(/.test(v); i++) {
    const m = /^var\(\s*(--[\w-]+)/.exec(v);
    if (!m) break;
    v = (cs.getPropertyValue(m[1]) || '').trim();
  }
  accCache = v || '#1F5F7A';
  return accCache;
}

export function accentRgba(alpha) {
  const hex = accentColor();
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
}

export function warnColor() {
  return (getComputedStyle(document.documentElement).getPropertyValue('--warn') || '').trim() || '#B4451C';
}
