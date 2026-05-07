/* LORD OF FROGS v4.1 - app.js - version stable */
(function() {
'use strict';

/* ── Node modules ─────────────────────────────── */
var _req = function(id) {
  try { return (window.cep_node || window).require(id); } catch(e) { return null; }
};
var fs  = _req('fs');
var pth = _req('path');
var cp  = _req('child_process');
var os  = _req('os');

if (!fs || !cp) { console.error('Node modules not available'); return; }

var cs = new CSInterface();
function $(id) { return document.getElementById(id); }

/* ── Constantes ───────────────────────────────── */
var YTDLP   = 'C:\\yt-dlp\\yt-dlp.exe';
var FFMPEG  = 'C:\\yt-dlp\\ffmpeg.exe';
var FFPROBE = 'C:\\yt-dlp\\ffprobe.exe';
var COOKIES = 'C:\\yt-dlp\\cookies.txt';

/* ── Update URL - MODIFIEZ CETTE LIGNE avec votre repo GitHub ── */
// Exemple : 'https://raw.githubusercontent.com/Dpops/LordOfFrogs/main/YTDL/'
var UPDATE_BASE_URL = 'REMPLACEZ_PAR_VOTRE_URL_GITHUB';
var CURRENT_VERSION = '4.3';

/* ── Etat ─────────────────────────────────────── */
var busy       = false;
var fmt        = 'mp4';
var lastFile   = '';
var cookieFile = '';
var thumbTimer = null;

/* ── UI ───────────────────────────────────────── */
function log(msg, t) {
  try {
    var b  = $('logBox');
    var el = document.createElement('span');
    el.className   = 'l ' + (t || 'i');
    el.textContent = new Date().toLocaleTimeString('fr-FR') + ' ' + msg;
    b.appendChild(el);
    b.appendChild(document.createElement('br'));
    b.scrollTop = b.scrollHeight;
  } catch(e) {}
}

function setBar(p) {
  try {
    $('prgBar').style.width = Math.min(100, Math.max(0, p)) + '%';
    $('prgPct').textContent = Math.round(p) + '%';
  } catch(e) {}
}

function setStatus(s, d) {
  try { $('prgLbl').textContent = s || ''; $('prgDet').textContent = d || ''; } catch(e) {}
}

function showPrg(v) {
  try { $('prg').style.display = v ? 'block' : 'none'; } catch(e) {}
}

function finish(ok) {
  busy = false;
  try { $('dlBtn').disabled = false; } catch(e) {}
  stopFrogAnim(ok);
  if (!ok) setTimeout(function() { showPrg(false); }, 8000);
}

/* ── Format ───────────────────────────────────── */
window.setFmt = function(f) {
  fmt = f;
  try {
    $('tabV').className = 'tab' + (f === 'mp4' ? ' on' : '');
    $('tabA').className = 'tab' + (f === 'mp3' ? ' on' : '');
    $('qualCard').style.display = f === 'mp4' ? 'block' : 'none';
    $('url').placeholder = f === 'mp3'
      ? 'YouTube · Instagram · TikTok · Deezer · ...'
      : 'YouTube · Instagram · TikTok · ...';
  } catch(e) {}
};

/* ── Miniature YouTube ────────────────────────── */
function showThumb(url) {
  try {
    var wrap  = $('thumbWrap');
    var img   = $('thumbImg');
    var skel  = $('thumbSkel');
    var ttl   = $('thumbTitle');
    var met   = $('thumbMeta');
    var plat  = $('thumbPlatform');
    if (!wrap) return;

    // Reset
    img.style.display  = 'none';
    img.src = '';
    if (skel) skel.style.display = 'block';

    var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) {
      wrap.style.display = 'block';
      if (plat) { plat.textContent = 'YouTube'; plat.style.display = 'block'; }
      ttl.textContent = 'Chargement...';
      met.textContent = 'youtube.com';

      // Essaie hqdefault (plus grande) puis mqdefault
      var tried = 0;
      var urls = [
        'https://img.youtube.com/vi/' + yt[1] + '/hqdefault.jpg',
        'https://img.youtube.com/vi/' + yt[1] + '/mqdefault.jpg',
        'https://img.youtube.com/vi/' + yt[1] + '/default.jpg',
      ];
      function tryNext() {
        if (tried >= urls.length) {
          if (skel) skel.style.display = 'none';
          ttl.textContent = 'youtube.com/watch?v=' + yt[1];
          met.textContent = 'YouTube · Pret a telecharger';
          return;
        }
        loadThumbNode(urls[tried], function(src) {
          if (src) {
            if (skel) skel.style.display = 'none';
            img.src = src;
            img.style.display = 'block';
            ttl.textContent = 'youtube.com/watch?v=' + yt[1];
            met.textContent = 'YouTube · Pret a telecharger';
          } else {
            tried++;
            tryNext();
          }
        });
      }
      tryNext();
      return;
    }

    // Autres plateformes : affiche une card sans image
    var platInfo = {
      instagram: { name: 'Instagram', meta: 'Reel · Video', color: '#e1306c' },
      tiktok:    { name: 'TikTok',    meta: 'Video',        color: '#00e5ff' },
      deezer:    { name: 'Deezer',    meta: 'Audio · MP3',  color: '#a37fff' },
    };
    var matched = null;
    if (/instagram\.com/i.test(url))  matched = platInfo.instagram;
    if (/tiktok\.com/i.test(url))     matched = platInfo.tiktok;
    if (/deezer\.com/i.test(url))     matched = platInfo.deezer;

    if (matched) {
      wrap.style.display = 'block';
      if (skel) { skel.style.display = 'block'; skel.style.opacity = '.4'; }
      if (plat) {
        plat.textContent   = matched.name;
        plat.style.display = 'block';
        plat.style.background = matched.color + '33';
        plat.style.borderColor = matched.color + '66';
        plat.style.color = matched.color;
      }
      ttl.textContent = matched.name + ' · ' + url.substring(0, 40) + '...';
      met.textContent = matched.meta + ' · Pret a telecharger';
      return;
    }

    wrap.style.display = 'none';
  } catch(e) {}
}

function loadThumbNode(url, cb) {
  try {
    var mod    = (window.cep_node||window).require(url.startsWith('https') ? 'https' : 'http');
    var chunks = [];
    var req    = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res) {
      if (res.statusCode === 200) {
        res.on('data', function(c) { chunks.push(c); });
        res.on('end',  function() {
          var b64  = Buffer.concat(chunks).toString('base64');
          cb('data:image/jpeg;base64,' + b64);
        });
      } else { cb(null); }
    });
    req.on('error', function() { cb(null); });
    req.setTimeout(6000, function() { req.destroy(); cb(null); });
  } catch(e) { cb(null); }
}

