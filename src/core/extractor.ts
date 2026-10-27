import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import { testCallbackFor } from './callback-resolution.js';
import {
  extractNativeAssertionBindings,
  visibleNativeAssertionBindingsAt,
} from './native-assertions.js';
import {
  hasAssignmentToName,
  hasFunctionScopedVar,
  hasPotentialWriteInScope,
  hasTopLevelBinding,
  isShadowedAtNode,
} from './scope-analysis.js';
import { staticRequireModule } from './static-require.js';
import type {
  ExtractionResult,
  Framework,
  ParserDiagnostic,
  TestCase,
} from './types.js';

const frameworkModules: Readonly<Record<string, Framework>> = {
  '@jest/globals': 'jest',
  '@playwright/test': 'playwright',
  jest: 'jest',
  'node:test': 'node-test',
  vitest: 'vitest',
};
const matcherFrameworkModules = new Set([
  '@jest/globals',
  '@playwright/test',
  'vitest',
]);
const supportedFrameworkModules = new Set(Object.keys(frameworkModules));
const testRegistrationModifiers: Readonly<
  Record<Framework, ReadonlySet<string>>
> = {
  jest: new Set(['concurrent', 'failing', 'only', 'skip']),
  vitest: new Set(['concurrent', 'fails', 'only', 'skip']),
  playwright: new Set(['fail', 'fixme', 'only', 'skip']),
  'node-test': new Set(['only', 'skip']),
  unknown: new Set([
    'concurrent',
    'fail',
    'fails',
    'failing',
    'fixme',
    'only',
    'skip',
  ]),
};
const curriedTestRegistrationModifiers: Readonly<
  Record<Framework, ReadonlySet<string>>
> = {
  jest: new Set(['each']),
  vitest: new Set(['each', 'runIf', 'skipIf']),
  playwright: new Set(),
  'node-test': new Set(),
  unknown: new Set(['each', 'runIf', 'skipIf']),
};

interface FrameworkBindings {
  readonly tests: ReadonlySet<string>;
  readonly suites: ReadonlySet<string>;
}

type LocalFunction = ts.FunctionLikeDeclaration;

interface LocalFunctionResolution {
  readonly hasBinding: boolean;
  readonly callback?: LocalFunction;
}

function scriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function inferFramework(sourceFile: ts.SourceFile): Framework {
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      if (!hasRuntimeImportBindings(statement.importClause)) continue;

      const framework = frameworkModules[statement.moduleSpecifier.text];
      if (framework) return framework;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const moduleName = staticRequireModule(declaration.initializer);
        const framework = moduleName ? frameworkModules[moduleName] : undefined;
        if (framework) return framework;
      }
    }
  }

  return 'unknown';
}

function hasRuntimeImportBindings(
  importClause: ts.ImportClause | undefined,
): boolean {
  if (!importClause || importClause.isTypeOnly) return false;
  if (importClause.name) return true;
  const bindings = importClause.namedBindings;
  if (!bindings) return false;
  if (ts.isNamespaceImport(bindings)) return true;
  return bindings.elements.some((element) => !element.isTypeOnly);
}

function testName(call: ts.CallExpression): string | undefined {
  const name = call.arguments[0];
  if (!name) return undefined;
  if (ts.isStringLiteralLike(name)) return name.text;
  return ts.isTemplateExpression(name) ? name.getText() : undefined;
}

export function extractTests(filePath: string): TestCase[] {
  return [...extractTestsWithDiagnostics(filePath).tests];
}

