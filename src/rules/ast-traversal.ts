import * as ts from 'typescript';
import {
  hasPotentialWriteInScope,
  hasFunctionScopedVar,
  hasTopLevelBinding,
  isShadowedAtNode,
} from '../core/scope-analysis.js';
import { resolveLocalCallback } from '../core/callback-resolution.js';
import type { Framework } from '../core/types.js';

type FunctionNode =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

const ARRAY_CALLBACK_METHODS = new Set([
  'every',
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'flatMap',
  'forEach',
  'map',
  'reduce',
  'reduceRight',
  'some',
]);

const PROMISE_CALLBACK_METHODS = new Set(['catch', 'finally', 'then']);

interface ExecutableTraversalOptions {
  readonly expectBindings?: readonly string[];
  readonly framework?: Framework;
  readonly rootCallbackStart?: number;
}

export function visitExecutableNodes(
  root: ts.Node,
  predicate: (node: ts.Node) => void,
  options: ExecutableTraversalOptions = {},
): ts.Node[] {
  const rootCallback = testCallbackIn(root, options.rootCallbackStart);
  if (options.rootCallbackStart !== undefined && !rootCallback) return [];
  const traversalRoot = rootCallback ?? root;
  const reachableHelperCache = new WeakMap<
    ts.Node,
    ReadonlySet<FunctionNode>
  >();
  const visitedFunctions = new Set<FunctionNode>();
  const uncertainCallbacks: ts.Node[] = [];

  function visit(node: ts.Node): void {
    if (isFunctionNode(node)) {
      if (visitedFunctions.has(node)) return;
      visitedFunctions.add(node);
    }
    predicate(node);

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const helper = resolveLocalCallback(
        node.expression.text,
        node,
        node.getSourceFile(),
      );
      if (helper && helper !== rootCallback) visit(helper);
    }

    ts.forEachChild(node, (child) => {
      if (
        isFunctionNode(child) &&
        child !== rootCallback &&
        !isExecutableCallback(child, rootCallback, options) &&
        !isReachableLocalHelper(child, reachableHelperCache)
      ) {
        if (isUncertainArrayCallback(child)) uncertainCallbacks.push(child);
        return;
      }
      visit(child);
    });
  }

  visit(traversalRoot);
  return uncertainCallbacks;
}