function hideThumb() {
  try { $('thumbWrap').style.display = 'none'; } catch(e) {}
}

/* ── Cookies ──────────────────────────────────── */
function refreshCk() {
  try {
    var found = '';
    var paths = [cookieFile, COOKIES];
    for (var i = 0; i < paths.length; i++) {
      if (paths[i] && fs.existsSync(paths[i])) { found = paths[i]; break; }
    }
    cookieFile = found;
    var el = $('ckSt');
    if (found) {
      el.textContent = '● ACTIFS';
      el.className   = 'ck-ok';
    } else {
      el.textContent = '● ABSENT';
      el.className   = 'ck-no';
    }
  } catch(e) {}
}

function saveCookies(path) {
  if (!path || path.length < 4) return;
  try {
    if (!fs.existsSync(path)) { log('Fichier introuvable : ' + path, 'e'); return; }
    fs.mkdirSync('C:\\yt-dlp', { recursive: true });
    fs.copyFileSync(path, COOKIES);
    cookieFile = COOKIES;
    log('Cookies OK : ' + path, 'ok');
  } catch(e) {
    cookieFile = path;
    log('Cookies charges (direct) : ' + path, 'ok');
  }
  refreshCk();
}

/* ── Dossier ──────────────────────────────────── */
function setDest(p) {
  if (p && p.length > 2) $('dest').value = p;
}

function initDest() {
  cs.evalScript('getDownloadsFolder()', function(res) {
    res = (res || '').trim();
    if (res.length > 2) { setDest(res); return; }
    try {
      var d = pth.join(os.homedir(), 'Downloads', 'LordOfFrogs');
      fs.mkdirSync(d, { recursive: true });
      setDest(d);
    } catch(e) {}
  });
}

