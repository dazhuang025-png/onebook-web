const https = require('https');

const url = 'https://onebook-one.vercel.app/api/genesis?key=let_there_be_light';

https.get(url, (res) => {
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
}).on('error', (e) => {
    console.error('Error:', e.message);
});