function isFunctionNode(node: ts.Node): node is FunctionNode {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function testCallbackIn(
  node: ts.Node,
  callbackStart?: number,
): FunctionNode | undefined {
  if (ts.isSourceFile(node)) {
    if (callbackStart !== undefined) {
      const sourceFile = node;
      let found: FunctionNode | undefined;
      function findCallback(current: ts.Node): void {
        if (found) return;
        if (
          isFunctionNode(current) &&
          current.getStart(sourceFile) === callbackStart
        ) {
          found = current;
          return;
        }
        ts.forEachChild(current, findCallback);
      }
      findCallback(node);
      return found;
    }

    for (const statement of node.statements) {
      const callback = firstFunctionLike(statement);
      if (callback) return callback;
    }
  }
  return undefined;
}

function firstFunctionLike(node: ts.Node): FunctionNode | undefined {
  if (isFunctionNode(node)) return node;
  let found: FunctionNode | undefined;
  ts.forEachChild(node, (child) => {
    if (found || isFunctionNode(child)) {
      if (!found && isFunctionNode(child)) found = child;
      return;
    }
    found = firstFunctionLike(child);
  });
  return found;
}

function isExecutableCallback(
  node: FunctionNode,
  rootCallback: FunctionNode | undefined,
  options: ExecutableTraversalOptions,
): boolean {
  let current: ts.Node = node;
  while (ts.isParenthesizedExpression(current.parent)) {
    current = current.parent;
  }

  const parent = current.parent;
  if (!ts.isCallExpression(parent)) return false;
  if (parent.expression === current) return true;
  if (
    (!ts.isArrowFunction(current) && !ts.isFunctionExpression(current)) ||
    !parent.arguments.includes(current)
  ) {
    return false;
  }

  if (
    options.framework === 'playwright' &&
    isToPassCallback(current, options.expectBindings)
  ) {
    return true;
  }

  if (isFastCheckPropertyCallback(current)) return true;

  if (!ts.isPropertyAccessExpression(parent.expression)) return false;

  const methodName = parent.expression.name.text;
  if (ARRAY_CALLBACK_METHODS.has(methodName)) {
    return isGuaranteedArrayCallback(current, parent, methodName);
  }
  if (PROMISE_CALLBACK_METHODS.has(methodName)) {
    return isGuaranteedPromiseCallback(
      current,
      parent,
      methodName,
      rootCallback,
    );
  }
  if (methodName === 'poll') {
    return (
      (options.framework === 'vitest' || options.framework === 'playwright') &&
      parent.arguments[0] === current &&
      isExpectReference(parent.expression.expression, options.expectBindings)
    );
  }

  return false;
}

function isFastCheckPropertyCallback(callback: ts.Node): boolean {
  if (
    (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) ||
    !ts.isCallExpression(callback.parent) ||
    callback.parent.arguments.at(-1) !== callback
  ) {
    return false;
  }

  const propertyCall = callback.parent;
  if (
    !ts.isPropertyAccessExpression(propertyCall.expression) ||
    propertyCall.expression.name.text !== 'property' ||
    !ts.isIdentifier(propertyCall.expression.expression)
  ) {
    return false;
  }

  const fastCheckName = propertyCall.expression.expression.text;
  const assertCall = propertyCall.parent;
  if (
    !ts.isCallExpression(assertCall) ||
    assertCall.arguments[0] !== propertyCall ||
    !ts.isPropertyAccessExpression(assertCall.expression) ||
    assertCall.expression.name.text !== 'assert' ||
    !ts.isIdentifier(assertCall.expression.expression) ||
    assertCall.expression.expression.text !== fastCheckName
  ) {
    return false;
  }

  const sourceFile = callback.getSourceFile();
  if (
    !isFastCheckImport(sourceFile, fastCheckName) ||
    isShadowedAtNode(propertyCall.expression.expression, fastCheckName) ||
    hasPotentialWriteInScope(sourceFile, fastCheckName, assertCall, assertCall)
  ) {
    return false;
  }

  return hasPositiveFastCheckRunCount(assertCall);
}

function isFastCheckImport(
  sourceFile: ts.SourceFile,
  localName: string,
): boolean {
  return sourceFile.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== 'fast-check' ||
      !statement.importClause ||
      statement.importClause.isTypeOnly
    ) {
      return false;
    }

    const clause = statement.importClause;
    return (
      clause.name?.text === localName ||
      (clause.namedBindings !== undefined &&
        ts.isNamespaceImport(clause.namedBindings) &&
        clause.namedBindings.name.text === localName)
    );
  });
}

function hasPositiveFastCheckRunCount(assertCall: ts.CallExpression): boolean {
  if (assertCall.arguments.length === 1) return true;
  if (assertCall.arguments.length !== 2) return false;

  const options = unwrapExpression(assertCall.arguments[1]!);
  if (!ts.isObjectLiteralExpression(options)) return false;

  if (options.properties.some(ts.isSpreadAssignment)) return false;

  const runCountProperties = options.properties.filter((property) => {
    if (
      !('name' in property) ||
      !property.name ||
      ts.isComputedPropertyName(property.name)
    ) {
      return false;
    }
    return staticPropertyName(property.name) === 'numRuns';
  });
  if (runCountProperties.length > 1) return false;
  if (
    options.properties.some(
      (property) =>
        'name' in property &&
        property.name !== undefined &&
        ts.isComputedPropertyName(property.name),
    )
  ) {
    return false;
  }
  if (runCountProperties.length === 0) return true;

  const property = runCountProperties[0];
  if (!property || !ts.isPropertyAssignment(property)) return false;
  const value = unwrapExpression(property.initializer);
  if (!ts.isNumericLiteral(value)) return false;
  const runCount = Number(value.text);
  return Number.isSafeInteger(runCount) && runCount > 0;
}

function staticPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return undefined;
}

function isUncertainArrayCallback(callback: FunctionNode): boolean {
  let current: ts.Node = callback;
  while (ts.isParenthesizedExpression(current.parent)) current = current.parent;
  const call = current.parent;
  if (
    !ts.isCallExpression(call) ||
    call.arguments[0] !== current ||
    !ts.isPropertyAccessExpression(call.expression) ||
    !ARRAY_CALLBACK_METHODS.has(call.expression.name.text)
  ) {
    return false;
  }

  const receiver = unwrapExpression(call.expression.expression);
  if (!ts.isArrayLiteralExpression(receiver)) return true;
  return receiver.elements.some((element) => !ts.isOmittedExpression(element));
}

