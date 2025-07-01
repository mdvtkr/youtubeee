const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const os = require('os');

function expandHome(filepath) {
    if (filepath)
        return filepath.replaceAll('~/', os.homedir() + '/');
    else
        return filepath
}

async function loadConfig(configName) {
    const filePath = path.join(CONFIG_PATH, configName);

    return new Promise((resolve, reject) => {
        if (!configName.endsWith('.json')) return reject(400);
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) return reject(400)
            return resolve(data)
        });
    })
}

async function countFiles(configName) {
    console.log('countFiles')
    return new Promise(async (resolve, reject) => {
        try {
            const data = JSON.parse(await loadConfig(configName));
            let fileCount = 0;
            data.forEach((element) => {
                if (element.file_path) {
                    console.log(`counting ${element.file_path}`)
                    const dirPath = expandHome(element.file_path);
                    try {
                        const files = fs.readdirSync(dirPath);
                        for (const file of files) {
                            const fullPath = path.join(dirPath, file);
                            if (fs.statSync(fullPath).isFile()) {
                                fileCount++;
                            }
                        }
                    } catch (statErr) {
                        console.error(`Error getting stats for ${fullPath}: ${statErr.message}`);
                    }
                }
            });
            resolve(fileCount)
        } catch (err) {
            console.log(`error: ${err}`)
            if (typeof err == 'number')
                reject(err);
            else
                reject({ error: err });
        }
    })
}

const CONFIG_PATH = expandHome(process.env.CONFIG_PATH || './config');
console.log(`config path: ${CONFIG_PATH}`)

const UPLOAD_EXEC = expandHome(process.env.UPLOAD_EXEC || undefined)
console.log(`upload exec: ${UPLOAD_EXEC}`)

// List JSON files
router.get('/configs', (req, res) => {
    fs.readdir(CONFIG_PATH, (err, files) => {
        if (err) return res.status(500).json({ error: 'Unable to read config directory.' });
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        res.json(jsonFiles);
    });
});

// Get JSON file content
router.get('/config/:configName', async (req, res) => {
    try {
        const data = await loadConfig(req.params.configName)
        return res.json(JSON.parse(data))
    } catch (err) {
        if (typeof err == 'number')
            return res.status(err).json({ error: err == 400 ? 'Invalid file type.' : 'Unable to read file.' });
        else
            return res.status(500).json({ error: 'unknown error.', err });
    }
});

// Save changes to JSON file
router.post('/config/:configName', (req, res) => {
    const configName = req.params.configName;
    const filePath = path.join(CONFIG_PATH, configName);

    if (!configName.endsWith('.json')) return res.status(400).json({ error: 'Invalid file type.' });

    fs.writeFile(filePath, JSON.stringify(req.body, null, 2), err => {
        if (err) return res.status(500).json({ error: 'Unable to write file.' });
        res.json({ success: true });
    });
});

router.get('/content/pending-count/:configName', async (req, res) => {
    try {
        const pendingCount = await countFiles(req.params.configName);
        console.log(`pendingCount: ${pendingCount}`)
        res.status(200).json({ pendingCount })
    } catch (err) {
        if (typeof err == 'number')
            res.status(err).json({ error: err == 400 ? 'Invalid file type.' : 'Unable to read file.' });
        else
            res.status(500).json({ error: 'failed to count files', err });
    }
})

router.post('/content/upload/:configName', (req, res) => {
    if (!UPLOAD_EXEC) {
        return res.status(500).json({ error: 'upload command is not configured' })
    }

    const configName = req.params.configName
    const profilePath = expandHome('~/.bashrc');
    const command = `bash -c "source ${profilePath} && ${UPLOAD_EXEC}"`;
    console.log(`executing: ${command}`)

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            const errMsg = `exec error: ${error}`;
            console.error(errMsg);
            res.status(500).json({ error: errMsg })
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);

        try {
            const filesLeft = await countFiles(configName)
            res.status(200).json({ pendingCount: filesLeft })
        } catch (err) {
            console.log(err)
            res.status(500).json({ error: 'failed to count files left', err })
        }
    });
})

module.exports = router