import type { AuditResult } from './core/types.js';

export type ReportLocale = 'en' | 'zh-CN';

const labels = {
  en: {
    title: 'AI Test Auditor',
    findings: 'Findings',
    auditItems: 'Audit items',
    extractedTests: 'Extracted test callbacks',
    fake: 'Fake tests (FAKE)',
    weak: 'Review hints (WEAK)',
    unassessed: 'Unassessed (UNASSESSED)',
    invalid: 'Invalid source (INVALID)',
    ftr: 'Fake Test Ratio',
    trust: 'Trust Score',
    filter: 'Filter findings',
    file: 'File name',
    rule: 'Rule ID',
    reset: 'Reset filters',
    noStrong: 'No finding does not mean a test is STRONG.',
    sourceOnly:
      'Static source analysis only: reviewed tests were not executed.',
    remediation: 'Remediation',
    noResults: 'No findings match these filters.',
    noFindings: 'No findings were reported by static analysis.',
    classification: 'Classification',
    navigation: 'Browse by rule',
    files: 'Browse by file',
    classifications: 'Browse by classification',
    navigationLabel: 'Audit navigation',
  },
  'zh-CN': {
    title: 'AI Test Auditor',
    findings: '发现项',
    auditItems: '静态审计项',
    extractedTests: '已识别测试回调',
    fake: '虚假测试（FAKE）',
    weak: '待人工复核（WEAK）',
    unassessed: '未评估（UNASSESSED）',
    invalid: '无效源码（INVALID）',
    ftr: '虚假测试比例',
    trust: '信任分数',
    filter: '筛选发现项',
    file: '文件名',
    rule: '规则 ID',
    reset: '重置筛选',
    noStrong: '没有发现项不表示测试是 STRONG。',
    sourceOnly: '仅静态源码分析：未执行被审计测试。',
    remediation: '修复建议',
    noResults: '没有匹配当前筛选条件的发现项。',
    noFindings: '静态分析未发现问题。',
    classification: '分类',
    navigation: '按规则浏览',
    files: '按文件浏览',
    classifications: '按分类浏览',
    navigationLabel: '审计导航',
  },
} as const;

const classificationLabels = {
  en: {
    FAKE: 'Fake test',
    WEAK: 'Review hint',
    INVALID: 'Invalid source',
    STRONG: 'Strong test',
    UNASSESSED: 'Unassessed',
  },
  'zh-CN': {
    FAKE: '虚假测试',
    WEAK: '待人工复核',
    INVALID: '无效源码',
    STRONG: '强测试',
    UNASSESSED: '未评估',
  },
} as const;

const severityLabels = {
  en: { CRITICAL: 'Critical', WARNING: 'Warning', INFO: 'Info' },
  'zh-CN': { CRITICAL: '严重', WARNING: '警告', INFO: '提示' },
} as const;

const ruleDescriptions = {
  E2E001: {
    en: 'Playwright test callback has no recognized expect assertion.',
    'zh-CN': 'Playwright 测试回调中没有可识别的 expect 断言。',
  },
  E2E002: {
    en: 'Every recognized Playwright assertion checks only the page URL.',
    'zh-CN': '所有可识别的 Playwright 断言只检查页面 URL。',
  },
  E2E003: {
    en: 'Every direct Playwright assertion only checks element visibility.',
    'zh-CN': '所有直接 Playwright 断言只检查元素可见性。',
  },
  E2E004: {
    en: 'page.waitForTimeout receives a numeric literal.',
    'zh-CN': 'page.waitForTimeout 使用了数字字面量。',
  },
} as const;

