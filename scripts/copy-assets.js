import fs from 'fs';
import path from 'path';

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}

copyFile(
  path.resolve('src/database/schema.sql'),
  path.resolve('dist/database/schema.sql')
);

copyFile(
  path.resolve('src/docs/swagger.yaml'),
  path.resolve('dist/docs/swagger.yaml')
);
