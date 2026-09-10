#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { rename, rm, writeFile } from 'node:fs/promises';
import { dirname, basename, join, resolve } from 'node:path';
import { Command, CommanderError, Option } from 'commander';
import { auditPath, InputPathError, type ReviewType } from './core/audit.js';
import { ChangedFilesError } from './core/changed-files.js';
import {
  renderHtml,
  renderJson,
  renderText,
  type ReportLocale,
} from './reporters.js';
import { SemanticReportError, loadSemanticReport } from './core/semantic.js';
import { MutationReportError, loadMutationReport } from './core/mutation.js';
import { PolicyError } from './core/policy.js';
import { BaselineError } from './core/baseline.js';
import {
  createAdvisoryDecision,
  DecisionError,
  loadDecisionEnvelope,
} from './core/decision.js';
import { GateError, createGateResult } from './core/gate.js';
import { GatePolicyError, loadGatePolicy } from './core/gate-policy.js';

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const defaultIo: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

type OutputFormat = 'text' | 'json' | 'html';

export function defaultReportOutputPath(
  format: OutputFormat,
  locale: ReportLocale,
  cwd: string = process.cwd(),
): string | undefined {
  if (format !== 'html') return undefined;
  return join(cwd, locale === 'zh-CN' ? 'audit-zh.html' : 'audit.html');
}

export async function runCli(
  args: readonly string[],
  io: CliIo = defaultIo,
): Promise<number> {
  const program = createProgram(io);
  let resultCode = 0;

  program
    .command('review')
    .description(
      'Audit JavaScript and TypeScript test source without executing it',
    )
    .argument('[path]', 'test file or directory to review', '.')
    .addOption(
      new Option('--type <type>', 'test type')
        .choices(['unit', 'api', 'e2e', 'auto'])
        .default('auto'),
    )
    .option(
      '--config <path>',
      'JSON configuration file with include and exclude arrays',
    )
    .option(
      '--changed-since <ref>',
      'review supported test files changed since a local commit',
    )
    .option(
      '--semantic-report <path>',
      'versioned offline semantic-report JSON',
    )
    .option(
      '--mutation-report <path>',
      'versioned offline mutation-evidence JSON',
    )
    .option('--policy <path>', 'versioned advisory policy JSON')
    .option('--baseline <path>', 'versioned advisory finding-baseline JSON')
    .addOption(
      new Option('--format <format>', 'output format')
        .choices(['text', 'json', 'html'])
        .default('text'),
    )
    .option('--locale <locale>', 'human-readable report locale', 'en')
    .option('--output <path>', 'write the report to a file')
    .option(
      '--print-output-path',
      'print the absolute report path after writing the report',
    )
    .addHelpText(
      'after',
      '\nExit codes:\n  0  No FAKE findings\n  1  One or more FAKE findings\n  2  Invalid command or input\n',
    )
    .action(
      async (
        inputPath: string,
        options: {
          readonly type: ReviewType;
          readonly format: OutputFormat;
          readonly locale: ReportLocale;
          readonly output?: string;
          readonly printOutputPath?: boolean;
          readonly config?: string;
          readonly changedSince?: string;
          readonly semanticReport?: string;
          readonly mutationReport?: string;
          readonly policy?: string;
          readonly baseline?: string;
        },
      ) => {
        const result = await auditPath(inputPath, {
          type: options.type,
          configPath: options.config,
          changedSince: options.changedSince,
          policyPath: options.policy,
          baselinePath: options.baseline,
        });
        const semantic = options.semanticReport
          ? await loadSemanticReport(options.semanticReport)
          : undefined;
        const mutation = options.mutationReport
          ? await loadMutationReport(options.mutationReport)
          : undefined;
        const rendered = { ...result, semantic, mutation };
        if (options.locale !== 'en' && options.locale !== 'zh-CN')
          throw new InputPathError('Unsupported locale. Use en or zh-CN.');
        const text =
          options.format === 'json'
            ? renderJson(rendered)
            : options.format === 'html'
              ? renderHtml(rendered, options.locale)
              : renderText(rendered);
        const outputPath =
          options.output ??
          defaultReportOutputPath(options.format, options.locale);
        if (outputPath) {
          await writeReport(outputPath, text);
          if (options.printOutputPath)
            io.stderr(`Report written to: ${resolve(outputPath)}\n`);
        } else io.stdout(text);
        resultCode =
          result.summary.invalid > 0 ? 2 : result.summary.fake > 0 ? 1 : 0;
      },
    );

  program
    .command('decision')
    .description(
      'Convert a versioned static audit snapshot into an advisory decision',
    )
    .argument('<envelope>', 'versioned static-audit decision envelope')
    .action(async (envelope: string) => {
      const decision = createAdvisoryDecision(
        await loadDecisionEnvelope(envelope),
      );
      io.stdout(`${JSON.stringify(decision, null, 2)}\n`);
      resultCode = 0;
    });

  program
    .command('gate')
    .description(
      'Apply an explicit FAKE-only policy gate to a static audit snapshot',
    )
    .argument('<policy>', 'versioned gate policy JSON')
    .argument('<audit>', 'versioned static-audit envelope JSON')
    .action(async (policyPath: string, auditPath: string) => {
      const result = createGateResult(
        await loadGatePolicy(policyPath),
        await loadDecisionEnvelope(auditPath),
      );
      io.stdout(`${JSON.stringify(result, null, 2)}\n`);
      resultCode = result.status === 'blocked' ? 1 : 0;
    });

  try {
    await program.parseAsync(['node', 'ata', ...args]);
    return resultCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode === 0 ? 0 : 2;
    }
    if (error instanceof InputPathError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof ChangedFilesError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof MutationReportError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof SemanticReportError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof PolicyError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof BaselineError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof DecisionError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof GatePolicyError || error instanceof GateError) {
      io.stderr(`Error: ${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

async function writeReport(path: string, text: string): Promise<void> {
  const temporary = join(dirname(path), `.${basename(path)}.tmp`);
  try {
    await writeFile(temporary, text, 'utf8');
    await rename(temporary, path);
  } catch {
    await rm(temporary, { force: true });
    throw new InputPathError(`Report cannot be written: ${path}`);
  }
}

function createProgram(io: CliIo): Command {
  return new Command()
    .name('ata')
    .description(
      'Deterministic static analysis for JavaScript and TypeScript tests',
    )
    .version('1.0.0')
    .exitOverride()
    .configureOutput({
      writeOut: io.stdout,
      writeErr: io.stderr,
    });
}

const entryPoint = process.argv[1];
if (
  entryPoint &&
  import.meta.url === pathToFileURL(realpathSync(entryPoint)).href
) {
  void runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