/* ── Events ───────────────────────────────────── */
$('pasteBtn').onclick = function() {
  navigator.clipboard.readText().then(function(t) {
    $('url').value = t.trim();
    showThumb(t.trim());
  }).catch(function() { log('Utilisez Ctrl+V', 'w'); });
};

$('url').addEventListener('input', function() {
  clearTimeout(thumbTimer);
  var v = this.value.trim();
  if (!v) { hideThumb(); return; }
  thumbTimer = setTimeout(function() { showThumb(v); }, 500);
});

$('ckBtn').onclick = function() {
  // Essai 1 : dialogue AE natif
  cs.evalScript('pickFile("*.txt")', function(res) {
    res = (res || '').replace(/[\r\n"]/g, '').trim();
    if (res.length > 4 && res.toLowerCase().indexOf('.txt') >= 0) {
      saveCookies(res); return;
    }
    // Essai 2 : PowerShell OpenFileDialog
    try {
      var ps = '[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null; ' +
               '$d = New-Object System.Windows.Forms.OpenFileDialog; ' +
               '$d.Filter = "Cookies|*.txt|Tous|*.*"; ' +
               '$d.Title = "Choisissez cookies.txt"; ' +
               'if ($d.ShowDialog() -eq "OK") { $d.FileName } else { "" }';
      var r = cp.execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 60000 })
               .toString().replace(/[\r\n]/g, '').trim();
      if (r.length > 4) { saveCookies(r); }
      else log('Aucun fichier selectionne', 'w');
    } catch(e) { log('Erreur dialogue cookies : ' + e.message, 'e'); }
  });
};

$('browseBtn').onclick = function() {
  cs.evalScript('browseFolder()', function(res) {
    res = (res || '').trim();
    if (res.length > 2) { setDest(res); log('Dossier : ' + res, 'ok'); return; }
    try {
      var ps = 'Add-Type -AssemblyName System.Windows.Forms; ' +
               '$f = New-Object System.Windows.Forms.FolderBrowserDialog; ' +
               'if ($f.ShowDialog() -eq "OK") { $f.SelectedPath } else { "" }';
      var r = cp.execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000 })
               .toString().trim();
      if (r.length > 2) { setDest(r); log('Dossier : ' + r, 'ok'); }
      else log('Tapez le chemin directement', 'w');
    } catch(e) { log('Tapez le chemin directement', 'w'); }
  });
};

$('thumbClose').onclick = hideThumb;

$('openBtn').onclick = function() {
  var d = $('dest').value.trim();
  if (d) cs.evalScript('openFolder(' + JSON.stringify(d) + ')', function() {});
};

$('importBtn').onclick = function() {
  if (!lastFile) { log('Aucun fichier', 'w'); return; }
  cs.evalScript('importFileInAE(' + JSON.stringify(lastFile.replace(/\\/g, '/')) + ')', function(r) {
    if (r === 'ok') log('Importe dans AE !', 'ok');
    else log('Erreur AE : ' + r, 'e');
  });
};

$('updBtn').onclick = function() {
  if (busy) return;
  if (UPDATE_BASE_URL) {
    updatePlugin();
  } else {
    log('Mise a jour yt-dlp...', 'i');
    try {
      var p = cp.spawn(YTDLP, ['-U']);
      p.stdout.on('data', function(d) {
        d.toString().split('\n').forEach(function(l) { if (l.trim()) log(l.trim(), 'i'); });
      });
      p.on('close', function() { log('yt-dlp a jour', 'ok'); });
    } catch(e) { log('Erreur : ' + e.message, 'e'); }
  }
};

/* ════════════════════════════════════════════════
   DOWNLOAD
════════════════════════════════════════════════ */
$('dlBtn').onclick = function() {
  if (busy) return;

  var url  = $('url').value.trim();
  var dest = $('dest').value.trim();
  var qual = $('qual').value;

  if (!url)  { log('Collez un lien !', 'e'); return; }
  if (!dest) { log('Choisissez un dossier !', 'e'); return; }
  if (!fs.existsSync(YTDLP)) { log('yt-dlp introuvable - lancez INSTALL.bat', 'e'); return; }

  try {
    fs.mkdirSync(dest, { recursive: true });
    log('Dossier cree/verifie : ' + dest, 'i');
  } catch(e) {
    log('Erreur creation dossier : ' + e.message, 'e');
    return;
  }

  busy = true;
  lastFile = '';
  $('dlBtn').disabled    = true;
  $('importBtn').disabled = true;
  try { $('importBtn').classList.remove('import-ready'); } catch(e) {}
  showPrg(true);
  setBar(0);
  setStatus('CONNEXION...', '');
  startFrogAnim();
  log('Download : ' + url);

  runAttempt(url, dest, qual, fmt, false);
};

