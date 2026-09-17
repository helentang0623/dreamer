/* ============================================================
   album-layout.js —— 相册排版（album.html 与 album-editor.html 共用）
   ------------------------------------------------------------
   把一页照片算成「绝对位置」数组：
     [{ n, x, y, w, r }]
   - n        照片编号
   - x, y     左上角位置，相对“照片区(.photos)”宽 / 高的百分比
   - w        宽度，相对照片区宽度的百分比（高度按原图比例自适应）
   - r        旋转角度（度）
   算法 = 旧版 flex 分栏：分 2/3 栏 + 栏顶高低错位 + 左右对齐 + 旋转 + 按宽高比定尺寸。
   同一张照片每次算出的位置固定（种子伪随机）。
   ============================================================ */
(function (global) {
  'use strict';

  function rnd(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* 每页照片数的分栏方案（每栏几张，几套交替） */
  var COLS = {
    1: [[1]],
    2: [[1, 1]],
    3: [[2, 1], [1, 2]],
    4: [[2, 2]],
    5: [[2, 2, 1], [2, 1, 2], [1, 2, 2]]
  };
  /* 栏内照片横向对齐，交替制造错落 */
  var ALIGN = ['align-fs', 'align-fe', 'align-c'];

  function aspectOf(p) {
    if (p && typeof p.aspect === 'number') return p.aspect;
    return (global.PHOTO_ASPECT && global.PHOTO_ASPECT[p.n]) || 1;
  }

  /* ── 照片清单（manifest）──
     有序数组，每项 { n, name, date, thumb, medium, aspect }。
     存 localStorage 键 dreamer.album.photos；没有就用内置 window.PHOTOS 生成。 */
  var MANIFEST_KEY = 'dreamer.album.photos';

  function loadPhotos() {
    // 优先级：本地 localStorage 清单 → 部署文件里的 window.ALBUM_PHOTOS → 内置 window.PHOTOS
    try {
      var m = JSON.parse(localStorage.getItem(MANIFEST_KEY) || 'null');
      if (Array.isArray(m) && m.length) return m;
    } catch (e) {}
    if (Array.isArray(global.ALBUM_PHOTOS) && global.ALBUM_PHOTOS.length) return global.ALBUM_PHOTOS.slice();
    return (global.PHOTOS || []).map(function (p) {
      return {
        n: p.n, name: p.name, date: p.date,
        thumb: 'thumbs/' + p.n + '.jpg',
        medium: 'medium/' + p.n + '.jpg',
        aspect: (global.PHOTO_ASPECT && global.PHOTO_ASPECT[p.n]) || 1
      };
    });
  }

  function photoThumb(p) { return p.thumb || 'thumbs/' + p.n + '.jpg'; }
  function photoMedium(p) { return p.medium || p.thumb || 'medium/' + p.n + '.jpg'; }

  function computeLayout(list, boxW, boxH) {
    if (!list || !list.length || !boxW || !boxH) return [];

    var seed = list[0].n;

    // 单张：水平、垂直都居中
    if (list.length === 1) {
      var p0 = list[0];
      var a0 = aspectOf(p0);
      var w0 = Math.min(0.36 * boxH / a0, 0.62 * boxW);
      var h0 = w0 * a0;
      return [{
        n: p0.n,
        x: (boxW - w0) / 2 / boxW * 100,
        y: (boxH - h0) / 2 / boxH * 100,
        w: w0 / boxW * 100,
        r: (rnd(p0.n + 3000) - 0.5) * 5
      }];
    }

    var plans = COLS[list.length] || COLS[4];
    var plan = plans[seed % plans.length];
    var ncols = plan.length;

    var gapW = 0.05 * boxW;                                  // 栏间水平间距
    var colW = (boxW - gapW * (ncols - 1)) / ncols;          // 每栏宽度
    var offBase = (0.04 + rnd(seed + 71) * 0.06) * boxW;     // 栏顶高低错位

    var colTop = [];
    for (var c = 0; c < ncols; c++) {
      colTop[c] = (((c + seed) % 2 === 0) ? offBase : 0);
    }

    var out = [];
    var idx = 0;
    for (var ci = 0; ci < plan.length; ci++) {
      var count = plan[ci];
      var colLeft = ci * (colW + gapW);
      for (var k = 0; k < count && idx < list.length; k++, idx++) {
        var p = list[idx];
        var aspect = aspectOf(p);
        var th = 0.30 + rnd(p.n + 5000) * 0.08;              // 目标高度 30–38%
        var wPct = Math.max(0.26, Math.min(0.92, (th * boxH) / aspect / colW));
        var w = wPct * colW;
        var h = w * aspect;
        var align = ALIGN[(ci + k + seed) % ALIGN.length];
        var dx = align === 'align-fe' ? (colW - w)
               : align === 'align-c' ? (colW - w) / 2 : 0;
        var rot = (rnd(p.n + 3000) - 0.5) * 5;               // 旋转 ±2.5°

        out.push({
          n: p.n,
          x: (colLeft + dx) / boxW * 100,
          y: colTop[ci] / boxH * 100,
          w: w / boxW * 100,
          r: rot
        });
        colTop[ci] += h + 0.10 * colW;                        // 上下间距 = 栏宽 10%
      }
    }
    return out;
  }

  global.AlbumLayout = {
    rnd: rnd,
    computeLayout: computeLayout,
    loadPhotos: loadPhotos,
    photoThumb: photoThumb,
    photoMedium: photoMedium,
    MANIFEST_KEY: MANIFEST_KEY
  };
})(window);