function isGuaranteedArrayCallback(
  callback: ts.Node,
  call: ts.CallExpression,
  methodName: string,
): boolean {
  if (call.arguments[0] !== callback) return false;

  if (!ts.isPropertyAccessExpression(call.expression)) return false;
  const receiver = unwrapExpression(call.expression.expression);
  if (!ts.isArrayLiteralExpression(receiver)) return false;
  const definitelyPresentElements = receiver.elements.filter(
    (element) =>
      !ts.isOmittedExpression(element) && !ts.isSpreadElement(element),
  ).length;

  if (methodName === 'reduce' || methodName === 'reduceRight') {
    return call.arguments.length > 1
      ? definitelyPresentElements > 0
      : definitelyPresentElements > 1;
  }

  return definitelyPresentElements > 0;
}

function isGuaranteedPromiseCallback(
  callback: ts.Node,
  call: ts.CallExpression,
  methodName: string,
  rootCallback: FunctionNode | undefined,
): boolean {
  const callbackIndex = call.arguments.indexOf(callback as ts.Expression);
  if (!ts.isPropertyAccessExpression(call.expression)) return false;
  const receiver = unwrapExpression(call.expression.expression);
  const settlement = ts.isCallExpression(receiver)
    ? promiseSettlement(receiver)
    : undefined;
  if (!settlement || settlement === 'unknown') return false;

  const callbackPositionMatches =
    (methodName === 'then' &&
      ((settlement === 'fulfilled' && callbackIndex === 0) ||
        (settlement === 'rejected' && callbackIndex === 1))) ||
    (methodName === 'catch' &&
      settlement === 'rejected' &&
      callbackIndex === 0) ||
    (methodName === 'finally' && callbackIndex === 0);

  return (
    callbackPositionMatches && isAwaitedOrReturnedByTest(call, rootCallback)
  );
}

type PromiseSettlement = 'fulfilled' | 'rejected' | 'unknown';

function promiseSettlement(
  call: ts.CallExpression,
): PromiseSettlement | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) return undefined;

  const methodName = call.expression.name.text;
  const receiver = unwrapExpression(call.expression.expression);
  if (
    ts.isIdentifier(receiver) &&
    receiver.text === 'Promise' &&
    !hasTopLevelBinding(call.getSourceFile(), 'Promise') &&
    !isShadowedAtNode(receiver, 'Promise')
  ) {
    const factoryName = methodName;
    if (
      factoryName === 'resolve' &&
      (call.arguments.length === 0 ||
        (call.arguments.length === 1 && isPrimitiveLiteral(call.arguments[0]!)))
    ) {
      return 'fulfilled';
    }
    if (
      factoryName === 'reject' &&
      call.arguments.length === 1 &&
      isPrimitiveLiteral(call.arguments[0]!)
    ) {
      return 'rejected';
    }
    return undefined;
  }

  if (!ts.isCallExpression(receiver)) return undefined;
  const priorSettlement = promiseSettlement(receiver);
  if (!priorSettlement) return undefined;
  if (priorSettlement === 'unknown') return 'unknown';
  if (methodName === 'catch' && priorSettlement === 'fulfilled') {
    return 'fulfilled';
  }

  const callbackIndex =
    methodName === 'then'
      ? priorSettlement === 'fulfilled'
        ? 0
        : 1
      : methodName === 'catch'
        ? priorSettlement === 'rejected'
          ? 0
          : -1
        : methodName === 'finally'
          ? 0
          : -1;
  if (callbackIndex < 0) return undefined;

  const callback = call.arguments[callbackIndex];
  if (!callback || isDefinitelyNonFunction(callback)) return priorSettlement;
  if (!isFunctionNode(callback)) return 'unknown';

  if (methodName === 'finally') {
    return callbackReturnsNormally(callback) ? priorSettlement : 'unknown';
  }
  return callbackReturnsPrimitive(callback) ? 'fulfilled' : 'unknown';
}

