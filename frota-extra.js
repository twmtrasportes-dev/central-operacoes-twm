// frota-extra.js — carregado após o index.html principal
// Sem risco de corrupção de encoding

var FROTA_CSV    = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQx62CxMqSchj3wdG83U48YiyM8eH9vIj8Jv7Gg1QVWm0Ow7abDlyYWtAEecM4iCPWTvH8e5Y84jJdf/pub?gid=644783428&single=true&output=csv';
var CADASTRO_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHjj72eJQbkeKW_C3MwlzwyveZV2rtmR5DcZe-dtryC7Q5ou7sIaHZFweljrkCWhbOlzrKiHiFh-RR/pub?gid=1576597391&single=true&output=csv';

var COL = {STATUS:0,MATERIAL:1,CLIENTE:2,PEDIDO:3,QT:4,ROTA:5,TRANSP:6,CAVALO:7,CARRETA1:8,CARRETA2:9,EIXOS:10,MOTORISTA:11,CNH:12,CARREG:13,AGEND:14,SM:15,PEDIDO_COMPRA:16};

var SCFG = {
  'EM VIAGEM':       {cor:'#7C3AED',bg:'rgba(124,58,237,.18)',grad:'#7C3AED,#A855F7',lbl:'Viagem'},
  'DESCARREGANDO':   {cor:'#D97706',bg:'rgba(217,119,6,.18)',  grad:'#D97706,#F59E0B',lbl:'Descarg.'},
  'RETORNO GARAGEM': {cor:'#059669',bg:'rgba(5,150,105,.18)',  grad:'#059669,#10B981',lbl:'Retorno'},
  'NA GARAGEM':      {cor:'#6B7280',bg:'rgba(107,114,128,.15)',grad:'#4B5563,#6B7280',lbl:'Garagem'}
};

var _frotaDados = [];
var _frotaVlist = [];
var _frotaVmap  = {};
var _frotaPage  = 0;
var POR_PAG     = 8;
var _ultimoCSV  = '';
var _frotaNumMap = {};

function normStatus(s) {
  var v = (s || '').toUpperCase().trim();
  if (v.indexOf('VIAGEM')  >= 0) return 'EM VIAGEM';
  if (v.indexOf('DESCARG') >= 0) return 'DESCARREGANDO';
  if (v.indexOf('RETORNO') >= 0) return 'RETORNO GARAGEM';
  return 'NA GARAGEM';
}

function icoFrota(st, cor, sz) {
  sz = sz || 20;
  if (st === 'EM VIAGEM')
    return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 32 32" fill="none"><rect x="12" y="8" width="18" height="13" rx="2" fill="'+cor+'" opacity=".9"/><rect x="2" y="13" width="12" height="8" rx="2" fill="'+cor+'"/><rect x="4" y="15" width="5" height="4" rx="1" fill="white" opacity=".5"/><circle cx="8" cy="23" r="3" fill="#1a1a2e"/><circle cx="8" cy="23" r="1.4" fill="#9CA3AF"/><circle cx="20" cy="23" r="3" fill="#1a1a2e"/><circle cx="20" cy="23" r="1.4" fill="#9CA3AF"/><circle cx="27" cy="23" r="3" fill="#1a1a2e"/><circle cx="27" cy="23" r="1.4" fill="#9CA3AF"/></svg>';
  if (st === 'DESCARREGANDO')
    return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 32 32" fill="none"><rect x="5" y="9" width="22" height="15" rx="2" fill="'+cor+'" opacity=".85"/><rect x="3" y="6" width="26" height="5" rx="2" fill="'+cor+'"/><path d="M16 19 L12.5 24 L19.5 24 Z" fill="white" opacity=".8"/><rect x="14.5" y="15" width="2.5" height="6" rx="1" fill="white" opacity=".8"/></svg>';
  if (st === 'RETORNO GARAGEM')
    return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 32 32" fill="none"><path d="M26 7 C29 11 29 20 22 24 C15 28 6 24 4 18" stroke="'+cor+'" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M22 4 L26 8 L22 12" stroke="'+cor+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="3" y="14" width="8" height="6" rx="1.5" fill="'+cor+'"/><rect x="11" y="15" width="7" height="5" rx="1.5" fill="'+cor+'" opacity=".7"/></svg>';
  return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 32 32" fill="none"><path d="M2 15 L16 3 L30 15" stroke="'+cor+'" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M2 15 L16 3 L30 15" fill="'+cor+'" opacity=".1"/><rect x="4" y="14" width="24" height="15" rx="1" stroke="'+cor+'" stroke-width="2" fill="'+cor+'" opacity=".08"/><rect x="7" y="16" width="18" height="3.5" rx="1" fill="'+cor+'" opacity=".45"/><rect x="7" y="20.5" width="18" height="3.5" rx="1" fill="'+cor+'" opacity=".45"/><circle cx="16" cy="22.5" r="1.3" fill="'+cor+'" opacity=".9"/></svg>';
}

