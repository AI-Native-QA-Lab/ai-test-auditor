import * as ts from 'typescript';
import {
  hasAssignmentToName,
  isAssignmentOperator,
  isShadowedAtNode,
} from './scope-analysis.js';
import { staticRequireModule } from './static-require.js';
import type { NativeAssertionBinding } from './types.js';

const nodeAssertionMethods = new Set([
  'assert',
  'ok',
  'equal',
  'notEqual',
  'deepEqual',
  'notDeepEqual',
  'strictEqual',
  'notStrictEqual',
  'deepStrictEqual',
  'notDeepStrictEqual',
  'partialDeepStrictEqual',
  'match',
  'doesNotMatch',
  'ifError',
  'throws',
  'doesNotThrow',
  'rejects',
  'doesNotReject',
  'fail',
]);

const nodeComparisonMethods = new Set([
  'equal',
  'notEqual',
  'deepEqual',
  'notDeepEqual',
  'strictEqual',
  'notStrictEqual',
  'deepStrictEqual',
  'notDeepStrictEqual',
  'partialDeepStrictEqual',
  'match',
  'doesNotMatch',
]);

const nodeAssertModules = new Set(['node:assert', 'node:assert/strict']);

export function extractNativeAssertionBindings(
  sourceFile: ts.SourceFile,
): NativeAssertionBinding[] {
  const bindings = new Map<string, NativeAssertionBinding>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !nodeAssertModules.has(statement.moduleSpecifier.text)
      ) {
        continue;
      }

      addImportBindings(
        bindings,
        statement.importClause,
        statement.moduleSpecifier.text,
      );
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;

    for (const declaration of statement.declarationList.declarations) {
      const moduleName = staticRequireModule(declaration.initializer);
      if (!moduleName || !nodeAssertModules.has(moduleName)) continue;

      if (ts.isIdentifier(declaration.name)) {
        addNamespaceBinding(bindings, declaration.name.text);
      } else if (ts.isObjectBindingPattern(declaration.name)) {
        addRequiredNamedBindings(bindings, declaration.name, moduleName);
      }
    }
  }

  return [...bindings.values()].filter(
    (binding) =>
      !hasAssignmentToName(sourceFile, binding.localName) &&
      (binding.kind !== 'namespace' ||
        !hasNamespaceAssertionMethodReplacement(sourceFile, binding.localName)),
  );
}

export function visibleNativeAssertionBindingsAt(
  node: ts.Node,
  bindings: readonly NativeAssertionBinding[],
): NativeAssertionBinding[] {
  return bindings.filter(
    (binding) => !isShadowedAtNode(node, binding.localName),
  );
}

function addImportBindings(
  bindings: Map<string, NativeAssertionBinding>,
  importClause: ts.ImportClause | undefined,
  moduleName: string,
): void {
  if (!importClause || importClause.isTypeOnly) return;

  if (importClause.name) addNamespaceBinding(bindings, importClause.name.text);

  const namedBindings = importClause.namedBindings;
  if (!namedBindings) return;

  if (ts.isNamespaceImport(namedBindings)) {
    addNamespaceBinding(bindings, namedBindings.name.text);
    return;
  }

  for (const element of namedBindings.elements) {
    if (element.isTypeOnly) continue;

    const importedName = element.propertyName
      ? ts.isIdentifier(element.propertyName) ||
        ts.isStringLiteralLike(element.propertyName)
        ? element.propertyName.text
        : element.name.text
      : element.name.text;
    if (importedName === 'default' || importedName === 'strict') {
      if (importedName === 'strict' && moduleName !== 'node:assert') continue;
      addNamespaceBinding(bindings, element.name.text);
    } else {
      addMethodBinding(bindings, element.name.text, importedName);
    }
  }
}

function addRequiredNamedBindings(
  bindings: Map<string, NativeAssertionBinding>,
  pattern: ts.ObjectBindingPattern,
  moduleName: string,
): void {
  for (const element of pattern.elements) {
    if (
      element.dotDotDotToken ||
      element.initializer ||
      !ts.isIdentifier(element.name)
    ) {
      continue;
    }

    const importedName = element.propertyName
      ? ts.isIdentifier(element.propertyName) ||
        ts.isStringLiteral(element.propertyName)
        ? element.propertyName.text
        : undefined
      : element.name.text;
    if (importedName === 'strict' && moduleName === 'node:assert') {
      addNamespaceBinding(bindings, element.name.text);
    } else if (importedName) {
      addMethodBinding(bindings, element.name.text, importedName);
    }
  }
}

function addNamespaceBinding(
  bindings: Map<string, NativeAssertionBinding>,
  localName: string,
): void {
  bindings.set(localName, { localName, kind: 'namespace' });
}

function addMethodBinding(
  bindings: Map<string, NativeAssertionBinding>,
  localName: string,
  methodName: string,
): void {
  if (!nodeAssertionMethods.has(methodName)) return;

  bindings.set(localName, { localName, kind: 'method', methodName });
}

export function nodeAssertionName(
  call: ts.CallExpression,
  bindings: readonly NativeAssertionBinding[] = [],
): string | undefined {
  if (ts.isIdentifier(call.expression)) {
    const localName = call.expression.text;
    if (isShadowedAtNode(call, localName)) return undefined;
    const binding = bindings.find(
      (candidate) => candidate.localName === localName,
    );
    if (binding?.kind === 'method') return binding.methodName;
    if (binding?.kind === 'namespace') return 'assert';
    return undefined;
  }

  if (!ts.isPropertyAccessExpression(call.expression)) return undefined;
  if (!ts.isIdentifier(call.expression.expression)) return undefined;

  const namespaceName = call.expression.expression.text;
  if (isShadowedAtNode(call, namespaceName)) return undefined;
  const isBoundNamespace = bindings.some(
    (binding) =>
      binding.localName === namespaceName && binding.kind === 'namespace',
  );
  if (!isBoundNamespace) return undefined;

  return nodeAssertionMethods.has(call.expression.name.text)
    ? call.expression.name.text
    : undefined;
}

function hasNamespaceAssertionMethodReplacement(
  sourceFile: ts.SourceFile,
  localName: string,
): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (found) return;

    if (
      ts.isBinaryExpression(node) &&
      isAssignmentOperator(node.operatorToken.kind) &&
      isNamespaceAssertionMethod(node.left, localName) &&
      !isShadowedAtNode(node.left, localName)
    ) {
      found = true;
      return;
    }

    if (
      ts.isDeleteExpression(node) &&
      isNamespaceAssertionMethod(node.expression, localName) &&
      !isShadowedAtNode(node.expression, localName)
    ) {
      found = true;
      return;
    }

    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken) &&
      isNamespaceAssertionMethod(node.operand, localName) &&
      !isShadowedAtNode(node.operand, localName)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function isNamespaceAssertionMethod(
  target: ts.Expression,
  localName: string,
): boolean {
  const unwrapped = ts.isParenthesizedExpression(target)
    ? target.expression
    : target;
  if (
    ts.isPropertyAccessExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression) &&
    unwrapped.expression.text === localName
  ) {
    return nodeAssertionMethods.has(unwrapped.name.text);
  }
  if (
    ts.isElementAccessExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression) &&
    unwrapped.expression.text === localName
  ) {
    const property = unwrapped.argumentExpression;
    return (
      !property ||
      !ts.isStringLiteralLike(property) ||
      nodeAssertionMethods.has(property.text)
    );
  }
  return false;
}

export function isNodeComparisonMethod(methodName: string): boolean {
  return nodeComparisonMethods.has(methodName);
}
