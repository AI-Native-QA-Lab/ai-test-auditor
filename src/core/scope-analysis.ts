import * as ts from 'typescript';

export function hasAssignmentToName(
  sourceFile: ts.SourceFile,
  localName: string,
): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (found) return;

    if (
      ts.isBinaryExpression(node) &&
      isAssignmentOperator(node.operatorToken.kind) &&
      assignmentTargetContains(node.left, localName) &&
      !isShadowedAtNode(node.left, localName)
    ) {
      found = true;
      return;
    }

    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken) &&
      assignmentTargetContains(node.operand, localName) &&
      !isShadowedAtNode(node.operand, localName)
    ) {
      found = true;
      return;
    }

    if (
      (ts.isForInStatement(node) || ts.isForOfStatement(node)) &&
      (ts.isIdentifier(node.initializer)
        ? node.initializer.text === localName
        : !ts.isVariableDeclarationList(node.initializer) &&
          assignmentTargetContains(node.initializer, localName)) &&
      !isShadowedAtNode(node.initializer, localName)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

export function isShadowedAtNode(node: ts.Node, localName: string): boolean {
  return isShadowedUntil(node, localName);
}

export function isShadowedBeforeScope(
  node: ts.Node,
  localName: string,
  stopScope: ts.Node,
): boolean {
  return isShadowedUntil(node, localName, stopScope);
}

function isShadowedUntil(
  node: ts.Node,
  localName: string,
  stopScope?: ts.Node,
): boolean {
  let current: ts.Node | undefined = node;

  while (current && current !== stopScope) {
    if (scopeDeclaresName(current, localName)) return true;
    current = current.parent;
  }

  return stopScope !== undefined && current !== stopScope;
}

function scopeDeclaresName(current: ts.Node, localName: string): boolean {
  if (
    ts.isFunctionLike(current) &&
    (current.parameters.some((parameter) =>
      bindingNameContains(parameter.name, localName),
    ) ||
      (ts.isFunctionExpression(current) && current.name?.text === localName) ||
      ('body' in current &&
        current.body !== undefined &&
        hasFunctionScopedVar(current.body, localName)))
  ) {
    return true;
  }

  if (
    (ts.isBlock(current) &&
      blockStatementsContain(current.statements, localName)) ||
    (ts.isModuleBlock(current) &&
      moduleBlockStatementsContain(current.statements, localName)) ||
    (ts.isCaseBlock(current) &&
      current.clauses.some((clause) =>
        blockStatementsContain(clause.statements, localName),
      ))
  ) {
    return true;
  }

  if (
    ts.isCatchClause(current) &&
    current.variableDeclaration &&
    bindingNameContains(current.variableDeclaration.name, localName)
  ) {
    return true;
  }

  if (
    (ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current)) &&
    current.initializer &&
    ts.isVariableDeclarationList(current.initializer) &&
    (current.initializer.flags & ts.NodeFlags.BlockScoped) !== 0 &&
    current.initializer.declarations.some((declaration) =>
      bindingNameContains(declaration.name, localName),
    )
  ) {
    return true;
  }

  return ts.isClassExpression(current) && current.name?.text === localName;
}

export function hasTopLevelBinding(
  sourceFile: ts.SourceFile,
  localName: string,
): boolean {
  const isDirectBinding = sourceFile.statements.some((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly) return false;
      if (clause.name?.text === localName) return true;
      const bindings = clause.namedBindings;
      if (!bindings) return false;
      if (ts.isNamespaceImport(bindings))
        return bindings.name.text === localName;
      return bindings.elements.some(
        (element) => !element.isTypeOnly && element.name.text === localName,
      );
    }

    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.some((declaration) =>
        bindingNameContains(declaration.name, localName),
      );
    }

    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement)
    ) {
      return statement.name?.text === localName;
    }

    if (
      ts.isEnumDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement)
    ) {
      return statement.name.text === localName;
    }

    return (
      ts.isModuleDeclaration(statement) &&
      ts.isIdentifier(statement.name) &&
      statement.name.text === localName
    );
  });
  return isDirectBinding || hasSourceFileScopedVar(sourceFile, localName);
}

function hasSourceFileScopedVar(
  sourceFile: ts.SourceFile,
  localName: string,
): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (
      found ||
      (node !== sourceFile &&
        (ts.isFunctionLike(node) ||
          ts.isClassLike(node) ||
          ts.isModuleDeclaration(node)))
    ) {
      return;
    }

    const parent = node.parent;
    if (
      ts.isVariableDeclaration(node) &&
      parent &&
      ts.isVariableDeclarationList(parent) &&
      (parent.flags & ts.NodeFlags.BlockScoped) === 0 &&
      bindingNameContains(node.name, localName)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

export function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return (
    kind >= ts.SyntaxKind.FirstAssignment &&
    kind <= ts.SyntaxKind.LastAssignment
  );
}

