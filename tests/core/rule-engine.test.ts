import { describe, expect, it } from 'vitest';
import { evaluateRules } from '../../src/core/rule-engine';
import { assertions, sourceFileFor } from '../../src/rules/utils';
import type {
  Framework,
  NativeAssertionBinding,
  TestCase,
  TestType,
} from '../../src/core/types';

function testCase(
  body: string,
  options: {
    readonly framework?: Framework;
    readonly type?: TestType;
    readonly nativeAssertionBindings?: readonly NativeAssertionBinding[];
    readonly line?: number;
    readonly filePath?: string;
  } = {},
): TestCase {
  return {
    filePath: options.filePath ?? 'tests/example.test.ts',
    name: 'example',
    framework: options.framework ?? 'vitest',
    type: options.type ?? 'unit',
    line: options.line ?? 10,
    source: `() => ${body}`,
    body,
    ...(options.nativeAssertionBindings
      ? { nativeAssertionBindings: options.nativeAssertionBindings }
      : {}),
  };
}

function ids(test: TestCase): string[] {
  return evaluateRules(test).map((finding) => finding.ruleId);
}

describe('evaluateRules', () => {
  it('reports UT001 for a unit test with no assertion', () => {
    const findings = evaluateRules(
      testCase('{\n  const result = add(1, 2);\n}'),
    );

    expect(findings).toMatchObject([
      {
        ruleId: 'UT001',
        classification: 'FAKE',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        filePath: 'tests/example.test.ts',
        line: 10,
      },
    ]);
    expect(findings[0]?.message).toContain('Static analysis');
    expect(findings[0]?.remediation).toContain('Static analysis');
  });

  it('does not report UT001 when a unit test calls expect', () => {
    expect(ids(testCase('{\n  expect(add(1, 2)).toBe(3);\n}'))).not.toContain(
      'UT001',
    );
  });

  it('does not count an uncalled local helper assertion as a test assertion', () => {
    const findings = ids(
      testCase(`{
  function unusedCheck() {
    expect(1).toBe(1);
  }
}`),
    );

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it('follows a directly called local assertion helper', () => {
    const findings = ids(
      testCase(`{
  function checkResult() {
    expect(1).toBe(1);
  }
  checkResult();
}`),
    );

    expect(findings).not.toContain('UT001');
    expect(findings).toContain('UT002');
  });

  it('follows a directly called helper through a nested local helper', () => {
    const findings = ids(
      testCase(`{
  function first() { second(); }
  function second() { third(); }
  function third() { expect(1).toBe(1); }
  first();
}`),
    );

    expect(findings).not.toContain('UT001');
    expect(findings).toContain('UT002');
  });

  it('does not follow a helper name shadowed by a function-scoped var', () => {
    const findings = ids(
      testCase(`{
  function first() {
    { var second = () => {}; }
    second();
  }
  function second() { expect(1).toBe(1); }
  first();
}`),
    );

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it('does not follow a local assertion helper with a visible reassignment', () => {
    const findings = ids(
      testCase(`{
  let checkResult = () => {
    expect(1).toBe(1);
  };
  checkResult = () => {};
  checkResult();
}`),
    );

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it('follows a local assertion helper called before a later reassignment', () => {
    const findings = ids(
      testCase(`{
  let checkResult = () => {
    expect(1).toBe(1);
  };
  checkResult();
  checkResult = () => {};
}`),
    );

    expect(findings).not.toContain('UT001');
    expect(findings).toContain('UT002');
  });

  it('does not follow an uncalled helper shadowed by a nested local function', () => {
    const findings = ids(
      testCase(`{
  function checkResult() {
    expect(1).toBe(1);
  }
  {
    const checkResult = () => {};
    checkResult();
  }
}`),
    );

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it('counts assertions in a recognized Promise callback', () => {
    expect(
      ids(
        testCase(
          '{ return Promise.resolve(1).then((value) => expect(value).toBe(1)); }',
        ),
      ),
    ).not.toContain('UT001');
  });

  it('counts a returned Promise callback in an expression-bodied test', () => {
    expect(
      ids(
        testCase('Promise.resolve(1).then((value) => expect(value).toBe(1))'),
      ),
    ).not.toContain('UT001');
  });

  it.each([
    'return Promise.reject(1).catch((error) => expect(error).toBe(1));',
    'return Promise.resolve(1).finally(() => expect(1).toBe(1));',
    'return Promise.reject(1).then(undefined, (error) => expect(error).toBe(1));',
  ])('counts a guaranteed settled Promise `%s` callback', (statement) => {
    expect(ids(testCase(`{ ${statement} }`))).not.toContain('UT001');
  });

  it('does not count an unawaited Promise callback as a test assertion', () => {
    const findings = ids(
      testCase(
        '{ Promise.resolve(1).then((value) => expect(value).toBe(1)); }',
      ),
    );

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it('counts assertions in a later guaranteed Promise continuation', () => {
    const nodeTest = testCase(
      '{ await Promise.resolve(1).then(() => 2).then((value) => assert.strictEqual(value, 2)); }',
      {
        framework: 'node-test',
        type: 'unknown',
        nativeAssertionBindings: [{ localName: 'assert', kind: 'namespace' }],
      },
    );

    expect(ids(nodeTest)).not.toContain('UT001');
  });

  it('preserves fulfillment when a catch handler cannot run', () => {
    const nodeTest = testCase(
      '{ await Promise.resolve(1).catch(() => {}).then(() => assert.strictEqual(1, 1)); }',
      {
        framework: 'node-test',
        type: 'unknown',
        nativeAssertionBindings: [{ localName: 'assert', kind: 'namespace' }],
      },
    );

    expect(ids(nodeTest)).not.toContain('UT001');
  });

  it('does not count a continuation after a Promise handler with unknown outcome', () => {
    const nodeTest = testCase(
      '{ await Promise.resolve(1).then(() => loadValue()).then((value) => assert.strictEqual(value, 2)); }',
      {
        framework: 'node-test',
        type: 'unknown',
        nativeAssertionBindings: [{ localName: 'assert', kind: 'namespace' }],
      },
    );

    expect(ids(nodeTest)).toContain('UT001');
    expect(ids(nodeTest)).not.toContain('UT002');
  });

  it.each([
    'find',
    'findIndex',
    'findLast',
    'findLastIndex',
    'flatMap',
    'forEach',
    'map',
    'some',
    'every',
  ])('counts assertions in array literal `%s` callbacks', (method) => {
    expect(
      ids(testCase(`{ [1].${method}((value) => expect(value).toBe(1)); }`)),
    ).not.toContain('UT001');
  });

  it('counts array reduction callbacks only when an iteration is guaranteed', () => {
    expect(
      ids(
        testCase(
          '{ [1, 2].reduce((left, right) => expect(left).toBe(right)); }',
        ),
      ),
    ).not.toContain('UT001');
    expect(
      ids(testCase('{ [1].reduce((value) => expect(value).toBe(1), 0); }')),
    ).not.toContain('UT001');
  });

  it.each([
    '[1].sort(() => expect(1).toBe(1));',
    '[1].toSorted(() => expect(1).toBe(1));',
    '[1].reduce((left, right) => expect(left).toBe(right));',
    '[,,].map((value) => expect(value).toBe(1));',
  ])('does not count a `%s` callback that may not run', (expression) => {
    const findings = ids(testCase(`{ ${expression} }`));

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it.each([
    'map',
    'find',
    'reduce',
    'then',
    'catch',
    'finally',
    'poll',
    'toPass',
  ])('does not assume a custom `%s` method executes its callback', (method) => {
    const findings = ids(
      testCase(
        `{ const queue = { ${method}: (_callback) => undefined }; queue.${method}(() => expect(1).toBe(1)); }`,
      ),
    );

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it('does not assume arbitrary methods execute their callback', () => {
    expect(
      ids(
        testCase('{ values.customVisit((value) => expect(value).toBe(1)); }'),
      ),
    ).toContain('UT001');
  });

  it('does not count callbacks on a definitely empty array literal', () => {
    const findings = ids(testCase('{ [].map(() => expect(1).toBe(1)); }'));

    expect(findings).toContain('UT001');
    expect(findings).not.toContain('UT002');
  });

  it('recognizes Node native assertions as assertions', () => {
    const nodeTest = testCase('{ assert.strictEqual(3, 3); }', {
      framework: 'node-test',
      type: 'unknown',
      nativeAssertionBindings: [{ localName: 'assert', kind: 'namespace' }],
    });

    expect(ids(nodeTest)).not.toContain('UT001');
    expect(ids(nodeTest)).toContain('UT002');
  });

  it('preserves Node native actual and expected argument order', () => {
    const nodeTest = testCase('{ assert.strictEqual(add(1, 2), 3); }', {
      framework: 'node-test',
      type: 'unknown',
      nativeAssertionBindings: [{ localName: 'assert', kind: 'namespace' }],
    });

    expect(ids(nodeTest)).not.toContain('UT002');
    expect(ids(nodeTest)).not.toContain('UT003');
    expect(ids(nodeTest)).not.toContain('UT011');
  });

  it('keeps deterministic equal-literal failures in Node negative assertions visible', () => {
    const nodeTest = testCase('{ assert.notStrictEqual(3, 3); }', {
      framework: 'node-test',
      type: 'unknown',
      nativeAssertionBindings: [{ localName: 'assert', kind: 'namespace' }],
    });

    expect(ids(nodeTest)).toContain('UT002');
  });

  it('does not treat a same-named application function as a Node assertion', () => {
    const nodeTest = testCase('{ fail(); }', {
      framework: 'node-test',
      type: 'unknown',
    });

    expect(ids(nodeTest)).toContain('UT001');
  });

  it('does not report UT001 for a normal TSX test callback with JSX before expect', () => {
    expect(
      ids(
        testCase(
          '{ const banner = <section>{label}</section>; expect(1).toBe(1); }',
          { filePath: 'tests/example.test.tsx' },
        ),
      ),
    ).not.toContain('UT001');
  });

  it('reports UT012 for a bare expect call but not for a normal matcher', () => {
    expect(ids(testCase('{ expect(result); }'))).toContain('UT012');
    expect(
      ids(testCase('{ expect(result).toEqual(expected); }')),
    ).not.toContain('UT012');
  });

  it('reports UT013 only when assertions(0) contradicts an actual matcher', () => {
    expect(
      ids(testCase('{ expect.assertions(0); expect(result).toBe(expected); }')),
    ).toContain('UT013');
    expect(
      ids(testCase('{ expect.assertions(1); expect(result).toBe(expected); }')),
    ).not.toContain('UT013');
    expect(
      ids(
        testCase('{ expect.hasAssertions(); expect(result).toBe(expected); }'),
      ),
    ).not.toContain('UT013');
  });

  it('reports UT014 only for mock-interaction-only assertions', () => {
    expect(ids(testCase('{ expect(mock).toHaveBeenCalled(); }'))).toContain(
      'UT014',
    );
    expect(
      ids(
        testCase(
          '{ expect(mock).toHaveBeenCalledWith(input); expect(result).toEqual(expected); }',
        ),
      ),
    ).not.toContain('UT014');
  });

  it('reports UT015 only for snapshot-only assertions', () => {
    expect(ids(testCase('{ expect(value).toMatchSnapshot(); }'))).toContain(
      'UT015',
    );
    expect(
      ids(
        testCase(
          '{ expect(value).toMatchSnapshot(); expect(value.id).toBe(expected); }',
        ),
      ),
    ).not.toContain('UT015');
  });

  it('reports UT002 with the literal assertion line', () => {
    const findings = evaluateRules(testCase('{\n  expect(200).toBe(200);\n}'));

    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: 'UT002', line: 11 }),
    );
  });

  it('does not report UT002 when literal expected and actual values differ', () => {
    expect(
      ids(testCase("{\n  expect(result).toBe('ready');\n}")),
    ).not.toContain('UT002');
  });

  it('reports UT003 when the same non-literal expression is asserted against itself', () => {
    expect(
      ids(
        testCase('{\n  expect(response.body.id).toEqual(response.body.id);\n}'),
      ),
    ).toContain('UT003');
  });

  it('does not call repeated side-effectful expression evaluation a deterministic fake', () => {
    const updateExpression = evaluateRules(
      testCase('{ expect(counter++).toBe(counter++); }'),
    ).find((finding) => finding.ruleId === 'UT003');
    const propertyExpression = evaluateRules(
      testCase('{ expect(response.body.id).toEqual(response.body.id); }'),
    ).find((finding) => finding.ruleId === 'UT003');
    const elementExpression = evaluateRules(
      testCase("{ expect(response['id']).toEqual(response['id']); }"),
    ).find((finding) => finding.ruleId === 'UT003');
    const coerciveExpressions = evaluateRules(
      testCase(
        '{ expect(value + "").toEqual(value + ""); expect(+value).toEqual(+value); expect(`value=${value}`).toEqual(`value=${value}`); expect({ ...value }).toEqual({ ...value }); expect({ [value]: true }).toEqual({ [value]: true }); }',
      ),
    ).filter((finding) => finding.ruleId === 'UT003');
    const callExpression = evaluateRules(
      testCase('{ expect(next()).toBe(next()); }'),
    ).filter((finding) => ['UT003', 'UT011'].includes(finding.ruleId));
    const freshIdentityExpressions = evaluateRules(
      testCase(
        '{ expect([]).toBe([]); expect({}).toBe({}); expect(() => 1).toBe(() => 1); expect(function () {}).toBe(function () {}); expect(class {}).toBe(class {}); expect(/value/).toBe(/value/); }',
      ),
    ).filter((finding) => finding.ruleId === 'UT003');
    const jsxIdentity = evaluateRules(
      testCase('{ expect(<div />).toBe(<div />); }', {
        filePath: 'tests/example.test.tsx',
      }),
    ).find((finding) => finding.ruleId === 'UT003');

    expect(updateExpression?.classification).toBe('WEAK');
    expect(propertyExpression?.classification).toBe('WEAK');
    expect(elementExpression?.classification).toBe('WEAK');
    expect(coerciveExpressions).toHaveLength(5);
    expect(
      coerciveExpressions.every((finding) => finding.classification === 'WEAK'),
    ).toBe(true);
    expect(callExpression.length).toBeGreaterThan(0);
    expect(
      callExpression.every((finding) => finding.classification === 'WEAK'),
    ).toBe(true);
    expect(freshIdentityExpressions).toHaveLength(6);
    expect(
      freshIdentityExpressions.every(
        (finding) => finding.classification === 'WEAK',
      ),
    ).toBe(true);
    expect(jsxIdentity?.classification).toBe('WEAK');
  });

  it('does not report UT003 when the assertion compares different expressions', () => {
    expect(
      ids(testCase('{\n  expect(response.body.id).toEqual(expected.id);\n}')),
    ).not.toContain('UT003');
  });

  it('does not report UT003 when string literal whitespace differs', () => {
    expect(
      ids(testCase("{\n  expect(format('a b')).toEqual(format('ab'));\n}")),
    ).not.toContain('UT003');
  });

  it('reports UT008 for an empty catch block and a catch block that only logs', () => {
    const findings = evaluateRules(
      testCase(
        '{\n  try {\n    await save();\n  } catch {}\n  try {\n    await save();\n  } catch (error) {\n    console.error(error);\n  }\n}',
      ),
    ).filter((finding) => finding.ruleId === 'UT008');

    expect(findings).toMatchObject([
      { line: 13, severity: 'CRITICAL' },
      { line: 16, severity: 'CRITICAL' },
    ]);
  });

  it('does not report UT008 when the catch block rethrows', () => {
    expect(
      ids(
        testCase(
          '{\n  try { await save(); } catch (error) { throw error; }\n}',
        ),
      ),
    ).not.toContain('UT008');
  });

  it('reports UT011 when expected and actual call the same callee with identical arguments', () => {
    expect(
      ids(
        testCase(
          '{\n  expect(service.get(' +
            "'a'" +
            ")).toEqual(service.get('a'));\n}",
        ),
      ),
    ).toContain('UT011');
  });

  it('does not report UT011 when the same callee receives different arguments', () => {
    expect(
      ids(
        testCase("{\n  expect(service.get('a')).toEqual(service.get('b'));\n}"),
      ),
    ).not.toContain('UT011');
  });

  it('does not report UT011 when expected and actual call different callees', () => {
    expect(
      ids(
        testCase("{\n  expect(service.get('a')).toEqual(factory.get('a'));\n}"),
      ),
    ).not.toContain('UT011');
  });

  it("reports API001 only when status is the test's sole assertion target", () => {
    expect(
      ids(
        testCase('{\n  expect(response.statusCode).toBe(201);\n}', {
          type: 'api',
        }),
      ),
    ).toContain('API001');
    expect(
      ids(
        testCase(
          "{\n  expect(response.status).toBe(200);\n  expect(response.body.id).toBe('a');\n}",
          { type: 'api' },
        ),
      ),
    ).not.toContain('API001');
  });

  it('reports API003 for response-object existence only', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response).toBeDefined();
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API003');
    expect(
      ids(
        testCase(
          `{
  expect(response).toBeDefined();
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API003');
  });

  it('reports API004 for request-echo-only response assertions', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual(requestBody);
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API004');
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual(requestPayload.map(normalize));
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API004');
  });

  it('does not report API004 when a response is asserted to differ from the request', () => {
    expect(
      ids(
        testCase('{\n  expect(response.body).not.toEqual(requestBody);\n}', {
          type: 'api',
        }),
      ),
    ).not.toContain('API004');
  });

  it('reports API004 for a Node native request-echo comparison', () => {
    const findings = ids(
      testCase('{ assert.deepStrictEqual(response.body, requestBody); }', {
        framework: 'node-test',
        type: 'api',
        nativeAssertionBindings: [{ localName: 'assert', kind: 'namespace' }],
      }),
    );

    expect(findings).toContain('API004');
  });

  it('retains negation metadata for an API request-echo comparison', () => {
    const test = testCase(
      '{ expect(response.body).not.toEqual(requestBody); }',
      { type: 'api' },
    );

    expect(
      assertions(
        sourceFileFor(test),
        test.framework,
        test.nativeAssertionBindings,
        test.expectBindings,
      ),
    ).toMatchObject([{ isNegated: true, matcherName: 'toEqual' }]);
  });

  it('applies comparison and existence API rules to Node native assertions', () => {
    const bindings = [{ localName: 'assert', kind: 'namespace' as const }];
    const nativeApiIds = (body: string): string[] =>
      ids(
        testCase(body, {
          framework: 'node-test',
          type: 'api',
          nativeAssertionBindings: bindings,
        }),
      );

    expect(nativeApiIds('{ assert.ok(response.body); }')).toContain('API002');
    expect(nativeApiIds('{ assert.ok(response); }')).toContain('API003');
    expect(nativeApiIds('{ assert.ok(response.headers); }')).toContain(
      'API006',
    );
    expect(
      nativeApiIds(
        "{ assert.strictEqual(response.headers.get('content-type'), 'application/json'); }",
      ),
    ).toContain('API007');
    expect(
      nativeApiIds(
        "{ assert.strictEqual(response.request.method(), 'POST'); }",
      ),
    ).toContain('API008');
    expect(
      nativeApiIds('{ assert.deepStrictEqual(response.body, {}); }'),
    ).toContain('API009');
    expect(
      nativeApiIds('{ assert.notStrictEqual(response.body.length, 0); }'),
    ).not.toContain('API009');
  });

  it('reports API005 for body property-presence-only assertions', () => {
    expect(
      ids(
        testCase("{ expect(response.body).toHaveProperty('id'); }", {
          type: 'api',
        }),
      ),
    ).toContain('API005');
    expect(
      ids(
        testCase(
          "{ expect(response.body).toHaveProperty('id', expectedId); }",
          {
            type: 'api',
          },
        ),
      ),
    ).not.toContain('API005');
    expect(
      ids(
        testCase("{ expect(response.body).not.toHaveProperty('debug'); }", {
          type: 'api',
        }),
      ),
    ).not.toContain('API005');
  });

  it('reports API006 for response-headers existence only', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response.headers).toBeDefined();
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API006');
    expect(
      ids(
        testCase(
          `{
  expect(response.headers).toBeDefined();
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API006');
  });

  it('reports API007 for content-type-only metadata assertions', () => {
    expect(
      ids(
        testCase(
          "{ expect(response.headers.get('content-type')).toContain('json'); }",
          {
            type: 'api',
          },
        ),
      ),
    ).toContain('API007');
    expect(
      ids(
        testCase(
          `{
  expect(response.headers.get('content-type')).toContain('json');
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API007');
  });

  it('reports API008 for response request metadata only', () => {
    expect(
      ids(
        testCase("{ expect(response.request.method()).toBe('POST'); }", {
          type: 'api',
        }),
      ),
    ).toContain('API008');
    expect(
      ids(
        testCase(
          `{
  expect(response.request.method()).toBe('POST');
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API008');
  });

  it('reports API009 for empty response results only', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual({});
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API009');
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual({ id: expectedId });
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API009');
  });

  it('does not report API009 when a response length is asserted to be nonzero', () => {
    expect(
      ids(
        testCase('{\n  expect(response.body.length).not.toBe(0);\n}', {
          type: 'api',
        }),
      ),
    ).not.toContain('API009');
  });

  it('reports API010 when an API request error is swallowed', () => {
    expect(
      ids(
        testCase(
          `{
  try { await request.get("/items"); } catch (error) { console.error(error); }
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API010');
    expect(
      ids(
        testCase(
          `{
  try { await request.get("/items"); } catch (error) { throw error; }
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API010');
  });

  it("reports E2E002 only when URL is the test's sole assertion matcher", () => {
    expect(
      ids(
        testCase("{\n  await expect(page).toHaveURL('/checkout');\n}", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E002');
    expect(
      ids(
        testCase(
          "{\n  await expect(page).toHaveURL('/checkout');\n  await expect(page.getByRole('heading')).toBeVisible();\n}",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E002');
  });

  it('reports E2E001 when a Playwright journey has no assertion', () => {
    expect(
      ids(
        testCase(
          "{ await page.goto('/checkout'); await page.getByRole('button', { name: 'Pay' }).click(); }",
          {
            framework: 'playwright',
            type: 'e2e',
          },
        ),
      ),
    ).toContain('E2E001');
  });

  it('sees Playwright assertions inside recognized array callbacks', () => {
    const findings = ids(
      testCase('{ [item].find((item) => expect(item).toBeVisible()); }', {
        framework: 'playwright',
        type: 'e2e',
      }),
    );

    expect(findings).not.toContain('E2E001');
    expect(findings).toContain('E2E003');
  });

  it('reports E2E004 for a numeric Playwright waitForTimeout but not a variable timeout', () => {
    expect(
      ids(
        testCase('{\n  await page.waitForTimeout(500);\n}', {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E004');
    expect(
      ids(
        testCase('{\n  await page.waitForTimeout(retryDelay);\n}', {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E004');
  });

  it('reports E2E005 for unstable literal selectors but not explicit selectors', () => {
    expect(
      ids(
        testCase("{ page.locator('.checkout-button'); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E005');
    expect(
      ids(
        testCase(
          `{
  page.locator('[data-testid="checkout"]');
  page.getByRole('button', { name: 'Checkout' });
}`,
          {
            framework: 'playwright',
            type: 'e2e',
          },
        ),
      ),
    ).not.toContain('E2E005');
  });

  it('reports unstable selectors on page-derived locators only', () => {
    const findings = evaluateRules(
      testCase(
        `{
  const firstIssue = page.locator('.weekly-index-card').first();
  firstIssue.locator('h3');
  const unrelated = { locator: (selector: string) => selector };
  unrelated.locator('.not-playwright');
  for (const firstIssue of items) {
    firstIssue.locator('.shadowed-not-playwright');
  }
  {
    const { firstIssue } = state;
    firstIssue.locator('.shadowed-property-not-playwright');
  }
}`,
        { framework: 'playwright', type: 'e2e' },
      ),
    ).filter((finding) => finding.ruleId === 'E2E005');

    expect(findings.map((finding) => finding.line)).toEqual([11, 12]);
  });

  it('recognizes class and id selectors inside compound CSS selectors', () => {
    const findings = evaluateRules(
      testCase(
        `{
  page.locator('button.checkout-primary');
  page.locator('main#app');
  page.locator('[data-testid="foo.bar"]');
}`,
        { framework: 'playwright', type: 'e2e' },
      ),
    ).filter((finding) => finding.ruleId === 'E2E005');

    expect(findings).toHaveLength(2);
  });

  it('recognizes engine-prefixed XPath and CSS tag selectors', () => {
    const findings = evaluateRules(
      testCase(
        `{
  page.locator('xpath=//main/div');
  page.locator('css=button');
  page.locator('text=Continue');
}`,
        { framework: 'playwright', type: 'e2e' },
      ),
    ).filter((finding) => finding.ruleId === 'E2E005');

    expect(findings).toHaveLength(2);
  });

  it('ignores selectors and assertions inside an uncalled helper', () => {
    const findings = ids(
      testCase(
        `{
  function unusedJourney() {
    page.locator('.unstable');
    expect(page).toHaveURL('/checkout');
  }
}`,
        { framework: 'playwright', type: 'e2e' },
      ),
    );

    expect(findings).toContain('E2E001');
    expect(findings).not.toContain('E2E002');
    expect(findings).not.toContain('E2E005');
  });

  it('reports E2E006 as contextual when the caught try has no assertion', () => {
    const finding = evaluateRules(
      testCase(
        '{ try { await page.goto("/"); } catch (error) { console.error(error); } }',
        { framework: 'playwright', type: 'e2e' },
      ),
    ).find((item) => item.ruleId === 'E2E006');
    expect(finding).toMatchObject({
      classification: 'WEAK',
      severity: 'WARNING',
      confidence: 'MEDIUM',
    });
    expect(
      evaluateRules(
        testCase(
          '{ try { await page.goto("/"); } catch (error) { console.error(error); } await expect(page).toBeVisible(); }',
          { framework: 'playwright', type: 'e2e' },
        ),
      ).find((item) => item.ruleId === 'E2E006'),
    ).toMatchObject({ classification: 'WEAK' });
    expect(
      evaluateRules(
        testCase(
          '{ try { await expect(page).toHaveURL("/"); } catch (error) { console.error(error); } }',
          { framework: 'playwright', type: 'e2e' },
        ),
      ).find((item) => item.ruleId === 'E2E006'),
    ).toMatchObject({
      classification: 'FAKE',
      severity: 'CRITICAL',
      confidence: 'HIGH',
    });
    expect(
      ids(
        testCase(
          '{ try { await page.goto("/"); } catch (error) { throw error; } }',
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E006');
  });

  it('reports E2E007 when an assertion is conditional', () => {
    expect(
      ids(
        testCase(
          "{ if (ready) await expect(page.getByRole('heading')).toBeVisible(); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).toContain('E2E007');
    expect(
      ids(
        testCase("{ await expect(page.getByRole('heading')).toBeVisible(); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E007');
    expect(
      ids(
        testCase(
          "{ ready && (await expect(page.getByRole('heading')).toBeVisible()); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).toContain('E2E007');
  });

  it('reports E2E008 for direct unawaited matchers but not wrappers', () => {
    expect(
      ids(
        testCase("{ expect(page.getByRole('heading')).toBeVisible(); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E008');
    expect(
      ids(
        testCase("{ void expect(page.getByRole('heading')).toBeVisible(); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E008');
    expect(
      ids(
        testCase("{ await expect(page.getByRole('heading')).toBeVisible(); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E008');
    expect(
      ids(
        testCase(
          "{ await Promise.all([expect(page.getByRole('heading')).toBeVisible()]); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E008');
  });

  it('recognizes unawaited Playwright async matchers and leaves sync matchers alone', () => {
    const asyncMatcherFindings = ids(
      testCase(
        '{\n  expect(response).toBeOK();\n  expect(page.getByRole("status")).toContainClass("ready");\n  expect(page).toMatchAriaSnapshot("- main");\n  expect(async () => {}).toPass();\n}',
        { framework: 'playwright', type: 'e2e' },
      ),
    );
    const syncMatcherFindings = ids(
      testCase("{\n  expect(page.url()).toBe('/checkout');\n}", {
        framework: 'playwright',
        type: 'e2e',
      }),
    );

    expect(asyncMatcherFindings.filter((id) => id === 'E2E008')).toHaveLength(
      4,
    );
    expect(syncMatcherFindings).not.toContain('E2E008');
  });

  it('inspects async matchers inside a Playwright toPass callback', () => {
    const findings = ids(
      testCase(
        "{ await expect(async () => { expect(page.getByRole('heading')).toBeVisible(); }).toPass(); }",
        { framework: 'playwright', type: 'e2e' },
      ),
    );

    expect(findings).toContain('E2E008');
  });

  it('inspects async matchers inside a recognized Playwright expect.poll callback', () => {
    const findings = ids(
      testCase(
        "{ await expect.poll(() => { expect(page.getByRole('heading')).toBeVisible(); return page.url(); }).toBe('/checkout'); }",
        { framework: 'playwright', type: 'e2e' },
      ),
    );

    expect(findings).toContain('E2E008');
  });

  it('reports E2E009 for explicit page actions without await', () => {
    expect(
      ids(
        testCase("{ page.click('#submit'); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E009');
    expect(
      ids(
        testCase("{ await page.click('#submit'); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E009');
    expect(
      ids(
        testCase(
          "{ const pending = page.click('#submit'); await expect(page.getByText('saved')).toBeVisible(); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).toContain('E2E009');
    expect(
      ids(
        testCase("{ const pending = page.click('#submit'); await pending; }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E009');
    expect(
      ids(
        testCase(
          "{ const pending = page.click('#submit'); function unrelated(pending) { return pending; } unrelated('value'); await expect(page.getByText('saved')).toBeVisible(); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).toContain('E2E009');
    expect(
      ids(
        testCase(
          "{ const pending = page.click('#submit'); function consume() { return pending; } consume(); await expect(page.getByText('saved')).toBeVisible(); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E009');
    expect(
      ids(
        testCase(
          "{ let pending = page.click('#submit'); pending = undefined; await expect(page.getByText('saved')).toBeVisible(); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).toContain('E2E009');
  });

  it('reports E2E010 for empty text or attribute assertions only', () => {
    expect(
      ids(
        testCase(
          `{
  await expect(page.getByRole('status')).toHaveText('');
  await expect(page.getByRole('status')).toHaveAttribute('aria-label', '');
}`,
          {
            framework: 'playwright',
            type: 'e2e',
          },
        ),
      ),
    ).toContain('E2E010');
    expect(
      ids(
        testCase(
          "{ await expect(page.getByRole('status')).toHaveText('Ready'); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E010');
  });

  it('does not report E2E010 for negated empty text or attribute assertions', () => {
    const test = testCase(
      "{\n  await expect(page.getByRole('status')).not.toHaveText('');\n  await expect(page.getByRole('status')).not.toHaveAttribute('aria-label', '');\n}",
      { framework: 'playwright', type: 'e2e' },
    );

    expect(ids(test)).not.toContain('E2E010');
    expect(ids(test)).not.toContain('E2E001');
  });

  it('keeps API and E2E findings weak high-confidence warnings', () => {
    const cases = [
      testCase('{\n  expect(response.status).toBe(200);\n}', { type: 'api' }),
      testCase("{\n  await expect(page).toHaveURL('/');\n}", {
        framework: 'playwright',
        type: 'e2e',
      }),
      testCase(
        "{\n  await page.waitForTimeout(10);\n  await expect(page).toHaveTitle('Checkout');\n}",
        {
          framework: 'playwright',
          type: 'e2e',
        },
      ),
    ];

    for (const auditCase of cases) {
      for (const finding of evaluateRules(auditCase)) {
        expect(finding).toMatchObject({
          classification: 'WEAK',
          severity: 'WARNING',
          confidence: 'HIGH',
        });
      }
    }
  });

  it.each([
    ['UT001', testCase('{\n  run();\n}'), 'UT001', 10],
    ['UT002', testCase('{\n  expect(true).toBe(true);\n}'), 'UT002', 11],
    [
      'UT003',
      testCase('{\n  expect(result.value).toEqual(result.value);\n}'),
      'UT003',
      11,
    ],
    [
      'UT008',
      testCase('{\n  try { run(); } catch (error) { console.warn(error); }\n}'),
      'UT008',
      11,
    ],
    [
      'UT011',
      testCase("{\n  expect(sut.read('a')).toEqual(sut.read('a'));\n}"),
      'UT011',
      11,
    ],
    [
      'API001',
      testCase('{\n  expect(response.status).toBe(200);\n}', { type: 'api' }),
      'API001',
      11,
    ],
    [
      'E2E001',
      testCase("{ await page.goto('/'); }", {
        framework: 'playwright',
        type: 'e2e',
      }),
      'E2E001',
      10,
    ],
    [
      'E2E002',
      testCase("{\n  await expect(page).toHaveURL('/');\n}", {
        framework: 'playwright',
        type: 'e2e',
      }),
      'E2E002',
      11,
    ],
    [
      'E2E004',
      testCase('{\n  await page.waitForTimeout(1);\n}', {
        framework: 'playwright',
        type: 'e2e',
      }),
      'E2E004',
      11,
    ],
  ])('preserves the source line for %s', (_name, auditCase, ruleId, line) => {
    expect(evaluateRules(auditCase)).toContainEqual(
      expect.objectContaining({ ruleId, line }),
    );
  });
});