function runAttempt(url, dest, qual, format, noFmt) {
  var ffOk = fs.existsSync(FFMPEG);
  var ck   = (cookieFile && fs.existsSync(cookieFile)) ? cookieFile
             : (fs.existsSync(COOKIES) ? COOKIES : '');
  var args = [];

  if (ffOk) args.push('--ffmpeg-location', 'C:\\yt-dlp');
  if (ck)   args.push('--cookies', ck);

  if (format === 'mp3') {
    // Audio : extrait directement, pas de fusion
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '192K');
    if (ffOk) args.push('--embed-thumbnail', '--embed-metadata');
  } else {
    if (!noFmt) {
      if (qual) {
        // H264 natif prioritaire (compatible AE sans conversion)
        // Fallback progressif jusqu'a "best" si pas dispo
        args.push('-f',
          'bestvideo[vcodec^=avc1][height<=' + qual + ']+bestaudio[acodec^=mp4a]' +
          '/bestvideo[vcodec^=avc1][height<=' + qual + ']+bestaudio' +
          '/best[vcodec^=avc1][height<=' + qual + ']' +
          '/best[height<=' + qual + ']' +
          '/best'
        );
      } else {
        args.push('-f',
          'bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]' +
          '/bestvideo[vcodec^=avc1]+bestaudio' +
          '/best[vcodec^=avc1]' +
          '/best'
        );
      }
    }
    args.push('--merge-output-format', 'mp4');
    if (ffOk) args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a copy -movflags +faststart');
  }

  // VITESSE MAXIMALE
  args.push('--concurrent-fragments', '32');    // 32 fragments en parallele
  args.push('--file-access-retries', '3');
  args.push('--extractor-retries', '3');
  args.push('--socket-timeout', '10');           // timeout court = retry rapide

  // Node.js pour YouTube PO token
  try {
    var nodePaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe'
    ];
    for (var i = 0; i < nodePaths.length; i++) {
      if (fs.existsSync(nodePaths[i])) {
        args.push('--js-runtimes', 'node:' + nodePaths[i]);
        break;
      }
    }
    if (args.indexOf('--js-runtimes') < 0) {
      var nr = cp.execSync('where node.exe', { timeout: 2000 }).toString().trim().split('\n')[0].trim();
      if (nr) args.push('--js-runtimes', 'node:' + nr);
    }
  } catch(e) {}

  args.push('--no-playlist', '--newline');
  // Template simple - evite les problemes de chemin avec caracteres speciaux
  var outTemplate = pth.join(dest, '%(title).60B.%(ext)s');
  args.push('-o', outTemplate);
  args.push(url);

  log('Dest : ' + dest, 'i');
  log((noFmt ? '[2] sans filtre' : '[1] standard') + ' | ' + (ck ? 'cookies OK' : 'sans cookies'), 'i');

  var captured = '';
  var proc;
  try { proc = cp.spawn(YTDLP, args, { cwd: dest }); }
  catch(e) { log('Erreur spawn : ' + e.message, 'e'); finish(false); return; }

  proc.stdout.on('data', function(chunk) {
    chunk.toString().split('\n').forEach(function(line) {
      line = line.trim();
      if (!line) return;
      var pm = line.match(/(\d+\.?\d*)\s*%/);
      if (pm) {
        setBar(parseFloat(pm[1]));
        var sp = line.match(/at ([\S]+\/s)/i);
        var et = line.match(/ETA ([\d:]+)/i);
        setStatus('DOWNLOADING ' + Math.round(pm[1]) + '%',
          (sp ? sp[1] : '') + (et ? '  ETA ' + et[1] : ''));
      }
      var dm = line.match(/Destination: (.+)$/i)  ||
               line.match(/Merging formats into "(.+?)"/i) ||
               line.match(/\[ExtractAudio\] Destination: (.+)$/i);
      if (dm) {
        var c = dm[1].trim().replace(/^"|"$/g, '');
        if (!/\.f\d{2,4}\.(mp4|m4a|webm)$/i.test(c)) captured = c;
      }
    });
  });

  proc.stderr.on('data', function(chunk) {
    chunk.toString().split('\n').forEach(function(line) {
      line = line.trim();
      if (line && line.indexOf('WARNING') < 0 && line.indexOf('ERROR') >= 0) log(line, 'e');
    });
  });

  proc.on('close', function(code) {
    if (code !== 0) {
      if (!noFmt) {
        log('Echec, 2e tentative sans filtre...', 'w');
        setBar(0);
        runAttempt(url, dest, qual, format, true);
      } else {
        log('Echec code ' + code, 'e');
        if (!ck) log('>> Chargez un cookies.txt pour YouTube <<', 'w');
        finish(false);
      }
      return;
    }

    setBar(95); setStatus('FINALISATION...', '');
    setTimeout(function() {
      // Log du dossier pour debug
      log('Dossier : ' + dest, 'i');
      try {
        var files = fs.readdirSync(dest);
        log('Fichiers dans dossier : ' + files.length, 'i');
        files.slice(0,5).forEach(function(f) { log('  > ' + f, 'i'); });
      } catch(e) { log('Erreur lecture dossier : ' + e.message, 'e'); }

      if (!captured || !fs.existsSync(captured)) {
        // Cherche dans dest ET dans les sous-dossiers courants
        var exts = format === 'mp3' ? ['.mp3'] : ['.mp4', '.mkv', '.webm'];
        captured = findNewest(dest, exts);
        // Si toujours pas trouvé, cherche dans le dossier de travail
        if (!captured) {
          captured = findNewest(pth.join(dest, '..'), exts);
          if (captured) log('Fichier trouve dans dossier parent !', 'w');
        }
      }
      if (!captured) { log('Fichier introuvable dans ' + dest, 'e'); finish(false); return; }
      log('Fichier : ' + captured, 'ok');

      if (format === 'mp3') {
        lastFile = captured;
        setBar(100); setStatus('MP3 READY !', '');
        enableImport();
        finish(true);
      } else {
        fixCodec(captured, dest, function(final) {
          lastFile = final;
          setBar(100); setStatus('READY !', '');
          enableImport();
          finish(true);
        });
      }
    }, 3000);
  });

  proc.on('error', function(e) {
    log('Crash : ' + e.message, 'e');
    finish(false);
  });
}