export function hasPotentialWriteInScope(
  scope: ts.Block | ts.SourceFile,
  localName: string,
  resolvedCallback: ts.Node,
  beforeNode?: ts.Node,
): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (
      found ||
      (beforeNode && node === resolvedCallback) ||
      (node !== scope && introducesShadow(node, localName))
    ) {
      return;
    }

    const writePrecedesNode = (writeEnd: number): boolean =>
      beforeNode === undefined || writeEnd <= beforeNode.getStart();

    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      writePrecedesNode(node.initializer.end) &&
      bindingNameContains(node.name, localName) &&
      node.parent &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.BlockScoped) === 0 &&
      hasSameVariableScope(node, scope) &&
      !isNodeWithin(resolvedCallback, node.initializer)
    ) {
      found = true;
      return;
    }

    if (
      ts.isBinaryExpression(node) &&
      isAssignmentOperator(node.operatorToken.kind) &&
      writePrecedesNode(node.right.end) &&
      assignmentTargetContains(node.left, localName)
    ) {
      found = true;
      return;
    }

    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken) &&
      writePrecedesNode(node.end) &&
      assignmentTargetContains(node.operand, localName)
    ) {
      found = true;
      return;
    }

    if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
      if (ts.isVariableDeclarationList(node.initializer)) {
        if (
          writePrecedesNode(node.initializer.end) &&
          (node.initializer.flags & ts.NodeFlags.BlockScoped) === 0 &&
          hasSameVariableScope(node, scope) &&
          node.initializer.declarations.some((declaration) =>
            bindingNameContains(declaration.name, localName),
          )
        ) {
          found = true;
          return;
        }
      } else if (
        writePrecedesNode(node.initializer.end) &&
        assignmentTargetContains(node.initializer, localName)
      ) {
        found = true;
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(scope);
  return found;
}

function hasSameVariableScope(node: ts.Node, scope: ts.Node): boolean {
  return variableScopeOwner(node) === variableScopeOwner(scope);
}

function variableScopeOwner(node: ts.Node): ts.Node | undefined {
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      ts.isFunctionLike(current) ||
      ts.isClassStaticBlockDeclaration(current) ||
      ts.isModuleBlock(current) ||
      ts.isSourceFile(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function isNodeWithin(node: ts.Node, ancestor: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current && current !== ancestor) current = current.parent;
  return current === ancestor;
}

export function assignmentTargetContains(
  target: ts.Expression,
  localName: string,
): boolean {
  if (ts.isIdentifier(target)) return target.text === localName;
  if (ts.isParenthesizedExpression(target)) {
    return assignmentTargetContains(target.expression, localName);
  }
  if (ts.isArrayLiteralExpression(target)) {
    return target.elements.some((element) =>
      ts.isSpreadElement(element)
        ? assignmentTargetContains(element.expression, localName)
        : assignmentTargetContains(element, localName),
    );
  }
  if (ts.isObjectLiteralExpression(target)) {
    return target.properties.some((property) => {
      if (ts.isShorthandPropertyAssignment(property)) {
        return property.name.text === localName;
      }
      if (ts.isPropertyAssignment(property)) {
        return assignmentTargetContains(property.initializer, localName);
      }
      return ts.isSpreadAssignment(property)
        ? assignmentTargetContains(property.expression, localName)
        : false;
    });
  }
  return false;
}

function introducesShadow(node: ts.Node, localName: string): boolean {
  if (ts.isBlock(node)) {
    return blockStatementsContain(node.statements, localName);
  }

  if (ts.isCaseBlock(node)) {
    return node.clauses.some((clause) =>
      blockStatementsContain(clause.statements, localName),
    );
  }

  if (ts.isFunctionLike(node)) {
    return (
      node.parameters.some((parameter) =>
        bindingNameContains(parameter.name, localName),
      ) ||
      ((ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) &&
        node.name?.text === localName) ||
      ('body' in node &&
        node.body !== undefined &&
        ts.isBlock(node.body) &&
        hasFunctionScopedVar(node.body, localName))
    );
  }

  if (
    ts.isCatchClause(node) &&
    node.variableDeclaration &&
    bindingNameContains(node.variableDeclaration.name, localName)
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
      bindingNameContains(declaration.name, localName),
    )
  ) {
    return true;
  }

  return ts.isClassExpression(node) && node.name?.text === localName;
}

function blockStatementsContain(
  statements: readonly ts.Statement[],
  localName: string,
): boolean {
  return statements.some((statement) => {
    if (
      ts.isVariableStatement(statement) &&
      (statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0
    ) {
      return statement.declarationList.declarations.some((declaration) =>
        bindingNameContains(declaration.name, localName),
      );
    }

    return (
      ((ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
        statement.name?.text === localName) ||
      ((ts.isEnumDeclaration(statement) ||
        ts.isImportEqualsDeclaration(statement)) &&
        statement.name.text === localName) ||
      (ts.isModuleDeclaration(statement) &&
        ts.isIdentifier(statement.name) &&
        statement.name.text === localName)
    );
  });
}

function moduleBlockStatementsContain(
  statements: readonly ts.Statement[],
  localName: string,
): boolean {
  return (
    statements.some(
      (statement) =>
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some((declaration) =>
          bindingNameContains(declaration.name, localName),
        ),
    ) || blockStatementsContain(statements, localName)
  );
}

export function hasFunctionScopedVar(
  scope: ts.Node,
  localName: string,
): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (
      found ||
      (node !== scope &&
        (ts.isFunctionLike(node) ||
          ts.isClassLike(node) ||
          ts.isModuleDeclaration(node)))
    ) {
      return;
    }

    const parent = node.parent;
    if (
      ts.isVariableDeclaration(node) &&
      parent &&
      ts.isVariableDeclarationList(parent) &&
      (parent.flags & ts.NodeFlags.BlockScoped) === 0 &&
      bindingNameContains(node.name, localName)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(scope);
  return found;
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
