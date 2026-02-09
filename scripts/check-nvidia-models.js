const https = require('https');

const KEY = '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';
const URL = 'https://integrate.api.nvidia.com/v1/models';

console.log(`Querying: ${URL}`);

const req = https.get(URL, {
    headers: {
        'Authorization': `Bearer ${KEY}`,
        'Accept': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.data) {
                console.log('✅ Available Models:');
                json.data.forEach(m => {
                    if (m.id.includes('gemma')) console.log(`- ${m.id}`);
                });
            } else {
                console.log('❌ Error:', JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log('❌ Parse Error:', data.substring(0, 100)); // Log first 100 chars
        }
    });
});

req.on('error', (e) => console.error('Network Error:', e));
req.end();
