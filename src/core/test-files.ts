const supportedTestFilePattern =
  /(?:\.(?:test|spec)\.(?:ts|tsx|js)|\.e2e\.ts)$/;

export function isSupportedTestFile(filePath: string): boolean {
  return supportedTestFilePattern.test(filePath);
}