/* ── Import button glow ──────────────────────── */
function enableImport() {
  try {
    var btn = $('importBtn');
    btn.disabled = false;
    btn.classList.add('import-ready');
    log('>>> Cliquez IMPORT AE <<<', 'ok');
    // Petit son visuel : clignote 3x
    var count = 0;
    var blink = setInterval(function() {
      btn.style.opacity = (count % 2 === 0) ? '0.4' : '1';
      count++;
      if (count >= 6) {
        clearInterval(blink);
        btn.style.opacity = '1';
      }
    }, 200);
  } catch(e) {}
}

/* ── findNewest ───────────────────────────────── */
function findNewest(dir, exts) {
  try {
    var files = fs.readdirSync(dir).filter(function(f) {
      var fl = f.toLowerCase();
      if (/\.f\d{2,4}\.(mp4|m4a|webm|mkv)$/.test(fl)) return false;
      if (fl.indexOf('.temp.') >= 0 || fl.slice(-5) === '.part') return false;
      return exts.some(function(e) { return fl.slice(-e.length) === e; });
    }).map(function(f) {
      return { f: f, t: fs.statSync(pth.join(dir, f)).mtimeMs };
    }).sort(function(a, b) { return b.t - a.t; });
    return files.length ? pth.join(dir, files[0].f) : '';
  } catch(e) { return ''; }
}

