const https = require('https');
const fs = require('fs');
const path = require('path');

// Load Env
try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) process.env[key.trim()] = value.trim();
        });
    }
} catch (e) { }

const KEY = process.env.GOOGLE_AI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`;

console.log(`Querying: ${URL}`);

https.get(URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('✅ Available Models:');
                json.models.forEach(m => {
                    if (m.name.includes('gemini')) console.log(`- ${m.name}`);
                });
            } else {
                console.log('❌ Error:', JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log('❌ Parse Error:', data);
        }
    });
}).on('error', (e) => console.error('Network Error:', e));
