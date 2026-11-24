var WTAB = 'dialog';
var WPLAN_OPEN = true;
var WTIP = false;

function isWorkConv(c) {
  return !!(c && c.kind === 'task');
}

function wEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
  });
}

function workRuns(c) {
  if (!c || !c.runs) return [];
  var all = store.tasks || [];
  return c.runs.map(function (id) {
    return all.find(function (r) { return r.id === id; });
  }).filter(Boolean);
}

function wDuration(run) {
  var steps = run.steps || [];
  if (!steps.length) return '';
  var ms = (steps[steps.length - 1].ts || run.ts) - (steps[0].ts || run.ts);
  var s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return s + ' 秒';
  var m = Math.floor(s / 60), rs = s % 60;
  return m + ' 分' + (rs ? rs + ' 秒' : '');
}

function wStatusText(run) {
  if (run.status === 'running') return '执行中';
  if (run.status === 'failed') return '执行失败';
  if (run.status === 'stopped') return '已暂停';
  return '已完成';
}

function wToolLabel(name) {
  var map = {
    list_dir: '列出目录', read: '读取文件', read_file: '读取文件', write: '写入文件', write_file: '写入文件',
    edit: '编辑文件', edit_file: '编辑文件', pwsh: '执行命令', run_cmd: '执行命令', screenshot: '截屏',
    mkdir: '新建目录', move_file: '移动文件', delete_file: '删除文件', click: '点击', type: '输入文字',
    key: '按键', launch: '启动程序', finish: '结束任务',
  };
  return map[name] || name || '操作';
}

function wArgBrief(args) {
  if (!args || typeof args !== 'object') return '';
  var keys = Object.keys(args).filter(function (k) { return k !== '__perms' && args[k] != null; });
  if (!keys.length) return '';
  var k = keys[0];
  var v = String(args[k]);
  if (v.length > 90) v = v.slice(0, 90) + '…';
  return v;
}