function parseCsvFrota(txt) {
  var rows = [];
  var LF = String.fromCharCode(10);
  var CR = String.fromCharCode(13);
  var norm = '';
  for (var i = 0; i < txt.length; i++) {
    if (txt[i] === CR) {
      norm += LF;
      if (txt[i+1] === LF) i++;
    } else {
      norm += txt[i];
    }
  }
  var lines = norm.split(LF);
  for (var li = 1; li < lines.length; li++) {
    var line = lines[li];
    if (!line.trim()) continue;
    var cols = [], cur = '', inQ = false;
    for (var ci = 0; ci < line.length; ci++) {
      var c = line[ci];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    cols.push(cur.trim());
    if (cols.length > 7 && cols[COL.CAVALO] && cols[COL.CAVALO].trim()) {
      rows.push(cols);
    }
  }
  return rows;
}

function carregarCadastro() {
  var xhr = new XMLHttpRequest();
  xhr.timeout = 10000;
  xhr.open('GET', CADASTRO_CSV + '&_=' + Date.now(), true);
  xhr.onload = function() {
    if (xhr.status !== 200 || !xhr.responseText) return;
    var LF = String.fromCharCode(10);
    var CR = String.fromCharCode(13);
    var raw = xhr.responseText;
    var norm = '';
    for (var ci = 0; ci < raw.length; ci++) {
      if (raw[ci] === CR) {
        norm += LF;
        if (raw[ci+1] === LF) ci++;
      } else {
        norm += raw[ci];
      }
    }
    var lines = norm.split(LF);
    if (lines.length < 2) return;
    var sep = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';
    _frotaNumMap = {};
    for (var i = 1; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      var cols = [], cur = '', inQ = false;
      for (var k = 0; k < line.length; k++) {
        var c = line[k];
        if (c === '"') { inQ = !inQ; }
        else if (c === sep && !inQ) { cols.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
      cols.push(cur.trim());
      var frota   = (cols[0] || '').replace(/"/g, '').trim();
      var veiculo = (cols[2] || '').replace(/"/g, '').trim();
      if (!frota || !veiculo) continue;
      _frotaNumMap[veiculo.toUpperCase()] = frota;
      var sem = '';
      for (var vi = 0; vi < veiculo.length; vi++) {
        if (veiculo[vi] !== '-' && veiculo[vi] !== ' ') sem += veiculo[vi];
      }
      _frotaNumMap[sem.toUpperCase()] = frota;
    }
    if (_frotaVlist && _frotaVlist.length > 0) {
      var cl = [];
      try { cl = JSON.parse(localStorage.getItem('twm_checklists') || '[]'); } catch(e) {}
      renderPaginaFrota(cl);
    }
  };
  xhr.send();
}

function renderFrota(dados) {
  var grid      = document.getElementById('frota-grid');
  var alertaDiv = document.getElementById('frota-alerta');
  var alertaTxt = document.getElementById('frota-alerta-txt');
  if (!grid) return;
  if (!dados || !dados.length) {
    grid.innerHTML = '<div class="frota-msg">Nenhum ve\xedculo encontrado.</div>';
    return;
  }
  _frotaVmap = {}; _frotaVlist = [];
  for (var i = 0; i < dados.length; i++) {
    var cav = (dados[i][COL.CAVALO] || '').trim();
    if (cav && !_frotaVmap[cav]) { _frotaVmap[cav] = dados[i]; _frotaVlist.push(cav); }
  }
  var checklists = [];
  try { checklists = JSON.parse(localStorage.getItem('twm_checklists') || '[]'); } catch(e) {}
  var totalManut = 0;
  for (var j = 0; j < _frotaVlist.length; j++) {
    var cv = _frotaVlist[j];
    for (var x = 0; x < checklists.length; x++) {
      if (checklists[x].solicitacao_manutencao && (checklists[x].cavalo || '').toUpperCase().indexOf(cv.toUpperCase().slice(0,4)) >= 0) {
        totalManut++; break;
      }
    }
  }
  var totalPags = Math.ceil(_frotaVlist.length / POR_PAG);
  if (_frotaPage >= totalPags) _frotaPage = totalPags - 1;
  if (_frotaPage < 0) _frotaPage = 0;
  renderPaginaFrota(checklists);
  renderPager(totalPags);
  if (alertaTxt && alertaDiv) {
    if (totalManut > 0) {
      alertaTxt.textContent = totalManut + ' caminhão' + (totalManut > 1 ? 's' : '') + ' com solicitação de manutenção';
      alertaDiv.style.display = 'flex';
    } else {
      alertaDiv.style.display = 'none';
    }
  }
}

function numFrotaDe(cav) {
  var fn = _frotaNumMap[cav.toUpperCase()] || '';
  if (!fn) {
    var sem = '';
    for (var i = 0; i < cav.length; i++) {
      if (cav[i] !== '-' && cav[i] !== ' ') sem += cav[i];
    }
    fn = _frotaNumMap[sem.toUpperCase()] || '';
  }
  return fn;
}

function renderPaginaFrota(checklists) {
  var grid = document.getElementById('frota-grid');
  if (!grid) return;
  if (!checklists) {
    try { checklists = JSON.parse(localStorage.getItem('twm_checklists') || '[]'); } catch(e) { checklists = []; }
  }
  var inicio = _frotaPage * POR_PAG;
  var pagina = _frotaVlist.slice(inicio, inicio + POR_PAG);
  var html = '';
  for (var j = 0; j < pagina.length; j++) {
    var cav = pagina[j];
    var row = _frotaVmap[cav];
    var st  = normStatus(row[COL.STATUS]);
    var cfg = SCFG[st];
    var temManut = false;
    for (var x = 0; x < checklists.length; x++) {
      if (checklists[x].solicitacao_manutencao && (checklists[x].cavalo || '').toUpperCase().indexOf(cav.toUpperCase().slice(0,4)) >= 0) {
        temManut = true; break;
      }
    }
    var fn = numFrotaDe(cav);
    var cavEsc = cav.split("'").join("\\'");
    html += '<div class="frota-card" onclick="fmAbrir(\'' + cavEsc + '\')">';
    html += temManut ? '<div class="frota-badge">!</div>' : '';
    html += '<div class="frota-ico" style="background:' + cfg.bg + '">' + icoFrota(st, cfg.cor, 20) + '</div>';
    html += '<div class="frota-id">' + cav + '</div>';
    html += (fn && fn !== cav) ? '<div class="frota-num">' + fn + '</div>' : '';
    html += '<div class="frota-st" style="color:' + cfg.cor + '">' + cfg.lbl + '</div>';
    html += '</div>';
  }
  grid.innerHTML = html || '<div class="frota-msg">Sem ve\xedculos nesta p\xe1gina.</div>';
}

function renderPager(totalPags) {
  var pager = document.getElementById('frota-pager');
  if (!pager) return;
  if (totalPags <= 1) { pager.innerHTML = ''; return; }
  var h = '';
  for (var i = 0; i < totalPags; i++) {
    h += '<div class="frota-dot' + (i === _frotaPage ? ' active' : '') + '" onclick="frotaIrPag(' + i + ')"></div>';
  }
  pager.innerHTML = h;
}

function frotaNav(dir) {
  var totalPags = Math.ceil(_frotaVlist.length / POR_PAG);
  if (totalPags <= 1) return;
  _frotaPage = (_frotaPage + dir + totalPags) % totalPags;
  var cl = [];
  try { cl = JSON.parse(localStorage.getItem('twm_checklists') || '[]'); } catch(e) {}
  renderPaginaFrota(cl);
  renderPager(totalPags);
}

function frotaIrPag(n) {
  _frotaPage = n;
  var totalPags = Math.ceil(_frotaVlist.length / POR_PAG);
  var cl = [];
  try { cl = JSON.parse(localStorage.getItem('twm_checklists') || '[]'); } catch(e) {}
  renderPaginaFrota(cl);
  renderPager(totalPags);
}

function _buscarPlanilha(forcaRender) {
  var xhr = new XMLHttpRequest();
  xhr.timeout = 10000;
  xhr.open('GET', FROTA_CSV + '&_=' + Date.now(), true);
  xhr.onload = function() {
    if (xhr.status === 200 && xhr.responseText && xhr.responseText.length > 10) {
      var txt = xhr.responseText.trim();
      var mudou = (txt !== _ultimoCSV);
      _ultimoCSV = txt;
      if (mudou || forcaRender) {
        var novos = parseCsvFrota(txt);
        if (novos.length > 0) {
          _frotaDados = novos;
          try { localStorage.setItem('twm_frota_cache', JSON.stringify(_frotaDados)); } catch(e) {}
          renderFrota(_frotaDados);
          if (mudou && !forcaRender) {
            var el = document.getElementById('frota-atualizado');
            if (el) { el.style.opacity = '1'; setTimeout(function() { el.style.opacity = '0'; }, 2500); }
          }
        }
      }
    } else {
      if (!_frotaDados || !_frotaDados.length) {
        var grid = document.getElementById('frota-grid');
        if (grid) grid.innerHTML = '<div class="frota-msg" style="color:#F87171">Sem conex\xe3o.</div>';
      }
    }
  };
  xhr.onerror = xhr.ontimeout = function() {
    var cache = localStorage.getItem('twm_frota_cache');
    if (cache) {
      try { var d = JSON.parse(cache); if (d && d.length) { _frotaDados = d; renderFrota(d); } } catch(e) {}
    }
  };
  xhr.send();
}

function carregarFrota() {
  var cache = localStorage.getItem('twm_frota_cache');
  if (cache) {
    try {
      var d = JSON.parse(cache);
      if (d && d.length) { _frotaDados = d; renderFrota(d); }
    } catch(e) {}
  }
  _buscarPlanilha(true);
}

function frotaExpandir() {
  var bg = document.getElementById('frota-full-bg');
  if (!bg) return;
  bg.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderFrotaFull();
}

function frotaRecolher() {
  var bg = document.getElementById('frota-full-bg');
  if (!bg) return;
  bg.classList.remove('open');
  document.body.style.overflow = '';
}

function renderFrotaFull() {
  var grid = document.getElementById('frota-full-grid');
  if (!grid || !_frotaVlist || !_frotaVlist.length) {
    if (grid) grid.innerHTML = '<div style="text-align:center;padding:30px;color:#7A7890">Sem dados.</div>';
    return;
  }
  var checklists = [];
  try { checklists = JSON.parse(localStorage.getItem('twm_checklists') || '[]'); } catch(e) {}
  var h = '';
  for (var j = 0; j < _frotaVlist.length; j++) {
    var cav = _frotaVlist[j];
    var row = _frotaVmap[cav];
    var st  = normStatus(row[COL.STATUS]);
    var cfg = SCFG[st];
    var mot = (row[COL.MOTORISTA] || '').trim();
    var pts = mot.split(' ');
    var abrev = pts.length > 1 ? pts[0] + ' ' + pts[pts.length - 1] : mot;
    var manut = false;
    for (var x = 0; x < checklists.length; x++) {
      if (checklists[x].solicitacao_manutencao && (checklists[x].cavalo || '').toUpperCase().indexOf(cav.toUpperCase().slice(0,4)) >= 0) {
        manut = true; break;
      }
    }
    var cavEsc = cav.split("'").join("\\'");
    h += '<div class="frota-full-card" onclick="fmAbrirFull(\'' + cavEsc + '\')" style="border-color:' + (manut ? '#EF4444' : 'transparent') + '">';
    h += manut ? '<div class="frota-full-badge">!</div>' : '';
    h += '<div class="frota-full-ico" style="background:' + cfg.bg + '">' + icoFrota(st, cfg.cor, 30) + '</div>';
    h += '<div class="frota-full-id">' + cav + '</div>';
    h += '<div class="frota-full-mot">' + abrev + '</div>';
    h += '<div class="frota-full-st" style="background:' + cfg.bg + ';color:' + cfg.cor + '">' + cfg.lbl + '</div>';
    h += '</div>';
  }
  grid.innerHTML = h;
}

function fmAbrirFull(cav) {
  frotaRecolher();
  setTimeout(function() { fmAbrir(cav); }, 200);
}

function iniciarFrotaExtra() {
  carregarCadastro();
  carregarFrota();
  if (window._frotaTimer) clearInterval(window._frotaTimer);
  window._frotaTimer = setInterval(function() { _buscarPlanilha(false); }, 30000);
}

// Aguarda o app principal estar pronto e sobrescreve mostrarApp
document.addEventListener('DOMContentLoaded', function() {
  if (typeof mostrarApp === 'function') {
    var orig = mostrarApp;
    mostrarApp = function(u) {
      orig(u);
      iniciarFrotaExtra();
    };
  }
});
