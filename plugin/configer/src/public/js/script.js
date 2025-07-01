const global = { 'filename': '' };

async function fetchFiles() {
    const res = await fetch('/api/configs');
    const files = await res.json();
    const filesDiv = document.getElementById('files');
    filesDiv.innerHTML = '<strong>Select a file:</strong><br>';

    files.forEach(file => {
        const btn = document.createElement('button');
        btn.textContent = file;
        btn.onclick = () => loadFile(file);
        filesDiv.appendChild(btn);
    });
}

async function loadFile(filename) {
    global.filename = filename

    let res = await fetch(`/api/config/${filename}`);
    const data = await res.json();

    try {
        res = await fetch(`api/content/pending-count/${filename}`)
    } catch (err) {
        console.log(`fetch config file error: ${err}`)
    }

    renderEditor(data, filename, (await res.json()).pendingCount);
}

// function renderObject(data, form, filename) {
//     const updatedData = { ...data };
//     for (const [key, value] of Object.entries(data)) {
//         console.log(`${key} : ${value}`)
//         const label = document.createElement('label');
//         label.textContent = key;

//         let input;
//         if (typeof value === 'string') {
//             input = document.createElement('input');
//             input.type = 'text';
//             input.value = value;
//         } else if (typeof value === 'number') {
//             input = document.createElement('input');
//             input.type = 'number';
//             input.value = value;
//         } else if (typeof value === 'boolean') {
//             input = document.createElement('input');
//             input.type = 'checkbox';
//             input.checked = value;
//         } else if (typeof value === 'object') {
//             renderObject(value, form, filename)
//             return
//         }

//         input.onchange = () => {
//             if (input.type === 'checkbox') {
//                 updatedData[key] = input.checked;
//             } else if (input.type === 'number') {
//                 updatedData[key] = parseFloat(input.value);
//             } else {
//                 updatedData[key] = input.value;
//             }

//             // Save immediately
//             fetch(`/api/config/${filename}`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(updatedData),
//             }).then(res => res.json())
//                 .then(res => {
//                     if (!res.success) alert('Failed to save file.');
//                 });
//         };

//         form.appendChild(label);
//         form.appendChild(input);
//     }
// }

// function renderEditor(data, filename) {
//     const editor = document.getElementById('editor');
//     editor.innerHTML = `<h2>Editing: ${filename}</h2>`;

//     const form = document.createElement('form');
//     renderObject(data, form, filename)
//     editor.appendChild(form);
// }

// function renderEditor(data, filename) {
//     const editor = document.getElementById('editor');
//     editor.innerHTML = `<h2>Structure of: ${filename}</h2>`;

//     let list = document.createElement('ul');
//     const updatedData = { ...data }

//     function addPlusButton(dom, text) {
//         const labelAndButton = document.createElement('div')
//         labelAndButton.classList.add('plus-button-container')

//         if (text) {
//             const label = document.createElement('span')
//             label.textContent = text
//             labelAndButton.appendChild(label)
//         }

//         const plusButton = document.createElement('button')
//         plusButton.classList.add('plus-button')
//         plusButton.textContent = '+'
//         plusButton.onclick = () => {
//         }

//         labelAndButton.appendChild(plusButton)
//         dom.appendChild(labelAndButton)
//     }

//     function walk(obj, prefix = '', index) {
//         if (Array.isArray(obj)) {
//             addPlusButton(list, prefix)
//             let subList;
//             if (!prefix || prefix.length == 0) {
//                 subList = list
//             } else {
//                 subList = document.createElement('ul')
//             }

//             const rootList = list
//             list = subList
//             if (obj.length === 0) {
//                 listItem(`${prefix}: array (empty)`);
//             } else {
//                 obj.forEach((item, index) => {
//                     walk(item, `${prefix}[${index}]`, index);
//                 });
//             }

//             list = rootList
//             if (prefix && prefix.length > 0) {
//                 list.appendChild(subList);
//             }
//         } else if (typeof obj === 'object' && obj !== null) {
//             const li = document.createElement('li')
//             list.appendChild(li);
//             Object.entries(obj).forEach(([key, value]) => {
//                 // walk(value, prefix ? `${prefix}.${key}` : key);
//                 if(typeof value === 'object' && value !== null) {
//                     walk(value, prefix ? `${prefix}.${key}` : key)
//                 } else {
//                     listItem(`${prefix ? `${prefix}.${key}` : key}: ${typeof value}`, value, li);
//                 }
//             });
//         } else {
//             listItem(`${prefix}: ${typeof obj}`, obj);
//         }
//     }

