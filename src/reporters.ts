import type { AuditResult } from './core/types.js';

export type ReportLocale = 'en' | 'zh-CN';

const labels = {
  en: {
    title: 'AI Test Auditor',
    findings: 'Findings',
    tests: 'Tests',
    fake: 'FAKE',
    weak: 'WEAK',
    unassessed: 'UNASSESSED',
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
  },
  'zh-CN': {
    title: 'AI Test Auditor',
    findings: '发现项',
    tests: '测试数',
    fake: 'FAKE',
    weak: 'WEAK',
    unassessed: 'UNASSESSED',
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
  const cards = data
    .map(
      (finding) =>
        `<article class="finding" data-classification="${escapeHtml(finding.classification)}" data-rule="${escapeHtml(finding.ruleId)}" data-file="${escapeHtml(finding.filePath)}"><header><b>${escapeHtml(finding.classification)}</b> <code>${escapeHtml(finding.ruleId)}</code> · ${escapeHtml(finding.severity)} · ${escapeHtml(finding.filePath)}:${finding.line}</header><p>${escapeHtml(finding.message)}</p><p><strong>${t.remediation}:</strong> ${escapeHtml(finding.remediation)}</p></article>`,
    )
    .join('');
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.title}</title><style>:root{color-scheme:dark;--bg:#111827;--panel:#1f2937;--ink:#f3f4f6;--fake:#fb7185;--weak:#fbbf24}body{margin:0;background:var(--bg);color:var(--ink);font:16px ui-monospace,monospace}main{max-width:1100px;margin:auto;padding:32px}h1{font-family:Georgia,serif}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}.card,.finding,fieldset{background:var(--panel);padding:14px;border-radius:8px}.finding{margin:12px 0;border-left:4px solid var(--weak)}.finding[data-classification="FAKE"]{border-color:var(--fake)}input,select,button{padding:8px;margin:4px;background:#111827;color:inherit;border:1px solid #64748b;border-radius:4px}code{color:#93c5fd}.hidden{display:none}</style><main><h1>${t.title}</h1><p>${t.sourceOnly} ${t.noStrong}</p><section class="grid"><div class="card">${t.tests}<br><b>${result.summary.total}</b></div><div class="card">${t.fake}<br><b>${result.summary.fake}</b></div><div class="card">${t.weak}<br><b>${result.summary.weak}</b></div><div class="card">${t.unassessed}<br><b>${result.summary.unassessed}</b></div><div class="card">${t.ftr}<br><b>${result.summary.fakeTestRatio.toFixed(2)}%</b></div><div class="card">${t.trust}<br><b>${result.summary.trustScore}</b></div></section><fieldset><legend>${t.filter}</legend><select id="classification"><option value="">${t.findings}</option><option>FAKE</option><option>WEAK</option></select><input id="rule" placeholder="${t.rule}"><input id="file" placeholder="${t.file}"><button id="reset">${t.reset}</button></fieldset><p id="empty" class="hidden">${t.noResults}</p><section id="findings">${cards}</section></main><script>const q=s=>document.querySelector(s),all=[...document.querySelectorAll('.finding')];function f(){const c=q('#classification').value,r=q('#rule').value.toLowerCase(),p=q('#file').value.toLowerCase();let n=0;all.forEach(x=>{const ok=(!c||x.dataset.classification===c)&&(!r||x.dataset.rule.toLowerCase().includes(r))&&(!p||x.dataset.file.toLowerCase().includes(p));x.classList.toggle('hidden',!ok);if(ok)n++});q('#empty').classList.toggle('hidden',n>0)}['#classification','#rule','#file'].forEach(x=>q(x).addEventListener('input',f));q('#reset').onclick=()=>{q('#classification').value=q('#rule').value=q('#file').value='';f()};</script></html>`;
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