/* ── fixCodec : verifie d'abord si compatible AE, convertit seulement si besoin ── */
function fixCodec(input, dir, cb) {
  if (!fs.existsSync(FFMPEG)) { log('ffmpeg absent', 'w'); cb(input); return; }

  // Analyse rapide du fichier avec ffprobe
  if (fs.existsSync(FFPROBE)) {
    try {
      var info = cp.execSync(
        '"' + FFPROBE + '" -v error -select_streams v:0' +
        ' -show_entries stream=codec_name,pix_fmt,profile' +
        ' -of default=noprint_wrappers=1 "' + input + '"',
        { timeout: 6000 }
      ).toString().toLowerCase();

      var isH264   = info.indexOf('codec_name=h264') >= 0 || info.indexOf('codec_name=avc') >= 0;
      var isYuv420 = info.indexOf('pix_fmt=yuv420p') >= 0;
      var profile  = '';
      var pm = info.match(/profile=([^\n]+)/);
      if (pm) profile = pm[1].trim();
      var isBaseline = profile.indexOf('baseline') >= 0 || profile.indexOf('constrained') >= 0;

      log('Codec: ' + (isH264?'H264':'autre') + ' | pix: ' + (isYuv420?'yuv420p':'autre') + ' | profil: ' + (profile||'?'), 'i');

      // Si H264 + yuv420p + baseline/constrained = 100% compatible AE, pas de conversion
      if (isH264 && isYuv420 && isBaseline) {
        log('Deja compatible AE - import direct !', 'ok');
        cb(input); return;
      }

      // Si H264 + yuv420p mais profil Main/High : remux rapide sans reencoder la video
      if (isH264 && isYuv420) {
        log('H264 yuv420p detecte - remux rapide...', 'i');
        var outR = pth.join(dir, pth.basename(input, pth.extname(input)) + '_AE.mp4');
        var rArgs = [
          '-i', input,
          '-c:v', 'copy',      // copie la video sans reencoder = instantane
          '-c:a', 'aac',
          '-ar', '48000',
          '-b:a', '192k',
          '-profile:v', 'baseline',
          '-level:v', '3.1',
          '-movflags', '+faststart',
          '-y', outR
        ];
        var rProc = cp.spawn(FFMPEG, rArgs);
        rProc.on('close', function(code) {
          if (code === 0 && fs.existsSync(outR)) {
            try { fs.unlinkSync(input); } catch(e) {}
            log('Remux OK - compatible AE', 'ok');
            cb(outR);
          } else {
            log('Remux echoue - reencoder...', 'w');
            reencodeForAE(input, dir, cb);
          }
        });
        rProc.on('error', function() { reencodeForAE(input, dir, cb); });
        return;
      }
    } catch(e) {
      log('ffprobe erreur : ' + e.message + ' - reencoder', 'w');
    }
  }

  // Sinon : reencode complet
  reencodeForAE(input, dir, cb);
}

function reencodeForAE(input, dir, cb) {
  var out = pth.join(dir, pth.basename(input, pth.extname(input)) + '_AE.mp4');
  log('Reencodage H264 baseline...', 'w');
  setStatus('CONVERSION...', 'H264 baseline pour AE');

  var args = [
    '-i', input,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-profile:v', 'baseline',
    '-level:v', '3.1',
    '-crf', '20',
    '-x264opts', 'bframes=0:no-cabac:ref=1',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-ar', '48000',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-y', out
  ];

  var proc = cp.spawn(FFMPEG, args);
  proc.stderr.on('data', function(d) {
    var m = d.toString().match(/time=(\d+:\d+:\d+)/);
    if (m) setStatus('CONVERSION ' + m[1], '');
  });
  proc.on('close', function(code) {
    if (code === 0 && fs.existsSync(out) && fs.statSync(out).size > 1000) {
      try { fs.unlinkSync(input); } catch(e) {}
      log('Reencodage OK', 'ok');
      cb(out);
    } else {
      log('Reencodage echoue - import direct', 'w');
      cb(input);
    }
  });
  proc.on('error', function(e) { log('ffmpeg : ' + e.message, 'e'); cb(input); });
}

/* ── Init ─────────────────────────────────────── */
function init() {
  if (fs.existsSync(YTDLP)) {
    log('yt-dlp OK', 'ok');
    if (fs.existsSync(FFMPEG)) log('ffmpeg OK', 'ok');
    if (fs.existsSync('C:\\yt-dlp\\aria2c.exe')) log('aria2c OK (multi-thread)', 'ok');
    refreshCk();
    initDest();
  } else {
    log('yt-dlp introuvable - lancez INSTALL.bat', 'e');
    $('warn').style.display = 'block';
    $('dlBtn').disabled = true;
    $('dlBtn').textContent = 'LANCEZ INSTALL.bat';
  }
}