//     function listItem(label, value, dom) {
//         const li = dom ?? document.createElement('li');
//         const div = document.createElement('div');
//         div.textContent = label;

//         let input;
//         if (typeof value === 'number') {
//             input = document.createElement('input');
//             input.type = 'number';
//             input.value = value;
//         } else if (typeof value === 'boolean') {
//             input = document.createElement('input');
//             input.type = 'checkbox';
//             input.checked = value;
//         } else {
//             input = document.createElement('input');
//             input.type = 'text';
//             input.value = value;
//         }

//         div.appendChild(input);
//         li.appendChild(div);
//         list.appendChild(li);
//     }

//     walk(data);
//     editor.appendChild(list);
// }

function renderItem(key, value, path, parent) {
    console.log(`renderItem: ${path} = ${value}`)
    const li = document.createElement('li');
    li.textContent = key;

    let input;
    if (typeof value === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.value = value;
    } else if (typeof value === 'boolean') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
    }
    input.dataset.path = path

    li.appendChild(input)
    parent.appendChild(li)
}

function addPlusButton(dom, labelText, pathInfo) {
    const labelAndButton = document.createElement('div')
    labelAndButton.classList.add('plus-button-container')

    if (labelText) {
        const label = document.createElement('span')
        label.textContent = labelText
        labelAndButton.appendChild(label)
    }

    const plusButton = document.createElement('button')
    plusButton.classList.add('plus-button')
    plusButton.textContent = '+'
    plusButton.onclick = () => {
        showModalInput(pathInfo)
    }

    labelAndButton.appendChild(plusButton)
    dom.appendChild(labelAndButton)
}

function renderArray(arr, path, parent, key) {
    console.log('renderArray')
    let curParent = parent
    if (key) {
        const arrLabel = document.createElement('li')
        arrLabel.textContent = key
        // addPlusButton(arrLabel, key, path)
        parent.appendChild(arrLabel)
        const subList = document.createElement('ul')
        curParent = subList
    } else {
        // addPlusButton(parent, undefined, path)
    }

    arr.forEach((obj, index) => {
        console.log(`   arr[${index}]`)
        const curPath = `${path}[${index}]`
        if (Array.isArray(obj)) {
            renderArray(obj, curPath, curParent)
        } else {
            renderObject(obj, curPath, curParent)
        }
    })

    if (key) {
        parent.appendChild(curParent)
    }
}

function renderObject(data, path, parent, parentKey) {
    console.log('renderObject')
    const div = document.createElement('div')
    div.classList.add('jobj')
    parent.appendChild(div)
    let curParent = div

    if (parentKey) {
        const arrLabel = document.createElement('li')
        arrLabel.textContent = parentKey
        curParent.appendChild(arrLabel)
        const subList = document.createElement('ul')
        curParent.appendChild(subList)
        curParent = subList
    }

    Object.entries(data).forEach(([key, value]) => {
        const curPath = `${path}.${key}`
        console.log(`   ${path} = ${key}:${value}`)
        if (Array.isArray(value)) {
            renderArray(value, curPath, curParent, key)
        } else if (typeof value === 'object' && value !== null) {
            renderObject(value, curPath, curParent, key)
        } else {
            renderItem(key, value, `${path}.${key}`, curParent)
        }
    });
}

function clearChildrent(parent) {
    if (!parent)
        return

    while (parent.firstChild) {
        parent.removeChild(parent.firstChild)
    }
}

