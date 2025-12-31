/**
 * アイコン生成スクリプト
 * SVGからPNGアイコンを生成
 * 
 * 使い方:
 * 1. npm install sharp
 * 2. npm run icons
 */

const fs = require('fs');
const path = require('path');

// sharpがインストールされているか確認
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('⚠️  sharpがインストールされていません');
    console.log('以下のコマンドを実行してください:');
    console.log('  npm install sharp');
    console.log('');
    console.log('または、オンラインツールでSVGをPNGに変換してください:');
    console.log('  https://svgtopng.com/');
    process.exit(1);
}

const sizes = [192, 512];
const inputSvg = path.join(__dirname, '..', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'icons');

async function generateIcons() {
    console.log('🎨 アイコンを生成中...');

    for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon-${size}.png`);
        
        await sharp(inputSvg)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        
        console.log(`  ✓ icon-${size}.png`);
    }

    console.log('✨ 完了！');
}

generateIcons().catch(console.error);
