import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCompilerHost, createProgram, formatDiagnostics, readConfiguration } from '@angular/compiler-cli';

const config = readConfiguration('src/tsconfig.app.json', {
  fullTemplateTypeCheck: true,
  strictInputTypes: true,
  strictDomLocalRefTypes: true,
  noEmit: true
});
const invalidConsumer = resolve('tests/panel-misuse.fixture.ts');
const program = createProgram({
  rootNames: [...config.rootNames, invalidConsumer],
  options: config.options,
  host: createCompilerHost({ options: config.options })
});
const templates = globSync('src/app/**/*.component.html').filter((path) => readFileSync(path, 'utf8').includes('[walletPanelTrigger]'));
if (!templates.length) throw new Error('No triggered panel templates found');
const errors = [...config.errors, ...program.getNgOptionDiagnostics(), ...program.getNgStructuralDiagnostics()];
for (const template of templates) {
  const component = resolve(template.replace(/\.html$/, '.ts'));
  if (!program.getTsProgram().getSourceFile(component)) throw new Error('Missing template owner: ' + component);
  errors.push(...program.getNgSemanticDiagnostics(component));
}
if (errors.length) throw new Error(formatDiagnostics(errors));
const rejected = program.getNgSemanticDiagnostics(invalidConsumer);
if (rejected.length !== 1 || rejected[0].code !== 2322 || !String(rejected[0].messageText).includes("type 'boolean'")) {
  throw new Error('Expected a boolean input diagnostic for the invalid consumer. ' + formatDiagnostics(rejected));
}
console.log('Checked ' + templates.length + ' triggered panel templates and rejected the invalid consumer.');