export function extractTestsWithDiagnostics(
  filePath: string,
): ExtractionResult {
  const absolutePath = resolve(filePath);
  const sourceFile = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    scriptKind(absolutePath),
  );
  const framework = inferFramework(sourceFile);
  const frameworkBindings = extractFrameworkBindings(sourceFile);
  const nativeAssertionBindings = extractNativeAssertionBindings(sourceFile);
  const expectBindings = extractExpectBindings(sourceFile, framework);
  const tests: TestCase[] = [];
  const suiteCallbacks = new Set<ts.Node>();
  const reachableFunctions = new Set<ts.Node>();
  const visitedFunctions = new Set<ts.Node>();

  function collectSuiteCallbacks(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      isDescribeInvocation(node, sourceFile, frameworkBindings)
    ) {
      const callback = testCallbackFor(node, sourceFile);
      if (callback) suiteCallbacks.add(callback);
    }
    ts.forEachChild(node, collectSuiteCallbacks);
  }

  collectSuiteCallbacks(sourceFile);

  function visit(node: ts.Node): void {
    if (ts.isFunctionLike(node)) {
      if (
        !suiteCallbacks.has(node) &&
        !isImmediatelyInvokedFunction(node) &&
        !reachableFunctions.has(node) &&
        !visitedFunctions.has(node)
      ) {
        return;
      }
      if (visitedFunctions.has(node)) return;
      visitedFunctions.add(node);
    }

    if (ts.isCallExpression(node)) {
      const name = testName(node);
      const callback = testCallbackFor(node, sourceFile);

      if (
        isTestInvocation(node, sourceFile, frameworkBindings, framework) &&
        name &&
        callback
      ) {
        const scopedNativeAssertionBindings = visibleNativeAssertionBindingsAt(
          callback.body,
          nativeAssertionBindings,
        );
        const scopedExpectBindings = expectBindings.filter(
          (binding) => !isShadowedAtNode(callback.body, binding),
        );
        tests.push({
          filePath: absolutePath,
          name: [...suiteNames(node, sourceFile, frameworkBindings), name].join(
            ' > ',
          ),
          framework,
          type: framework === 'playwright' ? 'e2e' : 'unknown',
          line:
            sourceFile.getLineAndCharacterOfPosition(
              callback.getStart(sourceFile),
            ).line + 1,
          source: callback.getText(sourceFile),
          body: callback.body.getText(sourceFile),
          ...(scopedNativeAssertionBindings.length > 0
            ? { nativeAssertionBindings: scopedNativeAssertionBindings }
            : {}),
          expectBindings: scopedExpectBindings,
          analysisContext: {
            source: sourceFile.text,
            callbackStart: callback.getStart(sourceFile),
          },
        });
      }

      const invokedHelper = localFunctionForCall(node);
      if (invokedHelper) {
        reachableFunctions.add(invokedHelper);
        visit(invokedHelper);
      }
    }

    ts.forEachChild(node, visit);
  }

  function localFunctionForCall(
    call: ts.CallExpression,
  ): LocalFunction | undefined {
    if (!ts.isIdentifier(call.expression)) return undefined;
    const name = call.expression.text;
    let current: ts.Node | undefined = call.parent;

    while (current) {
      if (ts.isBlock(current) || ts.isSourceFile(current)) {
        const resolution = localFunctionInScope(current, name);
        if (resolution.hasBinding) {
          return resolution.callback &&
            !hasPotentialWriteInScope(current, name, resolution.callback, call)
            ? resolution.callback
            : undefined;
        }
      }
      if (introducesFunctionBinding(current, name)) return undefined;
      current = current.parent;
    }

    return undefined;
  }

  visit(sourceFile);
  const parseDiagnostics = (
    sourceFile as ts.SourceFile & {
      readonly parseDiagnostics: readonly ts.DiagnosticWithLocation[];
    }
  ).parseDiagnostics;
  const diagnostics: ParserDiagnostic[] = parseDiagnostics.map(
    (diagnostic) => ({
      filePath: absolutePath,
      line:
        sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line +
        1,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
    }),
  );
  return { tests, diagnostics };
}

function extractExpectBindings(
  sourceFile: ts.SourceFile,
  framework: Framework,
): string[] {
  const bindings =
    extractStaticNamedBindings(sourceFile, matcherFrameworkModules).get(
      'expect',
    ) ?? new Set<string>();
  const recognizedBindings = [...bindings].filter(
    (binding) => !hasAssignmentToName(sourceFile, binding),
  );
  if (framework !== 'node-test' && !hasTopLevelBinding(sourceFile, 'expect')) {
    recognizedBindings.push('expect');
  }
  return recognizedBindings;
}

function importedBindingName(
  propertyName: ts.PropertyName | undefined,
  localName: string,
): string | undefined {
  if (!propertyName) return localName;
  return ts.isIdentifier(propertyName) || ts.isStringLiteralLike(propertyName)
    ? propertyName.text
    : undefined;
}

