import * as ts from 'typescript';
import {
  assignmentTargetContains,
  hasFunctionScopedVar,
  hasPotentialWriteInScope,
  isAssignmentOperator,
} from './scope-analysis.js';

type InlineTestCallback = ts.ArrowFunction | ts.FunctionExpression;
type TestCallback =
  | InlineTestCallback
  | (ts.FunctionDeclaration & {
      readonly body: ts.Block;
    });

export function testCallbackFor(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
): TestCallback | undefined {
  for (const argument of call.arguments.slice(1)) {
    const expression = unwrapExpression(argument);
    if (isTestCallback(expression)) return expression;
    if (!ts.isIdentifier(expression)) continue;

    const callback = resolveLocalCallback(expression.text, call, sourceFile);
    if (callback) return callback;
  }
  return undefined;
}

function resolveLocalCallback(
  name: string,
  useSite: ts.Node,
  sourceFile: ts.SourceFile,
): TestCallback | undefined {
  let current: ts.Node | undefined = useSite;

  while (current) {
    if (ts.isBlock(current) || ts.isSourceFile(current)) {
      const resolution = callbackInScope(current, name);
      if (resolution.hasBinding) {
        return resolution.callback &&
          !hasPotentialWriteInScope(current, name, resolution.callback)
          ? resolution.callback
          : undefined;
      }
    }

    if (
      ts.isFunctionLike(current) &&
      (current.parameters.some((parameter) =>
        bindingContains(parameter.name, name),
      ) ||
        ('body' in current &&
          current.body !== undefined &&
          ts.isBlock(current.body) &&
          hasFunctionScopedVar(current.body, name)) ||
        ((ts.isFunctionExpression(current) ||
          ts.isFunctionDeclaration(current)) &&
          current.name?.text === name))
    ) {
      return undefined;
    }

    if (
      ts.isCatchClause(current) &&
      current.variableDeclaration &&
      bindingContains(current.variableDeclaration.name, name)
    ) {
      return undefined;
    }

    if (
      (ts.isForStatement(current) ||
        ts.isForInStatement(current) ||
        ts.isForOfStatement(current)) &&
      current.initializer &&
      loopInitializerBindsName(current.initializer, name)
    ) {
      return undefined;
    }

    if (current === sourceFile) return undefined;
    current = current.parent;
  }

  return undefined;
}

function loopInitializerBindsName(
  initializer: ts.ForInitializer,
  name: string,
): boolean {
  if (ts.isVariableDeclarationList(initializer)) {
    return initializer.declarations.some((declaration) =>
      bindingContains(declaration.name, name),
    );
  }
  if (ts.isIdentifier(initializer)) return initializer.text === name;
  if (
    ts.isBinaryExpression(initializer) &&
    isAssignmentOperator(initializer.operatorToken.kind)
  ) {
    return assignmentTargetContains(initializer.left, name);
  }
  return assignmentTargetContains(initializer, name);
}

function callbackInScope(
  scope: ts.Block | ts.SourceFile,
  name: string,
): { readonly hasBinding: boolean; readonly callback?: TestCallback } {
  const declarations = scope.statements;
  const callbacks: TestCallback[] = [];
  let hasBinding = false;

  for (const statement of declarations) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!bindingContains(declaration.name, name)) continue;
        hasBinding = true;
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === name &&
          declaration.initializer
        ) {
          const initializer = unwrapExpression(declaration.initializer);
          if (isTestCallback(initializer)) callbacks.push(initializer);
        }
      }
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
      hasBinding = true;
      if (statement.body) {
        callbacks.push(
          statement as ts.FunctionDeclaration & {
            readonly body: ts.Block;
          },
        );
      }
      continue;
    }

    if (ts.isImportDeclaration(statement)) {
      if (importClauseContains(statement.importClause, name)) hasBinding = true;
      continue;
    }

    if (
      ts.isImportEqualsDeclaration(statement) &&
      statement.name.text === name
    ) {
      hasBinding = true;
      continue;
    }

    if (
      ((ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) &&
        statement.name?.text === name) ||
      (ts.isModuleDeclaration(statement) &&
        ts.isIdentifier(statement.name) &&
        statement.name.text === name)
    ) {
      hasBinding = true;
    }
  }

  if (!hasBinding || callbacks.length !== 1) return { hasBinding };
  return { hasBinding: true, callback: callbacks[0] };
}

function importClauseContains(
  clause: ts.ImportClause | undefined,
  name: string,
): boolean {
  if (!clause || clause.isTypeOnly) return false;
  if (clause.name?.text === name) return true;
  const bindings = clause.namedBindings;
  if (!bindings) return false;
  if (ts.isNamespaceImport(bindings)) return bindings.name.text === name;
  return bindings.elements.some(
    (element) => !element.isTypeOnly && element.name.text === name,
  );
}

function isTestCallback(
  expression: ts.Expression,
): expression is InlineTestCallback {
  return ts.isArrowFunction(expression) || ts.isFunctionExpression(expression);
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

function bindingContains(binding: ts.BindingName, name: string): boolean {
  if (ts.isIdentifier(binding)) return binding.text === name;
  return binding.elements.some((element) =>
    ts.isBindingElement(element) ? bindingContains(element.name, name) : false,
  );
}