init();
// Verification update au demarrage (silencieux si pas de connexion)
setTimeout(checkForUpdate, 3000);

})(); // IIFE - isole tout le code

/* ── ANIMATIONS GRENOUILLE ─────────────────────── */
var frogMsgTimer = null;
var frogMessages = [
  'DOWNLOADING...',
  'LA GRENOUILLE TRAVAILLE...',
  'CAPTURE EN COURS...',
  'LE COUTEAU EST PRET...',
  'PATIENCE PETIT PADAWAN...',
  'RIBBIT RIBBIT...',
  'ALMOST THERE...',
  'LA GRENOUILLE COURT...',
  'TELECHARGEMENT EN COURS...',
  'NE PAS QUITTER...',
];

function startFrogAnim() {
  try {
    var wrap = $('frogAnim');
    if (!wrap) return;
    wrap.style.display = 'flex';
    var msgEl = $('frogMsg');
    var idx   = 0;
    frogMsgTimer = setInterval(function() {
      idx = (idx + 1) % frogMessages.length;
      if (msgEl) msgEl.textContent = frogMessages[idx];
    }, 2000);
  } catch(e) {}
}

function stopFrogAnim(success) {
  try {
    clearInterval(frogMsgTimer);
    var wrap  = $('frogAnim');
    var msgEl = $('frogMsg');
    if (!wrap) return;
    if (success) {
      if (msgEl) msgEl.textContent = 'LA GRENOUILLE A CAPTURE LA VIDEO ! 🎉';
      setTimeout(function() {
        try { wrap.style.display = 'none'; } catch(e) {}
      }, 3000);
    } else {
      if (msgEl) msgEl.textContent = 'LA GRENOUILLE A RATE... 😔';
      setTimeout(function() {
        try { wrap.style.display = 'none'; } catch(e) {}
      }, 3000);
    }
  } catch(e) {}
}

/* ════════════════════════════════════════════════
   SYSTEME DE MISE A JOUR DU PLUGIN
   
   Pour activer :
   1. Créez un repo GitHub public
   2. Pushez le dossier YTDL dedans
   3. Modifiez UPDATE_BASE_URL en haut de ce fichier
      ex: 'https://raw.githubusercontent.com/MonUser/LordOfFrogs/main/YTDL/'
   4. Pour publier une update :
      - Modifiez les fichiers
      - Changez "version" dans version.json
      - Pushez sur GitHub
      - Les utilisateurs cliquent "Update Plugin" et c'est fait
════════════════════════════════════════════════ */

function checkForUpdate() {
  if (!UPDATE_BASE_URL) {
    log('Updates: configurez UPDATE_BASE_URL dans app.js', 'i');
    return;
  }
  var https  = (window.cep_node||window).require('https');
  var http   = (window.cep_node||window).require('http');
  var vUrl   = UPDATE_BASE_URL + 'version.json?t=' + Date.now();
  var mod    = vUrl.startsWith('https') ? https : http;

  log('Verification mise a jour...', 'i');

  var chunks = [];
  var req = mod.get(vUrl, { headers: { 'User-Agent': 'LordOfFrogs/' + CURRENT_VERSION } }, function(res) {
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
      try {
        var data    = JSON.parse(Buffer.concat(chunks).toString());
        var remote  = data.version || '0';
        if (compareVersions(remote, CURRENT_VERSION) > 0) {
          log('Nouvelle version disponible : v' + remote + ' (actuelle: v' + CURRENT_VERSION + ')', 'ok');
          log('Cliquez UPDATE pour mettre a jour', 'ok');
          try {
            var btn = $('updBtn');
            if (btn) {
              btn.style.borderColor = 'var(--green)';
              btn.style.color       = 'var(--green)';
              btn.title             = 'Mise a jour v' + remote + ' disponible !';
            }
          } catch(e) {}
        } else {
          log('Plugin a jour (v' + CURRENT_VERSION + ')', 'ok');
        }
      } catch(e) {
        log('Verification update echouee', 'i');
      }
    });
  });
  req.on('error', function() { /* silencieux si pas de connexion */ });
  req.setTimeout(5000, function() { req.destroy(); });
}

