import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import type { Framework, TestCase } from './types.js';

const frameworkModules: Readonly<Record<string, Framework>> = {
  '@jest/globals': 'jest',
  '@playwright/test': 'playwright',
  jest: 'jest',
  vitest: 'vitest',
};

function scriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function inferFramework(sourceFile: ts.SourceFile): Framework {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }

    const framework = frameworkModules[statement.moduleSpecifier.text];
    if (framework) return framework;
  }

  return 'unknown';
}

function callbackFor(
  call: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  return call.arguments.find(
    (argument): argument is ts.ArrowFunction | ts.FunctionExpression =>
      ts.isArrowFunction(argument) || ts.isFunctionExpression(argument),
  );
}

function testName(call: ts.CallExpression): string | undefined {
  const name = call.arguments[0];
  return name && ts.isStringLiteralLike(name) ? name.text : undefined;
}

export function extractTests(filePath: string): TestCase[] {
  const absolutePath = resolve(filePath);
  const sourceFile = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    scriptKind(absolutePath),
  );
  const framework = inferFramework(sourceFile);
  const tests: TestCase[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = testName(node);
      const callback = callbackFor(node);

      if (
        (node.expression.text === 'test' || node.expression.text === 'it') &&
        name &&
        callback
      ) {
        tests.push({
          filePath: absolutePath,
          name,
          framework,
          type: framework === 'playwright' ? 'e2e' : 'unknown',
          line:
            sourceFile.getLineAndCharacterOfPosition(
              callback.getStart(sourceFile),
            ).line + 1,
          source: callback.getText(sourceFile),
          body: callback.body.getText(sourceFile),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return tests;
}
