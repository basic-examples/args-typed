import test from 'node:test';
import assert from 'node:assert/strict';
import { command, run } from '../src/index';

test('command parses options and positionals', () => {
  const cmd = command({ description: 'Test command' })
    .positional('file', 'file to process')
    .option('f', 'force', 'force flag', 'boolean')
    .option(undefined, 'num', 'a number', 'scalar', (v) => parseInt(v, 10))
    .build(([file], { force, num }) => ({ file, force, num }));

  const result = run(cmd, ['-f', '--num', '5', 'my.txt'], {}, 'cmd');
  assert.deepStrictEqual(result, { file: 'my.txt', force: true, num: 5 });
});