export function renderJson(result: AuditResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderText(result: AuditResult): string {
  const { summary } = result;
  const critical = result.findings.filter(
    (finding) => finding.severity === 'CRITICAL',
  ).length;
  const warning = result.findings.filter(
    (finding) => finding.severity === 'WARNING',
  ).length;
  const lines = [
    'AI Test Auditor',
    '',
    `Audit items: ${summary.total} total, ${summary.assessed} assessed`,
    `Extracted test cases: ${result.tests.length}`,
    `Classifications: FAKE ${summary.fake} | WEAK ${summary.weak} | INVALID ${summary.invalid} | UNASSESSED ${summary.unassessed}`,
    `Fake Test Ratio: ${summary.fakeTestRatio.toFixed(2)}% (${summary.fake} / ${summary.assessed} assessed)`,
    `Trust Score: ${summary.trustScore}/100 (100 - ${critical} critical x 25 - ${warning} warning x 10)`,
    '',
  ];
  if (result.selection) {
    lines.push(
      '',
      `File selection: ${result.selection.mode} (${result.selection.files.length} changed candidates)`,
    );
  }

  if (result.findings.length === 0) {
    lines.push(
      'No deterministic findings. Unflagged tests remain UNASSESSED; this is not evidence that they are STRONG.',
    );
  } else {
    lines.push('Findings');
    for (const finding of result.findings) {
      lines.push(
        '',
        `${finding.filePath}:${finding.line} [${finding.severity}] [${finding.classification}] ${finding.ruleId}`,
        `  ${finding.message}`,
        `  Remediation: ${finding.remediation}`,
      );
    }
  }

  if (result.diagnostics && result.diagnostics.length > 0) {
    lines.push('', 'Parser diagnostics (source syntax only)');
    for (const diagnostic of result.diagnostics) {
      lines.push(
        `${diagnostic.filePath}:${diagnostic.line} [PARSER001] ${diagnostic.message}`,
      );
    }
  }

  if (result.semantic) {
    lines.push(
      '',
      `Semantic inferences (${result.semantic.provider}; advisory only)`,
    );
    for (const inference of result.semantic.inferences) {
      lines.push(
        `${inference.filePath}:${inference.line} [${inference.confidence}] ${inference.summary}`,
      );
    }
  }

  if (result.mutation) {
    const { mutation } = result;
    lines.push(
      '',
      'Mutation evidence (advisory only)',
      `Engine: ${mutation.engine}`,
      `Command: ${mutation.command}`,
      `Score: ${mutation.result.score.toFixed(2)}% (${mutation.result.killed} killed / ${mutation.result.totalMutants} total; ${mutation.result.survived} survived)`,
      `Threshold: ${mutation.meetsThreshold ? 'met' : 'below'} (${mutation.threshold.minimumScore.toFixed(2)}%)`,
      `Threshold source: ${mutation.threshold.source}`,
    );
  }

  if (result.baseline) {
    lines.push(
      '',
      'Baseline (advisory only)',
      `ID: ${result.baseline.id}`,
      `Historical findings: ${result.baseline.historicalFindingCount}`,
      `New findings: ${result.baseline.newFindingCount}`,
    );
  }

  if (result.policy) {
    lines.push(
      '',
      'Policy (advisory only)',
      `ID: ${result.policy.id}`,
      `Disabled findings: ${result.policy.disabledFindingCount}`,
      `Active findings: ${result.policy.activeFindingCount}`,
    );
  }

  lines.push(
    '',
    'Static source analysis only: tests were not executed, and runtime behavior was not assessed.',
  );

  return `${lines.join('\n')}\n`;
}

export function renderHtml(
  result: AuditResult,
  locale: ReportLocale = 'en',
): string {
  const t = labels[locale];
  const data = result.findings.map(
    ({
      ruleId,
      severity,
      classification,
      filePath,
      line,
      message,
      remediation,
    }) => ({
      ruleId,
      severity,
      classification,
      filePath,
      line,
      message,
      remediation,
    }),
  );
  const cardHtml = data.map((finding) => {
    const classification = classificationLabels[locale][finding.classification];
    const severity = severityLabels[locale][finding.severity];
    const ruleDescription =
      ruleDescriptions[finding.ruleId as keyof typeof ruleDescriptions]?.[
        locale
      ];
    const ruleTitle = ruleDescription
      ? `${finding.ruleId}${locale === 'zh-CN' ? '：' : ': '}${ruleDescription}`
      : finding.ruleId;
    return `<article class="finding" data-classification="${escapeHtml(finding.classification)}" data-rule="${escapeHtml(finding.ruleId)}" data-file="${escapeHtml(finding.filePath)}"><header><b>${escapeHtml(classification)} (${escapeHtml(finding.classification)})</b> <code tabindex="0" title="${escapeHtml(ruleTitle)}" aria-label="${escapeHtml(ruleTitle)}">${escapeHtml(finding.ruleId)}</code> · ${escapeHtml(severity)} (${escapeHtml(severity)}) · ${escapeHtml(finding.filePath)}:${finding.line}</header><p>${escapeHtml(finding.message)}</p><details><summary>${escapeHtml(t.remediation)}</summary><p>${escapeHtml(finding.remediation)}</p></details></article>`;
  });
  const ruleCounts = countBy(data.map((finding) => finding.ruleId));
  const fileCounts = countBy(data.map((finding) => finding.filePath));
  const classificationCounts = countBy(
    data.map((finding) => finding.classification),
  );
  const navigation = `<nav><h2>${escapeHtml(t.navigation)}</h2>${ruleCounts.map(([rule, count]) => `<button type="button" data-filter-kind="rule" data-filter-value="${escapeHtml(rule)}">${escapeHtml(rule)} <b>${count}</b></button>`).join('')}<h2>${escapeHtml(t.classifications)}</h2>${classificationCounts.map(([classification, count]) => `<button type="button" data-filter-kind="classification" data-filter-value="${escapeHtml(classification)}">${escapeHtml(classificationLabels[locale][classification as keyof typeof classificationLabels.en] ?? classification)} <b>${count}</b></button>`).join('')}<h2>${escapeHtml(t.files)}</h2>${fileCounts.map(([file, count]) => `<button type="button" data-filter-kind="file" data-filter-value="${escapeHtml(file)}">${escapeHtml(file.split(/[\\/]/).pop() ?? file)} <b>${count}</b></button>`).join('')}</nav>`;
  const groupedCards = fileCounts
    .map(
      ([file, count]) =>
        `<section class="finding-group" data-group-file="${escapeHtml(file)}"><h2>${escapeHtml(file)} <b>${count}</b></h2>${data.map((finding, index) => (finding.filePath === file ? cardHtml[index] : '')).join('')}</section>`,
    )
    .join('');
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.title}</title><style>:root{color-scheme:dark;--bg:#111827;--panel:#1f2937;--ink:#f3f4f6;--fake:#fb7185;--weak:#fbbf24}body{margin:0;background:var(--bg);color:var(--ink);font:16px ui-monospace,monospace}main{max-width:1240px;margin:auto;padding:32px}.report-layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:24px;align-items:start}.report-navigation{position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto}.report-content{min-width:0}h1{font-family:Georgia,serif}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}.card,.finding,fieldset,.report-navigation,.finding-group{background:var(--panel);padding:14px;border-radius:8px}.report-navigation h2{font-size:1rem;margin:8px 0}.report-navigation button{display:block;width:100%;text-align:left}.finding-group{margin:16px 0}.finding{margin:12px 0;border-left:4px solid var(--weak)}.finding[data-classification="FAKE"]{border-color:var(--fake)}input,select,button{padding:8px;margin:4px;background:#111827;color:inherit;border:1px solid #64748b;border-radius:4px}code{color:#93c5fd;cursor:help;text-decoration:underline dotted}.hidden{display:none}@media (max-width: 720px){main{padding:16px}.report-layout{display:flex;flex-direction:column}.report-navigation{position:static;width:auto;max-height:none;order:0}.report-content{width:100%}}
</style><main><h1>${t.title}</h1><div class="report-layout"><aside class="report-navigation" aria-label="${escapeHtml(t.navigationLabel)}">${navigation}</aside><section class="report-content"><p>${t.sourceOnly} ${t.noStrong}</p><section class="grid"><div class="card">${t.auditItems}<br><b>${result.summary.total}</b></div><div class="card">${t.extractedTests}<br><b>${result.tests.length}</b></div><div class="card">${t.fake}<br><b>${result.summary.fake}</b></div><div class="card">${t.weak}<br><b>${result.summary.weak}</b></div><div class="card">${t.unassessed}<br><b>${result.summary.unassessed}</b></div><div class="card">${t.ftr}<br><b>${result.summary.fakeTestRatio.toFixed(2)}%</b></div><div class="card">${t.trust}<br><b>${result.summary.trustScore}</b></div></section><fieldset><legend>${t.filter}</legend><select id="classification"><option value="">${t.findings}</option><option value="FAKE">${t.fake}</option><option value="WEAK">${t.weak}</option><option value="INVALID">${t.invalid}</option></select><label for="rule">${t.rule}</label><input id="rule" aria-label="${t.rule}" placeholder="${t.rule}"><label for="file">${t.file}</label><input id="file" aria-label="${t.file}" placeholder="${t.file}"><button id="reset">${t.reset}</button></fieldset><p id="empty" class="${data.length ? 'hidden' : ''}">${t.noResults}</p><section id="findings">${groupedCards}</section></section></div></main><script>const q=s=>document.querySelector(s),all=[...document.querySelectorAll('.finding')];function f(){const c=q('#classification').value,r=q('#rule').value.toLowerCase(),p=q('#file').value.toLowerCase();let n=0;all.forEach(x=>{const ok=(!c||x.dataset.classification===c)&&(!r||x.dataset.rule.toLowerCase().includes(r))&&(!p||x.dataset.file.toLowerCase().includes(p));x.classList.toggle('hidden',!ok);if(ok)n++});document.querySelectorAll('.finding-group').forEach(g=>g.classList.toggle('hidden',![...g.querySelectorAll('.finding')].some(x=>!x.classList.contains('hidden'))));q('#empty').textContent=all.length===0?'${t.noFindings}':'${t.noResults}';q('#empty').classList.toggle('hidden',n>0)}['#rule','#file'].forEach(x=>q(x).addEventListener('input',f));['input','change'].forEach(e=>q('#classification').addEventListener(e,f));q('#reset').onclick=()=>{q('#classification').value=q('#rule').value=q('#file').value='';f()};document.querySelectorAll('[data-filter-kind]').forEach(x=>x.onclick=()=>{if(x.dataset.filterKind==='rule'){q('#file').value='';q('#rule').value=x.dataset.filterValue||''}else if(x.dataset.filterKind==='file'){q('#rule').value='';q('#file').value=x.dataset.filterValue||''}else{q('#classification').value=x.dataset.filterValue||'';q('#rule').value='';q('#file').value='';q('#rule').value='';q('#file').value=''};f()});f();</script></html>`;
}

function countBy(
  values: readonly string[],
): ReadonlyArray<readonly [string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
        character
      ] ?? character,
  );
}
