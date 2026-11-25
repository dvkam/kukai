import { existsSync, globSync } from 'node:fs';

for (const declaration of globSync('src/**/*.module.d.css.ts')) {
  const stylesheet = declaration.replace(/\.d\.css\.ts$/, '.css');
  if (!existsSync(stylesheet)) {
    console.error(`Missing stylesheet for ${declaration}: ${stylesheet}`);
    process.exitCode = 1;
  }
}