function updatePlugin() {
  if (!UPDATE_BASE_URL) {
    log('UPDATE_BASE_URL non configure dans js/app.js', 'e');
    log('Lisez les instructions en bas de app.js', 'w');
    return;
  }
  if (busy) return;

  log('=== Mise a jour du plugin ===', 'ok');

  // Trouve le dossier d'installation du plugin
  var pluginDir = '';
  try {
    // Le fichier courant est dans le dossier js/ du plugin
    var thisFile = __filename || '';
    if (thisFile) {
      pluginDir = pth.dirname(pth.dirname(thisFile)); // remonte de js/ vers la racine
    }
  } catch(e) {}

  if (!pluginDir || !fs.existsSync(pluginDir)) {
    // Fallback : cherche dans CEP extensions
    var cepBase = pth.join(
      process.env.APPDATA || pth.join(os.homedir(), 'AppData', 'Roaming'),
      'Adobe', 'CEP', 'extensions', 'YTDL'
    );
    if (fs.existsSync(cepBase)) pluginDir = cepBase;
  }

  if (!pluginDir || !fs.existsSync(pluginDir)) {
    log('Dossier plugin introuvable : ' + pluginDir, 'e');
    return;
  }

  log('Dossier plugin : ' + pluginDir, 'i');

  // Charge version.json distant pour avoir la liste des fichiers
  var https  = (window.cep_node||window).require('https');
  var http   = (window.cep_node||window).require('http');
  var vUrl   = UPDATE_BASE_URL + 'version.json?t=' + Date.now();
  var mod    = vUrl.startsWith('https') ? https : http;

  var chunks = [];
  mod.get(vUrl, { headers: { 'User-Agent': 'LordOfFrogs/' + CURRENT_VERSION } }, function(res) {
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
      try {
        var data  = JSON.parse(Buffer.concat(chunks).toString());
        var files = data.files || ['js/app.js', 'index.html'];
        var remote = data.version || '?';
        log('Telechargement v' + remote + '... (' + files.length + ' fichiers)', 'i');
        downloadFiles(files, 0, pluginDir, function(ok, count) {
          if (ok) {
            log('=== MISE A JOUR v' + remote + ' TERMINEE ! ===', 'ok');
            log('Rechargez le plugin : Fenetre > Extensions > Lord of Frogs', 'ok');
          } else {
            log('Mise a jour partielle (' + count + '/' + files.length + ' fichiers)', 'w');
          }
        });
      } catch(e) {
        log('Erreur parsing version.json : ' + e.message, 'e');
      }
    });
  }).on('error', function(e) {
    log('Connexion impossible : ' + e.message, 'e');
  });
}

function downloadFiles(files, idx, pluginDir, onDone) {
  if (idx >= files.length) {
    onDone(true, files.length);
    return;
  }
  var filePath  = files[idx];
  var fileUrl   = UPDATE_BASE_URL + filePath + '?t=' + Date.now();
  var localPath = pth.join(pluginDir, filePath.replace(/\//g, pth.sep));

  log('Mise a jour : ' + filePath, 'i');

  // Cree le dossier si besoin
  try { fs.mkdirSync(pth.dirname(localPath), { recursive: true }); } catch(e) {}

  var https  = (window.cep_node||window).require('https');
  var http   = (window.cep_node||window).require('http');
  var mod    = fileUrl.startsWith('https') ? https : http;
  var chunks = [];

  mod.get(fileUrl, { headers: { 'User-Agent': 'LordOfFrogs/' + CURRENT_VERSION } }, function(res) {
    if (res.statusCode === 200) {
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        try {
          fs.writeFileSync(localPath, Buffer.concat(chunks));
          log('OK : ' + filePath, 'ok');
        } catch(e) {
          log('Erreur ecriture ' + filePath + ' : ' + e.message, 'e');
        }
        downloadFiles(files, idx + 1, pluginDir, onDone);
      });
    } else {
      log('HTTP ' + res.statusCode + ' pour ' + filePath, 'w');
      downloadFiles(files, idx + 1, pluginDir, onDone);
    }
  }).on('error', function(e) {
    log('Erreur ' + filePath + ' : ' + e.message, 'e');
    downloadFiles(files, idx + 1, pluginDir, onDone);
  });
}

function compareVersions(a, b) {
  var pa = String(a).split('.').map(Number);
  var pb = String(b).split('.').map(Number);
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    var na = pa[i] || 0, nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