function wPlanCard(run) {
  var items = [];
  if (run.todos && run.todos.length) {
    items = run.todos.map(function (td) {
      return { text: typeof td === 'string' ? td : (td.text || td.title || ''), done: !!(td.done || td.status === 'done') };
    });
  } else {
    var open = false;
    (run.steps || []).forEach(function (s) {
      if (s.kind === 'tool') {
        var name = String(s.text || '').split('\n')[0];
        items.push({ text: wToolLabel(name), done: false });
        open = true;
      } else if (s.kind === 'obs' && open) {
        if (!items.length) return;
        items[items.length - 1].done = true;
        open = false;
      }
    });
  }
  if (!items.length) return '';
  var doneN = items.filter(function (i) { return i.done; }).length;
  var rows = items.map(function (i) {
    return '<div class="wtd' + (i.done ? ' done' : '') + '">' +
      '<span class="wbox">' + (i.done ? '✓' : '') + '</span>' +
      '<span class="wtdtxt">' + wEsc(i.text) + '</span></div>';
  }).join('');
  return '<div class="wplan">' +
    '<button class="wph" data-wplan="1">' +
    '<span class="wp-ttl">待处理清单</span><span class="wp-n">' + doneN + ' / ' + items.length + '</span>' +
    '<svg class="chev' + (WPLAN_OPEN ? ' up' : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7.4 10l4.6 4.4 4.6-4.4"/></svg>' +
    '</button>' +
    (WPLAN_OPEN ? '<div class="wplist">' + rows + '</div>' : '') +
    '</div>';
}

function wStepCard(step, obs, i) {
  if (step.kind === 'tool') {
    var name = String(step.text || '').split('\n')[0];
    var argsLine = String(step.text || '').split('\n').slice(1).join(' ').trim();
    var brief = '';
    try {
      var a = JSON.parse(argsLine.replace(/^\s*/, ''));
      brief = wArgBrief(a);
    } catch (e) { brief = ''; }
    return '<div class="wtool" data-tip="' + i + '">' +
      '<div class="wt-h"><span class="wt-ic">›</span><span class="wt-name">' + wEsc(wToolLabel(name)) + '</span>' +
      (brief ? '<span class="wt-arg">' + wEsc(brief) + '</span>' : '') + '</div>' +
      '<div class="wt-body"><pre>' + wEsc(obs ? String(obs.text || '') : '执行中…') + '</pre></div>' +
      '</div>';
  }
  if (step.kind === 'think') {
    return '<p class="wp-think">' + wEsc(step.text) + '</p>';
  }
  if (step.kind === 'final') {
    return '<div class="wfinal">' + wEsc(step.text) + '</div>';
  }
  if (step.kind === 'err') {
    return '<div class="werr">' + wEsc(step.text) + '</div>';
  }
  return '';
}

function fmtTokW(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function wDiffCard(run) {
  var dd = run.diff;
  if (!dd || !dd.card) return '';
  var c = dd.card, st = dd.state;
  var stTxt = st === 'pending' ? '等你点头' : st === 'applied' ? '已写入' : st === 'undone' ? '已撤销' : '已取消';
  var acts = '';
  if (st === 'pending') {
    acts = '<button class="wdb go" data-wdiff="apply" data-run="' + run.id + '">应用</button>' +
      '<button class="wdb" data-wdiff="cancel" data-run="' + run.id + '">取消</button>' +
      '<button class="wdauto" data-wdiff="all" data-run="' + run.id + '">本任务后续都按这个来</button>';
  } else if (st === 'applied' && dd.seq) {
    acts = '<span class="wundo" data-wundo="' + dd.seq + '">撤销这一步</span>';
  }
  return '<div class="wdiff ' + st + '">' +
    '<div class="wdh"><span class="wd-ic">±</span><span class="wd-ttl">' + wEsc(c.kind) + ' 1 个文件</span>' +
    '<span class="wd-stat"><em>+' + c.add + '</em> <i>−' + c.del + '</i></span></div>' +
    '<div class="wdf"><span class="wdf-p">' + wEsc(c.path) + '</span>' +
    '<span class="wdf-d"><em>+' + c.add + '</em> <i>−' + c.del + '</i></span></div>' +
    '<div class="wda">' + acts + '<span class="wstate">' + stTxt + '</span></div></div>';
}

function wRunBlock(run) {
  var steps = run.steps || [];
  var obsFor = {};
  steps.forEach(function (s, i) {
    if (s.kind === 'obs') {
      for (var j = i - 1; j >= 0; j--) {
        if (steps[j].kind === 'tool') { obsFor[j] = s; break; }
      }
    }
  });
  var body = steps.filter(function (s) { return s.kind !== 'obs'; })
    .map(function (s) {
      var i = steps.indexOf(s);
      return wStepCard(s, obsFor[i], i);
    }).join('');

  var st = run.status === 'running' ? 'run' : (run.status === 'failed' ? 'bad' : 'done');
  return '<div class="wrun">' +
    '<div class="wrun-top"><span class="wst ' + st + '">' + (run.status === 'running' ? '<i class="dot"></i>' : '') + wStatusText(run) + '</span>' +
    (wDuration(run) ? '<span class="wdur">用时 ' + wDuration(run) + '</span>' : '') +
    (run.planned ? '<span class="wtag">计划</span>' : '') + '</div>' +
    '<div class="wgoal-b">' + wEsc(run.goal) + '</div>' +
    wPlanCard(run) +
    wDiffCard(run) +
    body +
    '</div>';
}

function wTraceView(c) {
  var runs = workRuns(c);
  if (!runs.length) return '<div class="wtrace-empty">还没有执行记录。发送一条任务目标就会开始。</div>';
  return runs.map(function (run) {
    var rows = (run.steps || []).map(function (s) {
      var tm = new Date(s.ts || run.ts);
      var hh = String(tm.getHours()).padStart(2, '0') + ':' + String(tm.getMinutes()).padStart(2, '0');
      return '<div class="wtr-row"><span class="wtr-t">' + hh + '</span>' +
        '<span class="wtr-k k-' + wEsc(s.kind) + '">' + wEsc(s.kind) + '</span>' +
        '<span class="wtr-v">' + wEsc(String(s.text || '').slice(0, 600)) + '</span></div>';
    }).join('');
    return '<div class="wtr-run"><div class="wtr-head">' + wEsc(run.goal) + ' · ' + wStatusText(run) + '</div>' + (rows || '<div class="wtrace-empty">等待第一步…</div>') + '</div>';
  }).join('');
}

function renderWorkView() {
  var box = $('#wbody');
  if (!box) return;
  var c = cur();
  var runs = workRuns(c);
  var running = runs.some(function (r) { return r.status === 'running'; });
  var stat = $('#wstat');
  var lastRun = runs[runs.length - 1];
  if (stat) {
    stat.textContent = running ? '执行中' : (lastRun ? wStatusText(lastRun) + (wDuration(lastRun) ? ' · ' + wDuration(lastRun) : '') : '');
    stat.classList.toggle('run', running);
  }
  box.innerHTML = WTAB === 'trace' ? wTraceView(c) : (runs.length ? runs.map(wRunBlock).join('') :
    '<div class="wempty-state">描述要它做的事，Orion 会在工作区里逐步执行，过程与结果都留在这里。</div>');
  $$('.wtabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.wtab === WTAB); });

  var foot = $('#wfoot');
  if (foot) {
    if (lastRun) {
      var sc = (lastRun.steps || []).filter(function (s) { return s.kind !== 'obs'; }).length;
      $('#wfSteps').textContent = '步骤 ' + sc;
      $('#wfTools').textContent = '工具 ' + (lastRun.tools || 0) + ' 次';
      $('#wfTok').textContent = fmtTokW(lastRun.tokens) + ' tok' +
        (wDuration(lastRun) ? ' · ' + wDuration(lastRun) : '') +
        (lastRun.calls ? ' · 模型 ' + lastRun.calls + ' 次' : '');
      foot.style.display = '';
    } else {
      foot.style.display = 'none';
    }
  }
  if ($('#wspacePillTxt')) {
    $('#wspacePillTxt').textContent = ({ read: '只读预览', workspace: '工作区内修改', full: '完全访问' })[(store.agPerms || 'workspace')];
  }
  box.scrollTop = box.scrollHeight;
}

function showWorkView() {
  $('#hero').style.display = 'none';
  $('#chat').style.display = 'none';
  $('#wview').style.display = 'flex';
  $('.main').classList.remove('empty');
  var sub = document.querySelector('.chtsub');
  if (sub) sub.style.display = 'none';
  if ($('#wspacePill')) $('#wspacePill').style.display = 'inline-flex';
  if ($('#wspacePillTxt')) $('#wspacePillTxt').textContent = '工作区内修改';
  renderWorkView();
  renderTop();
}

function hideWorkView() {
  if ($('#wview')) $('#wview').style.display = 'none';
  var sub = document.querySelector('.chtsub');
  if (sub) sub.style.display = '';
  if ($('#wspacePill')) $('#wspacePill').style.display = 'none';
}

document.addEventListener('click', function (e) {
  var tab = e.target.closest && e.target.closest('.wtabs button');
  if (tab) { WTAB = tab.dataset.wtab; renderWorkView(); return; }
  var ph = e.target.closest && e.target.closest('.wph');
  if (ph) { WPLAN_OPEN = !WPLAN_OPEN; renderWorkView(); return; }
  var tb = e.target.closest && e.target.closest('[data-wdiff]');
  if (tb) {
    var act = tb.dataset.wdiff, rid = tb.dataset.run;
    if (!window.orion || !window.orion.diffApply) return;
    var run = (store.tasks || []).filter(function (r) { return r.id === rid; })[0];
    if (run && run.diff) run.diff.state = act === 'cancel' ? 'cancelled' : 'sending';
    window.orion.diffApply(rid, act).then(function (r) {
      if (!r || !r.ok) { toast((r && r.msg) || '没有待确认的改动'); if (run && run.diff) run.diff.state = 'pending'; renderWorkView(); }
    }).catch(function () {});
    renderWorkView();
    return;
  }
  var un = e.target.closest && e.target.closest('[data-wundo]');
  if (un) {
    var seq = un.dataset.wundo;
    if (!window.orion || !window.orion.undo) return;
    window.orion.undo(seq).then(function (r) {
      toast((r && r.ok) ? ('已撤销：' + r.msg) : ((r && r.msg) || '撤销失败'));
      if (r && r.ok) {
        (store.tasks || []).forEach(function (x) {
          if (x.diff && x.diff.seq === seq) x.diff.state = 'undone';
        });
        save(); renderWorkView();
      }
    }).catch(function () { toast('撤销失败'); });
    return;
  }
  var tip = e.target.closest && e.target.closest('.wtool');
  if (tip) { tip.classList.toggle('open'); }
});
