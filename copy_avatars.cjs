const fs = require('fs');
const path = require('path');

const srcDir = '/Users/lioneleersteling/.gemini/antigravity/brain/7fdcf1b2-080a-49cc-98ab-40c1d3ee26a1';
const destDir = '/Users/lioneleersteling/lovable-fit/public/avatars';

const files = {
  'avatar_boxer_1774946103869.png': 'memoji-7.png',
  'avatar_skater_1774946123014.png': 'memoji-8.png',
  'avatar_surfer_1774946140374.png': 'memoji-9.png',
  'avatar_hiker_1774946185159.png': 'memoji-10.png',
  'avatar_dancer_1774946200676.png': 'memoji-11.png',
  'avatar_martial_artist_1774946217988.png': 'memoji-12.png',
  'avatar_sprinter_1774946234215.png': 'memoji-13.png',
  'avatar_climber_1774946281261.png': 'memoji-14.png',
  'avatar_swimmer_pro_1774946296823.png': 'memoji-15.png',
  'avatar_cyclist_pro_1774946315989.png': 'memoji-16.png',
  'avatar_gymnast_1774946330797.png': 'memoji-17.png',
  'avatar_tennis_1774946362642.png': 'memoji-18.png',
  'avatar_basketball_1774946378554.png': 'memoji-19.png',
  'avatar_golfer_1774946392225.png': 'memoji-20.png'
};

for (const [src, dest] of Object.entries(files)) {
  const srcPath = path.join(srcDir, src);
  const destPath = path.join(destDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.error(`Missing source file: ${srcPath}`);
  }
}
console.log('Copy sequence fully terminated.');