function extractStaticNamedBindings(
  sourceFile: ts.SourceFile,
  modules: ReadonlySet<string>,
): Map<string, Set<string>> {
  const bindings = new Map<string, Set<string>>();

  function add(importedName: string | undefined, localName: string): void {
    if (!importedName) return;
    const localNames = bindings.get(importedName) ?? new Set<string>();
    localNames.add(localName);
    bindings.set(importedName, localNames);
  }

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const moduleName = statement.moduleSpecifier.text;
      if (!modules.has(moduleName)) continue;
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly) continue;
      if (moduleName === 'node:test' && clause.name)
        add('test', clause.name.text);
      const namedBindings = clause.namedBindings;
      if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

      for (const element of namedBindings.elements) {
        if (element.isTypeOnly) continue;
        add(
          importedBindingName(element.propertyName, element.name.text),
          element.name.text,
        );
      }
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const moduleName = staticRequireModule(declaration.initializer);
      if (!moduleName || !modules.has(moduleName)) continue;
      if (moduleName === 'node:test' && ts.isIdentifier(declaration.name)) {
        add('test', declaration.name.text);
        continue;
      }
      if (!ts.isObjectBindingPattern(declaration.name)) continue;

      for (const element of declaration.name.elements) {
        if (
          element.dotDotDotToken ||
          element.initializer ||
          !ts.isIdentifier(element.name)
        ) {
          continue;
        }
        add(
          importedBindingName(element.propertyName, element.name.text),
          element.name.text,
        );
      }
    }
  }

  return bindings;
}

function extractFrameworkBindings(
  sourceFile: ts.SourceFile,
): FrameworkBindings {
  const importedBindings = extractStaticNamedBindings(
    sourceFile,
    supportedFrameworkModules,
  );
  const tests = new Set([
    ...(importedBindings.get('test') ?? []),
    ...(importedBindings.get('it') ?? []),
  ]);
  const suites = importedBindings.get('describe') ?? new Set<string>();

  return {
    tests: new Set(
      [...tests].filter((name) => !hasAssignmentToName(sourceFile, name)),
    ),
    suites: new Set(
      [...suites].filter((name) => !hasAssignmentToName(sourceFile, name)),
    ),
  };
}

function isTestInvocation(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  bindings: FrameworkBindings,
  framework: Framework,
): boolean {
  const registration = testRegistrationReference(call.expression, framework);
  return Boolean(
    registration &&
    isFrameworkReference(registration, call, sourceFile, bindings.tests, [
      'test',
      'it',
    ]),
  );
}

function testRegistrationReference(
  expression: ts.Expression,
  framework: Framework,
): ts.Identifier | undefined {
  if (ts.isIdentifier(expression)) return expression;

  if (ts.isPropertyAccessExpression(expression)) {
    return testRegistrationModifiers[framework].has(expression.name.text) ||
      curriedTestRegistrationModifiers[framework].has(expression.name.text)
      ? testRegistrationReference(expression.expression, framework)
      : undefined;
  }

  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    curriedTestRegistrationModifiers[framework].has(
      expression.expression.name.text,
    )
  ) {
    return testRegistrationReference(
      expression.expression.expression,
      framework,
    );
  }

  return undefined;
}

function isFrameworkReference(
  identifier: ts.Identifier,
  useSite: ts.Node,
  sourceFile: ts.SourceFile,
  bindings: ReadonlySet<string>,
  globalNames: readonly string[],
): boolean {
  const name = identifier.text;
  const isBoundFrameworkName =
    bindings.has(name) ||
    (!hasTopLevelBinding(sourceFile, name) && globalNames.includes(name));
  return isBoundFrameworkName && !isShadowedAtNode(useSite, name);
}

function suiteNames(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  bindings: FrameworkBindings,
): string[] {
  const names: string[] = [];
  let current = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      isDescribeInvocation(current, sourceFile, bindings)
    ) {
      const name = testName(current);
      if (name) names.unshift(name);
    }
    current = current.parent;
  }
  return names;
}

function isDescribeInvocation(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  bindings: FrameworkBindings,
): boolean {
  const reference = suiteRegistrationReference(call.expression);
  if (!reference) return false;

  if (reference.kind === 'describe') {
    return isFrameworkReference(
      reference.root,
      call,
      sourceFile,
      bindings.suites,
      ['describe'],
    );
  }
  return isFrameworkReference(
    reference.root,
    call,
    sourceFile,
    bindings.tests,
    ['test', 'it'],
  );
}