function isDefinitelyNonFunction(expression: ts.Expression): boolean {
  if (isPrimitiveLiteral(expression)) return true;
  return (
    ts.isIdentifier(expression) &&
    expression.text === 'undefined' &&
    !hasTopLevelBinding(expression.getSourceFile(), 'undefined') &&
    !isShadowedAtNode(expression, 'undefined')
  );
}

function callbackReturnsNormally(callback: FunctionNode): boolean {
  if (!('body' in callback) || !callback.body) return false;
  if (!ts.isBlock(callback.body))
    return isPrimitiveLiteral(unwrapExpression(callback.body));
  if (callback.body.statements.length === 0) return true;
  if (
    callback.body.statements.length === 1 &&
    ts.isReturnStatement(callback.body.statements[0]!)
  ) {
    const expression = callback.body.statements[0]!.expression;
    return expression === undefined || isPrimitiveLiteral(expression);
  }
  return false;
}

function callbackReturnsPrimitive(callback: FunctionNode): boolean {
  if (!('body' in callback) || !callback.body) return false;
  if (!ts.isBlock(callback.body)) {
    return isPrimitiveLiteral(unwrapExpression(callback.body));
  }
  if (callback.body.statements.length === 0) return true;
  if (
    callback.body.statements.length === 1 &&
    ts.isReturnStatement(callback.body.statements[0]!)
  ) {
    const expression = callback.body.statements[0]!.expression;
    return expression === undefined || isPrimitiveLiteral(expression);
  }
  return false;
}

function isAwaitedOrReturnedByTest(
  call: ts.CallExpression,
  rootCallback: FunctionNode | undefined,
): boolean {
  let current: ts.Expression = call;
  while (true) {
    const parent = current.parent;
    if (
      ts.isPropertyAccessExpression(parent) &&
      parent.expression === current
    ) {
      current = parent;
      continue;
    }
    if (ts.isCallExpression(parent) && parent.expression === current) {
      current = parent;
      continue;
    }
    if (ts.isAwaitExpression(parent) && parent.expression === current) {
      return true;
    }
    if (ts.isReturnStatement(parent) && parent.expression === current) {
      let owner: ts.Node | undefined = parent.parent;
      while (owner && !isFunctionNode(owner)) owner = owner.parent;
      return owner === rootCallback;
    }
    if (
      isFunctionNode(parent) &&
      parent === rootCallback &&
      'body' in parent &&
      parent.body === current
    ) {
      return true;
    }
    return false;
  }
}

function isToPassCallback(
  callback: ts.Node,
  expectBindings: readonly string[] | undefined,
): boolean {
  const factory = callback.parent;
  if (
    !ts.isCallExpression(factory) ||
    factory.arguments[0] !== callback ||
    !isExpectReference(factory.expression, expectBindings)
  ) {
    return false;
  }

  const matcher = factory.parent;
  return (
    ts.isPropertyAccessExpression(matcher) &&
    matcher.expression === factory &&
    matcher.name.text === 'toPass' &&
    ts.isCallExpression(matcher.parent) &&
    matcher.parent.expression === matcher
  );
}

function isExpectReference(
  expression: ts.Expression,
  expectBindings: readonly string[] | undefined,
): boolean {
  if (!ts.isIdentifier(expression)) return false;
  const name = expression.text;
  return (
    (expectBindings === undefined
      ? name === 'expect'
      : expectBindings.includes(name)) && !isShadowedAtNode(expression, name)
  );
}

function isPrimitiveLiteral(expression: ts.Expression): boolean {
  return (
    ts.isStringLiteralLike(expression) ||
    ts.isNumericLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  );
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isReachableLocalHelper(
  node: FunctionNode,
  cache: WeakMap<ts.Node, ReadonlySet<FunctionNode>>,
): boolean {
  const scope = localFunctionScope(node);
  return scope ? reachableLocalHelpers(scope, cache).has(node) : false;
}

function reachableLocalHelpers(
  scope: ts.Node,
  cache: WeakMap<ts.Node, ReadonlySet<FunctionNode>>,
): ReadonlySet<FunctionNode> {
  const cached = cache.get(scope);
  if (cached) return cached;
  if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) return new Set();

  const helpers: FunctionNode[] = [];
  function collectHelpers(node: ts.Node): void {
    if (isFunctionNode(node) && localFunctionScope(node) === scope) {
      helpers.push(node);
      return;
    }
    ts.forEachChild(node, collectHelpers);
  }
  collectHelpers(scope);

  const helpersByName = new Map<string, FunctionNode[]>();
  for (const helper of helpers) {
    const name = localFunctionName(helper);
    if (!name) continue;
    const namedHelpers = helpersByName.get(name) ?? [];
    namedHelpers.push(helper);
    helpersByName.set(name, namedHelpers);
  }

  const reachable = new Set<FunctionNode>();
  for (const helper of helpers) {
    if (callsHelper(scope, undefined, helper, scope, helpersByName)) {
      reachable.add(helper);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const caller of reachable) {
      for (const helper of helpers) {
        if (
          reachable.has(helper) ||
          !callsHelper(caller, caller, helper, scope, helpersByName)
        ) {
          continue;
        }
        reachable.add(helper);
        changed = true;
      }
    }
  }

  cache.set(scope, reachable);
  return reachable;
}

