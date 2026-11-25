import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTemplate, TmplAstRecursiveVisitor } from '@angular/compiler';
import { createCompilerHost, createProgram, formatDiagnostics, readConfiguration } from '@angular/compiler-cli';
import { ESLint } from 'eslint';
import ts from 'typescript';

const panel = 'walletPanelTrigger';
const toggle = 'app-ui-toggle-advanced';
const toggleTemplate = 'src/app/components/ui/button/toggle/advanced/advanced.component.html';
const panelSource = resolve('src/app/components/ui/dropdown/trigger-panel.directive.ts');
const panelExample = resolve('src/app/components/ui/dropdown/trigger-panel.directive.spec.ts');
const toggleSource = resolve(toggleTemplate.replace(/\.html$/, '.ts'));
const toggleBase = resolve('src/app/components/ui/button/toggle/toggle.component.ts');
const fullConsumerChecks = new Set([
  'src/app/components/views/start/login-types/connect-ledger/connect-ledger.component.html',
  'src/app/components/modals/operations/fee-display/fee-display.component.html'
]);
const invalidConsumer = resolve('tests/component-misuse.fixture.ts');
const config = readConfiguration('src/tsconfig.app.json', { strict: true, strictTemplates: true, noEmit: true });
const program = createProgram({
  rootNames: [...config.rootNames, panelExample, invalidConsumer],
  options: config.options,
  host: createCompilerHost({ options: config.options })
});

class ContractElements extends TmplAstRecursiveVisitor {
  hasPanel = false;
  toggleSpans = [];

  visitElement(element) {
    this.hasPanel ||= [...element.inputs, ...element.attributes].some(({ name }) => name === panel);
    if (element.name === toggle) {
      const start = element.startSourceSpan.start.offset;
      this.toggleSpans.push({ start, end: start + toggle.length + 1 });
      for (const { sourceSpan } of [...element.attributes, ...element.inputs, ...element.outputs]) {
        this.toggleSpans.push({ start: sourceSpan.start.offset, end: sourceSpan.end.offset });
      }
    }
    super.visitElement(element);
  }
}

const errors = [...config.errors, ...program.getNgOptionDiagnostics(), ...program.getNgStructuralDiagnostics()];
const tsProgram = program.getTsProgram();
for (const path of [panelSource, panelExample, toggleSource, toggleBase]) {
  const source = tsProgram.getSourceFile(path);
  if (!source) throw new Error('Missing component contract source: ' + path);
  errors.push(...tsProgram.getSemanticDiagnostics(source), ...program.getNgSemanticDiagnostics(path));
}

let panelTemplates = 0;
let toggleTemplates = 0;
for (const template of globSync('src/app/**/*.component.html')) {
  const source = readFileSync(template, 'utf8');
  if (!source.includes(panel) && !source.includes(toggle)) continue;
  const parsed = parseTemplate(source, template, { preserveLineEndings: true });
  if (parsed.errors?.length) throw new Error(parsed.errors.join('\n'));
  const visitor = new ContractElements();
  for (const node of parsed.nodes) node.visit(visitor);
  const { hasPanel, toggleSpans } = visitor;
  if (!hasPanel && !toggleSpans.length) continue;

  const component = resolve(template.replace(/\.html$/, '.ts'));
  if (!tsProgram.getSourceFile(component)) throw new Error('Missing template owner: ' + component);
  if (hasPanel) panelTemplates++;
  if (toggleSpans.length) toggleTemplates++;
  const diagnostics = program.getNgSemanticDiagnostics(component).filter(({ category }) => category === ts.DiagnosticCategory.Error);
  if (hasPanel || fullConsumerChecks.has(template)) {
    errors.push(...diagnostics);
  } else {
    // Keep the toggle bindings strict while the surrounding legacy dialogs migrate independently.
    errors.push(
      ...diagnostics.filter(
        (diagnostic) =>
          diagnostic.file &&
          resolve(diagnostic.file.fileName) === resolve(template) &&
          toggleSpans.some((span) => diagnostic.start >= span.start && diagnostic.start < span.end)
      )
    );
  }
}
if (!panelTemplates || !toggleTemplates) throw new Error('Expected real consumers of both shared controls');
if (errors.length) throw new Error(formatDiagnostics(errors));

const expected = [
  { code: 2322, source: '[panelOpen]="\'closed\'"', message: "type 'boolean'" },
  { code: -998008, source: '<div [walletPanelTrigger]="trigger"></div>', message: "'panelOpen'" },
  { code: 2322, source: 'mode="mixed"', message: '"switch" | "disclosure"' },
  { code: 2322, source: '[state]="\'open\'"', message: "type 'boolean'" },
  { code: 2322, source: '(stateChange)="text = $event"', message: "type 'string'" }
];
const rejected = program.getNgSemanticDiagnostics(invalidConsumer);
if (
  rejected.length !== expected.length ||
  expected.some(
    ({ code, source, message }) =>
      !rejected.some((diagnostic) => {
        const { file, start } = diagnostic;
        if (!file || start === undefined) return false;
        const lineStart = file.text.lastIndexOf('\n', start) + 1;
        const lineEnd = file.text.indexOf('\n', start);
        const line = file.text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
        return diagnostic.code === code && line.includes(source) && ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ').includes(message);
      })
  )
) {
  throw new Error('Expected five specific shared component misuse diagnostics. ' + formatDiagnostics(rejected));
}

const [lint] = await new ESLint().lintText('<button type="button"></button>', { filePath: toggleTemplate });
if (lint.messages.length !== 1 || lint.messages[0].severity !== 2 || lint.messages[0].ruleId !== '@angular-eslint/template/accessibility-elements-content') {
  throw new Error('Expected the accessibility lint rule to reject an unnamed button. ' + JSON.stringify(lint.messages));
}
console.log(
  `Checked ${panelTemplates} triggered panel and ${toggleTemplates} advanced toggle templates. Confirmed five misuse diagnostics and the unnamed-button lint error.`
);
