const router = require('express').Router()
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const CONFIG_PATH = process.env.CONFIG_PATH || './config';

// List JSON files
router.get('/files', (req, res) => {
    fs.readdir(CONFIG_PATH, (err, files) => {
        if (err) return res.status(500).json({ error: 'Unable to read config directory.' });
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        res.json(jsonFiles);
    });
});

// Get JSON file content
router.get('/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(CONFIG_PATH, filename);

    if (!filename.endsWith('.json')) return res.status(400).json({ error: 'Invalid file type.' });

    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Unable to read file.' });
        res.json(JSON.parse(data));
    });
});

// Save changes to JSON file
router.post('/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(CONFIG_PATH, filename);

    if (!filename.endsWith('.json')) return res.status(400).json({ error: 'Invalid file type.' });

    fs.writeFile(filePath, JSON.stringify(req.body, null, 2), err => {
        if (err) return res.status(500).json({ error: 'Unable to write file.' });
        res.json({ success: true });
    });
});

module.exports = router