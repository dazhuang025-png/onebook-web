const https = require('http'); // HTTP for localhost

const url = 'http://localhost:3000/api/genesis?key=let_there_be_light';

console.log('Calling Local Genesis...');
const req = https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            console.log('Body:', JSON.stringify(JSON.parse(data), null, 2));
        } catch (e) {
            console.log('Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});
