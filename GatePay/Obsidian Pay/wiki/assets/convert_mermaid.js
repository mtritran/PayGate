const fs = require('fs');
const path = require('path');

const files = [
    '../Feature_01_BNPL.md',
    '../Feature_04_Refund_Settlement.md',
    '../Features_02_03_05.md'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Regex to match mermaid blocks
    const regex = /```mermaid\n([\s\S]*?)```/g;
    
    content = content.replace(regex, (match, mermaidCode) => {
        // Remove the %%{init... directive if present because it might mess up mermaid.ink scaling
        let cleanCode = mermaidCode.replace(/%%\{init[\s\S]*?\}%%\n?/g, '');
        
        // Base64 encode
        let base64 = Buffer.from(cleanCode.trim()).toString('base64');
        
        // Create markdown image link
        // Note: mermaid.ink uses base64 string directly
        return `![Sơ đồ luồng](https://mermaid.ink/img/${base64}?bgColor=2F3136)\n\n*(Sơ đồ đã được chuyển thành ảnh tĩnh để dễ phóng to)*`;
    });
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
