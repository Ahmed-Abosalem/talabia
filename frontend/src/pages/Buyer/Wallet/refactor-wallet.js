const fs = require('fs');

const FILE_PATH = 's:/Talabia_new/frontend/src/pages/Buyer/Wallet/WalletPage.jsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Import useApp
if (!content.includes('useApp')) {
    content = content.replace(
        'import { useState, useEffect, useCallback, useRef } from "react";',
        'import { useState, useEffect, useCallback, useRef } from "react";\nimport { useApp } from "@/context/AppContext";'
    );
}

// 2. Destructure showToast and remove error/success states
content = content.replace(
    'const [error, setError] = useState("");\n    const [success, setSuccess] = useState("");',
    'const { showToast } = useApp();\n    // error and success local states replaced by showToast\n'
);

content = content.replace(
    'const [error, setError] = useState("");\n    const [success, setSuccess] = useState("");\n',
    'const { showToast } = useApp();\n'
);

content = content.replace(
    'const [view, setView] = useState("loading"); // loading | setup | success | pin | dashboard | deposit | withdraw | transactions | change-password\n    const [error, setError] = useState("");\n    const [success, setSuccess] = useState("");',
    'const [view, setView] = useState("loading"); // loading | setup | success | pin | dashboard | deposit | withdraw | transactions | change-password\n    const { showToast } = useApp();'
);

// 3. Replacements
content = content.replace(/setError\((.+?)\);/g, (match, val) => {
    if (val === '""' || val === "''") return ''; // remove setError("")
    return `showToast(${val}, "error");`;
});

content = content.replace(/setSuccess\((.+?)\);/g, (match, val) => {
    if (val === '""' || val === "''") return ''; // remove setSuccess("")
    return `showToast(${val}, "success");`;
});

// Remove UI blocks literally
content = content.split('{error && <div className="wallet-error wallet-header-feedback">{error}</div>}').join('');
content = content.split('{success && <div className="wallet-success wallet-header-feedback">{success}</div>}').join('');
content = content.split('{error && !depositSuccess && <div className="wallet-error wallet-header-feedback">{error}</div>}').join('');


// A few specific ones from the action grid buttons
content = content.replace('setError(""); setSuccess(""); ', '');
content = content.replace('setError(""); setSuccess("");', '');
content = content.replace('setError(""); ', '');
content = content.replace('setError("");', '');
content = content.replace('setSuccess(""); ', '');
content = content.replace('setSuccess("");', '');


fs.writeFileSync(FILE_PATH, content, 'utf8');
console.log('Script executed successfully.');
