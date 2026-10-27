import * as ts from 'typescript';
import {
  hasAssignmentToName,
  hasTopLevelBinding,
  isShadowedAtNode,
} from './scope-analysis.js';

export function staticRequireModule(
  initializer: ts.Expression | undefined,
): string | undefined {
  if (
    !initializer ||
    !ts.isCallExpression(initializer) ||
    !ts.isIdentifier(initializer.expression) ||
    initializer.expression.text !== 'require' ||
    initializer.arguments.length !== 1 ||
    !ts.isStringLiteralLike(initializer.arguments[0])
  ) {
    return undefined;
  }

  const sourceFile = initializer.getSourceFile();
  if (
    isShadowedAtNode(initializer, 'require') ||
    hasTopLevelBinding(sourceFile, 'require') ||
    hasAssignmentToName(sourceFile, 'require')
  ) {
    return undefined;
  }

  return initializer.arguments[0].text;
}