function renderEditor(data, filename, pendingCount) {
    console.log('renderEditor')
    const editor = document.getElementById('editor');
    clearChildrent(editor)

    editor.innerHTML = `<h2>Structure of: ${filename}</h2>`;

    const saveButton = document.createElement('button')
    editor.appendChild(saveButton)
    saveButton.textContent = '파일에 저장'
    saveButton.onclick = () => {
        fetch(`/api/config/${filename}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getJsonFromHtml()),
        }).then(res => res.json())
            .then(res => {
                if (!res.success) alert(`저장실패: ${JSON.stringify(res, null, 2)}`)
                else alert('저장완료')
            });
    }

    const showAllButton = document.createElement('button')
    editor.appendChild(showAllButton)
    showAllButton.textContent = '전체보기'
    showAllButton.onclick = () => {
        showModalJson()
    }

    if (filename.includes('ddotty')) {
        const uploadDiv = document.createElement('div')

        const uploadLabel = document.createElement('span')
        uploadLabel.id = 'upload_label';
        uploadLabel.textContent = pendingCount + '개 대기 중: '

        const uploadButton = document.createElement('button')
        uploadButton.textContent = '업로드'
        uploadButton.onclick = async () => {
            uploadLabel.textContent = '업로드 중...'
            const res = await fetch(`/api/content/upload/${filename}`, {
                method: 'POST',
            })
            console.log(res)
            if(res.status == 200) {
                uploadLabel.textContent = (await res.json()).pendingCount + '개 대기 중: '
            } else {
                uploadLabel.textContent = '업로드 오류'
            }
        };
        uploadDiv.appendChild(uploadLabel)
        uploadDiv.appendChild(uploadButton)

        editor.appendChild(uploadDiv)
    }

    let list = document.createElement('ul');
    if (Array.isArray(data)) {
        renderArray(data, '', list)
    } else {
        renderObject(data, '', list)
    }

    editor.appendChild(list)

    // assertion
    const orgJson = JSON.stringify(data)
    const reformedJson = JSON.stringify(getJsonFromHtml())
    if (orgJson === reformedJson) {
        console.log('renderEditor validation succeeded')
    } else {
        console.error('renderEditor validation failed')
    }
}

fetchFiles();

function getReferenceByJsonPath(obj, path) {
    if (path.length == 0 || path === '$')
        return { parent: null, key: null, target: obj }

    // Remove '$' and split on dots, handling array indexes
    const parts = path
        .replace(/^\$/, '')                    // remove leading $
        .replace(/\[(\d+)\]/g, '.$1')          // convert [index] to .index
        .split('.')
        .filter(Boolean);

    let ref = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        ref = ref[parts[i]];
        if (ref === undefined) return undefined;
    }

    return { parent: ref, key: parts.at(-1), target: ref?.[key] };
}

function getJsonFromHtml() {
    function setValueByPath(obj, path, value) {
        const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(k => k !== '');
        keys.reduce((acc, key, i) => {
            const nextIsArray = /^\d+$/.test(keys[i + 1]);
            if (i === keys.length - 1) {
                acc[key] = value;
            } else {
                if (!acc[key]) {
                    acc[key] = nextIsArray ? [] : {};
                }
                return acc[key];
            }
        }, obj);
    }

    const inputs = document.querySelectorAll('[data-path]');
    const root = []; // root is an array this time
    inputs.forEach(input => {
        let value;
        if (input.type === 'number')
            value = parseFloat(input.value)
        else if (input.type === 'checkbox')
            value = input.checked
        else
            value = input.value;
        setValueByPath(root, input.getAttribute("data-path"), value);
    });
    return root;
}

function resetModalContent() {
    // document.getElementById("modalText").textContent = ''
    clearChildrent(document.getElementById("modalInput"))
}

function showModalJson() {
    resetModalContent()
    const input = document.getElementById("modalTextArea")
    input.value = JSON.stringify(getJsonFromHtml(), null, 2)
    const saveButton = document.getElementById("btnSaveModal")
    saveButton.onclick = () => {
        try {
            renderEditor(JSON.parse(input.value), global.filename)
            closeModal()
        } catch (err) {
            alert(`포멧에 맞게 입력해주세요\n${JSON.stringify(err, null, 2)}`)
        }
    }
    // document.getElementById("modalText").textContent = JSON.stringify(getJsonFromHtml(), null, 2)
    document.getElementById("modal").style.display = "block";
}

function showModalInput(pathInfo) {
    resetModalContent()
    document.getElementById("modalTextArea").value = ''
    const saveButton = document.getElementById("btnSaveModal")
    saveButton.onclick = () => {
        const fullData = getJsonFromHtml()
        const found = getReferenceByJsonPath(fullData, pathInfo)
        const inputValue = document.querySelector('textarea.modal-textarea').value
        try {
            if (Array.isArray(found.target)) {
                const inputObject = JSON.parse(inputValue)
                found.target.push(inputObject)
            } else if (typeof found.parent === 'object' && found.parent !== null) {
                const inputObject = JSON.parse(inputValue)
                if (found.key) {
                    found.parent[found.key] = inputObject
                } else {
                    found.parent = inputObject
                }
            } else {
                let inputObject;
                try {
                    inputObject = JSON.parse(inputValue)
                } catch (err) {
                    inputObject = inputValue
                }

                if (found.key) {
                    found.parent[found.key] = inputObject
                } else {
                    found.parent = inputObject
                }
            }
        } catch (err) {
            alert(`포멧에 맞춰 입력해주세요(${err.message})\n(${inputValue})`)
            return
        }

        renderEditor(fullData, global.filename)
        closeModal()
    }

    document.getElementById("modal").style.display = "block";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}