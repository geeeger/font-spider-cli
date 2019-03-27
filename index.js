const program = require('commander');
const version = require('./package.json').version;
const fontspider = require('font-spider');
const colors = require('colors/safe');
const fs = require('fs-extra');
const spider = fontspider.spider;
const compressor = fontspider.compressor;
const path = require('path');
program
    .version(version)
    .option('-t, --text <text>', '输入需要转换的文字')
    .option('-f, --font <font>', '输入font地址(执行目录下)')
    .option('-n, --name <name>', '输入font地址(执行目录下)')
    .parse(process.argv);

function mock(text, font, fontname) {
    font = path.resolve(__dirname, font);
    return `
    <style>
    @font-face {
        font-family: '${fontname}';
        src: url('${font}.eot');
        src:
          url('${font}.eot?#font-spider') format('embedded-opentype'),
          url('${font}.woff') format('woff'),
          url('${font}.ttf') format('truetype'),
          url('${font}.svg') format('svg');
        font-weight: normal;
        font-style: normal;
      }
    .text {
        font-family: '${fontname}';
    }
    </style>
    <div class="text">${text}</div>
    `;
}

if (
    typeof program.text === 'function' ||
    typeof program.font === 'function' ||
    typeof program.name === 'function')
{
    onerror(new ReferenceError('-t或-f或-n未输入'));
}

const html = mock(program.text, program.font, program.name);

compressWebFont([{
    path: __dirname,
    contents: html
}], {});

function compressWebFont(htmlFiles, options) {

    logIn('Loading ..');

    spider(htmlFiles, options).then(function(webFonts) {

        if (webFonts.length === 0) {
            clearLonIn();
            log('<web font not found>');
            return webFonts;
        }

        logIn('Loading ...');

        return compressor(webFonts, options);
    }).then(function(webFonts) {

        clearLonIn();
        webFonts.forEach(function(webFont) {

            log('Font family:', colors.green(webFont.family));
            log('Original size:', colors.green(webFont.originalSize / 1000 + ' KB'));
            log('Include chars:', webFont.chars);
            log('Chars length:', colors.green(webFont.chars.length));
            log('Font id:', webFont.id);
            log('CSS selectors:', webFont.selectors.join(', '));
            log('Font files:');

            webFont.files.forEach(function(file) {
                if (fs.existsSync(file.url)) {
                    log('File', colors.cyan(path.relative('./', file.url)),
                        'created:', colors.green(file.size / 1000 + ' KB'));
                } else {
                    log(colors.red('File ' + path.relative('./', file.url) + ' not created'));
                }
            });

            log('');
        });

        return webFonts;
    }).catch(onerror);
}

function logIn() {
    if (process.stdout.isTTY) {
        var message = Array.prototype.join.call(arguments, ' ');
        if (!program.debug) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(message);
        } else {
            process.stdout.write(message + '\n');
        }

    }
}

function log() {
    if (process.stdout.isTTY) {
        process.stdout.write(Array.prototype.join.call(arguments, ' ') + '\n');
    }
}

function clearLonIn() {
    logIn('');
}

function stderr(message) {
    process.stdout.write(message + '\n');
}

function onerror(errors) {
    clearLonIn();

    var message = 'Error: ' + errors.message;
    var stack = errors.stack.toString();

    stack = stack.split('\n');
    stack.shift();
    stack = stack.join('\n');

    if (process.stderr.isTTY) {
        message = colors.red(message);
        stack = colors.grey(stack);
    }

    stderr(message);
    stderr(stack);

    // 可能有异步 http 任务运行，强制中断
    process.exit(1);
}