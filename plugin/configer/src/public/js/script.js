async function fetchFiles() {
    const res = await fetch('/api/files');
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
    const res = await fetch(`/api/file/${filename}`);
    const data = await res.json();
    renderEditor(data, filename);
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
//             fetch(`/api/file/${filename}`, {
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

function addPlusButton(dom, text) {
    const labelAndButton = document.createElement('div')
    labelAndButton.classList.add('plus-button-container')

    if (text) {
        const label = document.createElement('span')
        label.textContent = text
        labelAndButton.appendChild(label)
    }

    const plusButton = document.createElement('button')
    plusButton.classList.add('plus-button')
    plusButton.textContent = '+'
    plusButton.onclick = () => {
    }

    labelAndButton.appendChild(plusButton)
    dom.appendChild(labelAndButton)
}

function renderArray(arr, path, parent, key) {
    console.log('renderArray')
    let curParent = parent
    if (key) {
        const arrLabel = document.createElement('li')
        // arrLabel.textContent = key
        addPlusButton(arrLabel, key)
        parent.appendChild(arrLabel)
        const subList = document.createElement('ul')
        curParent = subList
    } else {
        addPlusButton(parent)
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

function renderEditor(data, filename) {
    console.log('renderEditor')
    const editor = document.getElementById('editor');
    editor.innerHTML = `<h2>Structure of: ${filename}</h2>`;
    const saveButton = document.createElement('button')
    saveButton.textContent = 'save'
    saveButton.onclick = () => {
        fetch(`/api/file/${filename}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getJsonFromHtml()),
        }).then(res => res.json())
            .then(res => {
                if (!res.success) alert('Failed to save file.');
            });
    }
    editor.appendChild(saveButton)

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

function showJson() {
    document.getElementById("modalText").textContent = JSON.stringify(getJsonFromHtml(), null, 2);
    document.getElementById("modal").style.display = "block";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}