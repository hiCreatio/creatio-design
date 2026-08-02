// Figma → repo image exporter. Chạy trong GitHub Actions (mạng mở).
// Đọc figma-manifest.json, gọi Figma REST API, tải render về đúng path trong repo.
// Yêu cầu: env FIGMA_TOKEN (personal access token, chỉ cần quyền File content: read).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TOKEN = process.env.FIGMA_TOKEN;
if (!TOKEN) { console.error('Missing FIGMA_TOKEN'); process.exit(1); }

const manifest = JSON.parse(readFileSync('figma-manifest.json', 'utf8'));
const scale = manifest.scale ?? 2;
const format = manifest.format ?? 'png';
const H = { 'X-Figma-Token': TOKEN };

async function api(path) {
  const r = await fetch(`https://api.figma.com${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function download(url, out) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${out} -> HTTP ${r.status}`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log(`saved ${out}`);
}

async function renderNodes(fileKey, idToOut) {
  const ids = Object.keys(idToOut);
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const q = encodeURIComponent(batch.join(','));
    const data = await api(`/v1/images/${fileKey}?ids=${q}&format=${format}&scale=${scale}`);
    if (data.err) throw new Error(`images API err: ${data.err}`);
    for (const [id, url] of Object.entries(data.images)) {
      if (!url) { console.warn(`no render for ${id}, skipped`); continue; }
      await download(url, idToOut[id]);
    }
  }
}

function safe(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'frame';
}

for (const a of manifest.assets) {
  try {
    if (a.nodeId && a.out) {
      await renderNodes(a.fileKey, { [a.nodeId.replace('-', ':')]: a.out });
    } else if (a.allFramesOfPage && a.outDir) {
      // Liệt kê frame con trực tiếp của page rồi render tất cả
      const pageId = a.allFramesOfPage.replace('-', ':');
      const doc = await api(`/v1/files/${a.fileKey}/nodes?ids=${encodeURIComponent(pageId)}&depth=1`);
      const page = doc.nodes[pageId]?.document;
      if (!page) { console.warn(`page ${pageId} not found in ${a.fileKey}`); continue; }
      const frames = (page.children || []).filter(c => ['FRAME', 'COMPONENT', 'SECTION'].includes(c.type));
      if (!frames.length) { console.warn(`page ${pageId}: no frames`); continue; }
      const map = {};
      for (const f of frames) map[f.id] = `${a.outDir}/${safe(f.name)}.${format}`;
      await renderNodes(a.fileKey, map);
    } else {
      console.warn(`manifest entry thiếu nodeId+out hoặc allFramesOfPage+outDir: ${a.name || '?'}`);
    }
  } catch (e) {
    console.error(`FAILED: ${a.name || a.fileKey}: ${e.message}`);
    process.exitCode = 1;
  }
}