function callsHelper(
  callOwner: ts.Node,
  ownerFunction: FunctionNode | undefined,
  helper: FunctionNode,
  scope: ts.Block | ts.SourceFile,
  helpersByName: ReadonlyMap<string, readonly FunctionNode[]>,
): boolean {
  const helperName = localFunctionName(helper);
  if (!helperName) return false;
  const body =
    ownerFunction && 'body' in ownerFunction ? ownerFunction.body : callOwner;
  if (!body) return false;

  let found = false;
  function visit(node: ts.Node): void {
    if (found) return;
    if (node !== body && isFunctionNode(node)) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === helperName &&
      (helpersByName.get(helperName) ?? []).includes(helper) &&
      !functionShadowsName(ownerFunction, helperName) &&
      !isShadowedByNestedDeclaration(node, scope, helperName) &&
      !hasPotentialWriteInScope(scope, helperName, helper, node)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(body);
  return found;
}

function functionShadowsName(
  owner: FunctionNode | undefined,
  localName: string,
): boolean {
  if (!owner) return false;
  if (
    owner.parameters.some((parameter) =>
      bindingNameContains(parameter.name, localName),
    ) ||
    (ts.isFunctionExpression(owner) && owner.name?.text === localName)
  ) {
    return true;
  }
  return (
    'body' in owner &&
    owner.body !== undefined &&
    ((ts.isBlock(owner.body) &&
      blockDeclaresName(owner.body.statements, localName)) ||
      hasFunctionScopedVar(owner.body, localName))
  );
}

function isShadowedByNestedDeclaration(
  call: ts.CallExpression,
  scope: ts.Node,
  localName: string,
): boolean {
  let current: ts.Node | undefined = call.parent;
  while (current && current !== scope) {
    if (
      (ts.isBlock(current) &&
        blockDeclaresName(current.statements, localName)) ||
      (ts.isCaseBlock(current) &&
        current.clauses.some((clause) =>
          blockDeclaresName(clause.statements, localName),
        )) ||
      ((ts.isForStatement(current) ||
        ts.isForInStatement(current) ||
        ts.isForOfStatement(current)) &&
        current.initializer &&
        ts.isVariableDeclarationList(current.initializer) &&
        current.initializer.declarations.some((declaration) =>
          bindingNameContains(declaration.name, localName),
        )) ||
      (ts.isCatchClause(current) &&
        current.variableDeclaration &&
        bindingNameContains(current.variableDeclaration.name, localName))
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function blockDeclaresName(
  statements: readonly ts.Statement[],
  localName: string,
): boolean {
  return statements.some((statement) => {
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.some((declaration) =>
        bindingNameContains(declaration.name, localName),
      );
    }
    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement)
    ) {
      return statement.name?.text === localName;
    }
    return false;
  });
}

function bindingNameContains(
  bindingName: ts.BindingName,
  localName: string,
): boolean {
  if (ts.isIdentifier(bindingName)) return bindingName.text === localName;
  return bindingName.elements.some((element) =>
    ts.isBindingElement(element)
      ? bindingNameContains(element.name, localName)
      : false,
  );
}

function localFunctionName(node: FunctionNode): string | undefined {
  if (ts.isFunctionDeclaration(node)) return node.name?.text;
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text;
  }
  return undefined;
}

function localFunctionScope(node: FunctionNode): ts.Node | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isBlock(current) && !ts.isSourceFile(current)) {
    current = current.parent;
  }
  return current;
}
