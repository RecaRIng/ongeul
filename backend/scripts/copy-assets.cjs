const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const assets = [
  {
    from: path.join(projectRoot, 'src', 'modules', 'easyText', 'data', 'vocab.json'),
    to: path.join(projectRoot, 'dist', 'modules', 'easyText', 'data', 'vocab.json'),
  },
];

for (const asset of assets) {
  fs.mkdirSync(path.dirname(asset.to), { recursive: true });
  fs.copyFileSync(asset.from, asset.to);
  console.log(`Copied ${path.relative(projectRoot, asset.from)} -> ${path.relative(projectRoot, asset.to)}`);
}