function suiteRegistrationReference(
  expression: ts.Expression,
):
  | { readonly root: ts.Identifier; readonly kind: 'describe' | 'test' }
  | undefined {
  if (ts.isIdentifier(expression))
    return { root: expression, kind: 'describe' };

  if (ts.isPropertyAccessExpression(expression)) {
    if (
      expression.name.text === 'describe' &&
      ts.isIdentifier(expression.expression)
    ) {
      return { root: expression.expression, kind: 'test' };
    }
    if (suiteRegistrationModifiers.has(expression.name.text)) {
      return suiteRegistrationReference(expression.expression);
    }
  }

  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    curriedSuiteRegistrationModifiers.has(expression.expression.name.text)
  ) {
    return suiteRegistrationReference(expression.expression.expression);
  }

  return undefined;
}

const suiteRegistrationModifiers = new Set([
  'concurrent',
  'only',
  'sequential',
  'skip',
]);
const curriedSuiteRegistrationModifiers = new Set(['each', 'runIf', 'skipIf']);

function localFunctionInScope(
  scope: ts.Block | ts.SourceFile,
  name: string,
): LocalFunctionResolution {
  let hasBinding = false;
  const callbacks: LocalFunction[] = [];

  for (const statement of scope.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
      hasBinding = true;
      if (statement.body) callbacks.push(statement as LocalFunction);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!bindingNameContains(declaration.name, name)) continue;
        hasBinding = true;
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === name &&
          declaration.initializer
        ) {
          const initializer = unwrapExpression(declaration.initializer);
          if (
            (ts.isArrowFunction(initializer) ||
              ts.isFunctionExpression(initializer)) &&
            initializer.body
          ) {
            callbacks.push(initializer);
          }
        }
      }
      continue;
    }

    if (
      (ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) &&
      statement.name?.text === name
    ) {
      hasBinding = true;
      continue;
    }

    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause &&
      importClauseBindsName(statement.importClause, name)
    ) {
      hasBinding = true;
    }
  }

  if (!hasBinding || callbacks.length !== 1) return { hasBinding };
  return { hasBinding: true, callback: callbacks[0] };
}

function importClauseBindsName(clause: ts.ImportClause, name: string): boolean {
  if (clause.isTypeOnly) return false;
  if (clause.name?.text === name) return true;
  const namedBindings = clause.namedBindings;
  if (!namedBindings) return false;
  if (ts.isNamespaceImport(namedBindings))
    return namedBindings.name.text === name;
  return namedBindings.elements.some(
    (element) => !element.isTypeOnly && element.name.text === name,
  );
}

function bindingNameContains(binding: ts.BindingName, name: string): boolean {
  if (ts.isIdentifier(binding)) return binding.text === name;
  return binding.elements.some((element) =>
    ts.isBindingElement(element)
      ? bindingNameContains(element.name, name)
      : false,
  );
}

function introducesFunctionBinding(node: ts.Node, name: string): boolean {
  if (ts.isFunctionLike(node)) {
    return (
      node.parameters.some((parameter) =>
        bindingNameContains(parameter.name, name),
      ) ||
      (ts.isFunctionExpression(node) && node.name?.text === name) ||
      ('body' in node &&
        node.body !== undefined &&
        ts.isBlock(node.body) &&
        hasFunctionScopedVar(node.body, name))
    );
  }

  if (
    ts.isCatchClause(node) &&
    node.variableDeclaration &&
    bindingNameContains(node.variableDeclaration.name, name)
  ) {
    return true;
  }

  if (
    (ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node)) &&
    node.initializer &&
    ts.isVariableDeclarationList(node.initializer) &&
    (node.initializer.flags & ts.NodeFlags.BlockScoped) !== 0 &&
    node.initializer.declarations.some((declaration) =>
      bindingNameContains(declaration.name, name),
    )
  ) {
    return true;
  }

  return ts.isClassExpression(node) && node.name?.text === name;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isImmediatelyInvokedFunction(node: ts.Node): boolean {
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return false;

  let current: ts.Expression = node;
  while (
    current.parent &&
    (ts.isParenthesizedExpression(current.parent) ||
      ts.isAsExpression(current.parent) ||
      ts.isTypeAssertionExpression(current.parent) ||
      ts.isSatisfiesExpression(current.parent) ||
      ts.isNonNullExpression(current.parent)) &&
    current.parent.expression === current
  ) {
    current = current.parent;
  }

  return (
    ts.isCallExpression(current.parent) && current.parent.expression === current
  );
}
