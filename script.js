const canvas = document.getElementById('clusterCanvas');
const ctx = canvas.getContext('2d');

const epsSlider = document.getElementById('epsSlider');
const epsValue = document.getElementById('epsValue');
const minPtsValue = document.getElementById('minPtsValue');
const sampleBtn = document.getElementById('sampleBtn');
const stepBtn = document.getElementById('stepBtn');
const autoBtn = document.getElementById('autoBtn');
const resetBtn = document.getElementById('resetBtn');

const visitedCountEl = document.getElementById('visitedCount');
const clusterCountEl = document.getElementById('clusterCount');
const noiseCountEl = document.getElementById('noiseCount');
const runStatusEl = document.getElementById('runStatus');
const stepNumberEl = document.getElementById('stepNumber');
const stepTitleEl = document.getElementById('stepTitle');
const stepTextEl = document.getElementById('stepText');

const minPts = 4;
const clusterColors = ['#5169e8', '#17a88b', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899'];
let eps = Number(epsSlider.value);
let points = [];
let currentPoint = null;
let currentNeighbors = [];
let currentCluster = 0;
let expansionQueue = [];
let autoTimer = null;
let stepCounter = 0;
let finished = false;
let started = false;
let lockedForCustomClick = false;

function makePoint(x, y) {
  return {
    x,
    y,
    visited: false,
    cluster: 0,
    noise: false,
    core: false,
    border: false,
    highlighted: false,
  };
}

function loadSampleData() {
  points = [
    makePoint(170, 145), makePoint(205, 158), makePoint(224, 116), makePoint(248, 169),
    makePoint(188, 205), makePoint(264, 220), makePoint(230, 250), makePoint(142, 235),

    makePoint(520, 145), makePoint(555, 175), makePoint(590, 135), makePoint(628, 178),
    makePoint(580, 228), makePoint(535, 242), makePoint(655, 245), makePoint(614, 285),

    makePoint(395, 370), makePoint(435, 388), makePoint(462, 348), makePoint(500, 395),
    makePoint(425, 435), makePoint(538, 438), makePoint(475, 462),

    makePoint(80, 410), makePoint(720, 75), makePoint(738, 410)
  ];
  resetAlgorithmOnly();
  setStepText(
    'Step 0',
    'Data contoh sudah dimasukkan',
    'Titik-titik pada grafik adalah data mentah. DBSCAN akan mencari area yang padat, lalu mengubahnya menjadi cluster. Titik yang jauh dari kelompok akan menjadi noise.'
  );
}

function resetAlgorithmOnly() {
  stopAuto();
  points.forEach(p => {
    p.visited = false;
    p.cluster = 0;
    p.noise = false;
    p.core = false;
    p.border = false;
    p.highlighted = false;
  });
  currentPoint = null;
  currentNeighbors = [];
  currentCluster = 0;
  expansionQueue = [];
  stepCounter = 0;
  finished = false;
  started = false;
  lockedForCustomClick = false;
  updateStats('Siap');
  draw();
}

function fullReset() {
  resetAlgorithmOnly();
  setStepText(
    'Step 0',
    'Mulai dari data titik',
    'Klik Data contoh, lalu tekan Step berikutnya. Algoritma akan memilih satu titik, mencari tetangganya, lalu menentukan apakah titik itu masuk cluster atau noise.'
  );
}

function setStepText(number, title, text) {
  stepNumberEl.textContent = number;
  stepTitleEl.textContent = title;
  stepTextEl.textContent = text;
}

function updateStats(status) {
  const visited = points.filter(p => p.visited).length;
  const noise = points.filter(p => p.noise).length;
  visitedCountEl.textContent = visited;
  clusterCountEl.textContent = currentCluster;
  noiseCountEl.textContent = noise;
  runStatusEl.textContent = status;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function regionQuery(point) {
  return points.filter(other => distance(point, other) <= eps);
}

function assignCluster(point, clusterId, isCore = false) {
  point.cluster = clusterId;
  point.noise = false;
  if (isCore) point.core = true;
  if (!isCore && !point.core) point.border = true;
}

function findNextUnvisited() {
  return points.find(p => !p.visited);
}

function stepAlgorithm() {
  if (points.length < minPts) {
    setStepText(
      'Belum bisa mulai',
      'Data masih kurang',
      `Tambahkan minimal ${minPts} titik atau klik Data contoh. DBSCAN membutuhkan beberapa titik agar bisa membedakan area padat dan noise.`
    );
    updateStats('Data kurang');
    draw();
    return;
  }

  if (finished) {
    setStepText(
      `Step ${stepCounter}`,
      'Proses selesai',
      'Semua titik sudah diperiksa. Titik berwarna adalah cluster, sedangkan titik merah adalah noise.'
    );
    updateStats('Selesai');
    stopAuto();
    draw();
    return;
  }

  started = true;
  lockedForCustomClick = true;
  stepCounter++;
  points.forEach(p => p.highlighted = false);

  if (expansionQueue.length > 0) {
    const next = expansionQueue.shift();
    currentPoint = next;
    next.highlighted = true;

    if (!next.visited) {
      next.visited = true;
      currentNeighbors = regionQuery(next);

      if (currentNeighbors.length >= minPts) {
        next.core = true;
        currentNeighbors.forEach(n => {
          if (!expansionQueue.includes(n) && !n.visited) {
            expansionQueue.push(n);
          }
        });
        assignCluster(next, currentCluster, true);
        setStepText(
          `Step ${stepCounter}`,
          'Tetangga diperluas',
          `Titik ini punya ${currentNeighbors.length} titik dalam radius eps, jadi menjadi core point. Tetangganya akan ikut dicek agar cluster bisa melebar.`
        );
      } else {
        assignCluster(next, currentCluster, false);
        setStepText(
          `Step ${stepCounter}`,
          'Titik pinggir cluster',
          `Titik ini hanya punya ${currentNeighbors.length} titik dalam radius. Jumlahnya tidak cukup untuk menjadi core point, tetapi tetap masuk cluster karena dekat dengan core point sebelumnya.`
        );
      }
    } else if (next.cluster === 0 || next.noise) {
      assignCluster(next, currentCluster, false);
      currentNeighbors = regionQuery(next);
      setStepText(
        `Step ${stepCounter}`,
        'Noise bisa berubah menjadi cluster',
        'Titik yang sebelumnya dianggap noise bisa masuk cluster jika ternyata berada dekat dengan core point yang ditemukan belakangan.'
      );
    } else {
      currentNeighbors = regionQuery(next);
      setStepText(
        `Step ${stepCounter}`,
        'Titik sudah masuk cluster',
        'Titik ini sudah diperiksa sebelumnya, jadi algoritma lanjut ke titik berikutnya dalam antrean.'
      );
    }

    updateStats('Berjalan');
    draw();
    return;
  }

  const point = findNextUnvisited();
  if (!point) {
    finished = true;
    currentPoint = null;
    currentNeighbors = [];
    setStepText(
      `Step ${stepCounter}`,
      'Semua titik selesai dicek',
      'DBSCAN selesai. Cluster terbentuk dari kumpulan titik yang saling berdekatan. Titik merah adalah noise karena tidak berada di area padat.'
    );
    updateStats('Selesai');
    stopAuto();
    draw();
    return;
  }

  point.visited = true;
  point.highlighted = true;
  currentPoint = point;
  currentNeighbors = regionQuery(point);

  if (currentNeighbors.length < minPts) {
    point.noise = true;
    point.cluster = 0;
    setStepText(
      `Step ${stepCounter}`,
      'Titik dianggap noise sementara',
      `Di dalam radius eps hanya ada ${currentNeighbors.length} titik. Karena kurang dari MinPts ${minPts}, titik ini belum cukup padat dan ditandai sebagai noise.`
    );
  } else {
    currentCluster++;
    point.core = true;
    assignCluster(point, currentCluster, true);
    expansionQueue = currentNeighbors.filter(n => n !== point);
    setStepText(
      `Step ${stepCounter}`,
      'Cluster baru ditemukan',
      `Titik ini punya ${currentNeighbors.length} titik dalam radius eps. Karena memenuhi MinPts, DBSCAN membuat cluster baru dan mulai memperluasnya ke tetangga terdekat.`
    );
  }

  updateStats('Berjalan');
  draw();
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fbfcff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#e7edf8';
  ctx.lineWidth = 1;
  for (let x = 40; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 40; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawConnectionLines() {
  if (!currentPoint || currentNeighbors.length === 0) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(81, 105, 232, 0.25)';
  ctx.lineWidth = 2;
  currentNeighbors.forEach(n => {
    if (n === currentPoint) return;
    ctx.beginPath();
    ctx.moveTo(currentPoint.x, currentPoint.y);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawRadius() {
  if (!currentPoint) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(currentPoint.x, currentPoint.y, eps, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(81, 105, 232, 0.09)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(81, 105, 232, 0.6)';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function pointColor(point) {
  if (point.noise) return '#ef4444';
  if (point.cluster > 0) return clusterColors[(point.cluster - 1) % clusterColors.length];
  return '#9ca3af';
}

function drawPoints() {
  points.forEach((p, index) => {
    const color = pointColor(p);
    const radius = p.core ? 9 : p.border ? 8 : 7;

    if (p.highlighted) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(81, 105, 232, 0.16)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (p.core) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#172033';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(index + 1, p.x, p.y - 15);
  });
}

function draw() {
  drawGrid();
  drawRadius();
  drawConnectionLines();
  drawPoints();

  if (points.length === 0) {
    ctx.fillStyle = '#6b7588';
    ctx.textAlign = 'center';
    ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('Klik Data contoh untuk mulai', canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = '500 15px Inter, sans-serif';
    ctx.fillText('atau klik area grafik untuk menambahkan titik sendiri', canvas.width / 2, canvas.height / 2 + 22);
  }
}

function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
  autoBtn.textContent = 'Jalankan otomatis';
}

function toggleAuto() {
  if (autoTimer) {
    stopAuto();
    updateStats(finished ? 'Selesai' : 'Pause');
    return;
  }
  autoBtn.textContent = 'Pause';
  updateStats('Berjalan');
  autoTimer = setInterval(stepAlgorithm, 700);
}

function getCanvasPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('click', event => {
  if (started || lockedForCustomClick) {
    setStepText(
      `Step ${stepCounter}`,
      'Reset dulu untuk menambah titik',
      'Agar hasil cluster tidak berubah di tengah proses, titik baru hanya bisa ditambahkan sebelum algoritma dijalankan.'
    );
    return;
  }
  const pos = getCanvasPosition(event);
  points.push(makePoint(pos.x, pos.y));
  updateStats('Siap');
  draw();
});

epsSlider.addEventListener('input', () => {
  eps = Number(epsSlider.value);
  epsValue.textContent = eps;
  if (!started) {
    draw();
  } else {
    setStepText(
      `Step ${stepCounter}`,
      'Radius diubah',
      'Perubahan radius akan terlihat lebih aman jika proses di-reset dulu, karena cluster sebelumnya dihitung memakai radius lama.'
    );
    draw();
  }
});

sampleBtn.addEventListener('click', loadSampleData);
stepBtn.addEventListener('click', stepAlgorithm);
autoBtn.addEventListener('click', toggleAuto);
resetBtn.addEventListener('click', fullReset);

minPtsValue.textContent = minPts;
fullReset();
