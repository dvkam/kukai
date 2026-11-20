const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const directory = mkdtempSync(join(tmpdir(), 'kukai-karma-policy-'));
const fixture = join(directory, 'fixture.js');
const configuration = join(directory, 'karma.cjs');
const launcher = require.resolve('karma-chrome-launcher');
const framework = require.resolve('karma-jasmine');

try {
  writeFileSync(
    configuration,
    `module.exports = function(config) {
      require(${JSON.stringify(join(root, 'karma.conf.js'))})(config);
      config.set({
        frameworks: ['jasmine'],
        plugins: [require(${JSON.stringify(launcher)}), require(${JSON.stringify(framework)})],
        files: [${JSON.stringify(fixture)}],
        preprocessors: {},
        reporters: ['dots'],
        browsers: ['ChromeHeadlessCI'],
        autoWatch: false,
        singleRun: true
      });
    };`
  );
  const cases = [
    { name: 'complete passing suite', source: "it('passes', () => expect(true).toBe(true));", expected: 0 },
    { name: 'ordinary failing test', source: "it('fails', () => expect(true).toBe(false));", expected: 1 },
    {
      name: 'focused test hiding a failure',
      source: "fit('passes', () => expect(true).toBe(true)); it('hidden failure', () => expect(true).toBe(false));",
      expected: 1
    }
  ];
  for (const scenario of cases) {
    writeFileSync(fixture, scenario.source);
    const result = spawnSync(process.execPath, [require.resolve('karma/bin/karma'), 'start', configuration], {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null, `Karma was terminated: ${scenario.name}`);
    assert.equal(result.status, scenario.expected, `${scenario.name}\n${result.stdout}\n${result.stderr}`);
    console.log(`PASS: ${scenario.name} returned ${result.status}`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
