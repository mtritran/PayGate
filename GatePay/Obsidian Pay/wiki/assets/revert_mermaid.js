const fs = require('fs');

const files = [
    '../Feature_01_BNPL.md',
    '../Feature_04_Refund_Settlement.md',
    '../Features_02_03_05.md'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Regex to match the markdown image tags generated previously
    const regex = /!\[Sơ đồ luồng\]\(https:\/\/mermaid\.ink\/img\/([a-zA-Z0-9+/=]+)\?bgColor=2F3136\)\n\n\*\([^\)]+\)\*/g;
    
    content = content.replace(regex, (match, base64) => {
        let decoded = Buffer.from(base64, 'base64').toString('utf8');
        return `\`\`\`mermaid\n${decoded}\n\`\`\``;
    });
    
    fs.writeFileSync(file, content);
    console.log(`Reverted ${file}`);
});
