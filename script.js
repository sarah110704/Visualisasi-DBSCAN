function loadSampleData() {
  points = [
    makePoint(94, 92),
    makePoint(119, 81),
    makePoint(116, 114),

    makePoint(225, 190),
    makePoint(256, 182),
    makePoint(275, 193),
    makePoint(270, 218),
    makePoint(239, 208),
    makePoint(256, 202),
    makePoint(252, 225),

  
    makePoint(421, 181),
    makePoint(440, 176),
    makePoint(480, 178),
    makePoint(458, 187),

    makePoint(214, 421),
    makePoint(645, 261),
    makePoint(539, 362),
    makePoint(430, 355),
    makePoint(731, 480),
  ];
  resetAlgorithmOnly();
  setStepText(
    'Step 0',
    'Data contoh sudah dimasukkan',
    'Titik 4 sampai 10 akan membentuk cluster pertama. Titik 11 sampai 14 akan membentuk cluster kedua. Titik 1, 2, 3, 15, 16, 17, 18, dan 19 menjadi noise karena tidak memenuhi kepadatan minimal.'
  );
}