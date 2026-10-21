// ===== 全局状态 =====
let currentValue = BigInt(0);
const MASK64 = BigInt('0xFFFFFFFFFFFFFFFF');
let fieldIdCounter = 0;
let historyEntries = [];

// ===== 功能1: 64位二进制位显示 =====
function initBitDisplay() {
    const container = document.getElementById('bitRows');
    container.innerHTML = '';
    const rows = [
        { label: '63:48', start: 48 },
        { label: '47:32', start: 32 },
        { label: '31:16', start: 16 },
        { label: '15:0',  start: 0  },
    ];
    for (const row of rows) {
        const rowEl = document.createElement('div');
        rowEl.className = 'bit-row';
        const labelEl = document.createElement('span');
        labelEl.className = 'bit-row-label';
        labelEl.textContent = row.label;
        rowEl.appendChild(labelEl);
        const bitsEl = document.createElement('div');
        bitsEl.className = 'bit-row-bits';
        for (let g = 0; g < 4; g++) {
            const groupEl = document.createElement('div');
            groupEl.className = 'bit-group-4';
            for (let i = 3; i >= 0; i--) {
                const bitIndex = row.start + (3 - g) * 4 + i;
                const bitEl = document.createElement('div');
                bitEl.className = 'bit';
                bitEl.textContent = '0';
                bitEl.dataset.bit = bitIndex;
                bitEl.title = `Bit ${bitIndex}`;
                bitEl.addEventListener('click', () => toggleBit(bitIndex));
                groupEl.appendChild(bitEl);
            }
            bitsEl.appendChild(groupEl);
        }
        rowEl.appendChild(bitsEl);
        container.appendChild(rowEl);
    }
}

function toggleBit(bitIndex) {
    currentValue ^= (BigInt(1) << BigInt(bitIndex));
    currentValue &= MASK64;
    updateAllDisplays();
}

function updateAllDisplays() {
    updateBitDisplay();
    updateRepresentations();
    updateAllFields();
    updateMainShiftPreview();
}

function updateBitDisplay() {
    document.querySelectorAll('.bit').forEach(el => {
        const idx = parseInt(el.dataset.bit);
        const val = (currentValue >> BigInt(idx)) & BigInt(1);
        el.textContent = val.toString();
        el.classList.toggle('active', val === BigInt(1));
    });
}

function updateRepresentations() {
    document.getElementById('hexInput').value = '0x' + currentValue.toString(16).toUpperCase().padStart(16, '0');
    document.getElementById('decInput').value = currentValue.toString(10);
    const binStr = currentValue.toString(2).padStart(64, '0');
    document.getElementById('binInput').value = binStr.match(/.{1,4}/g).join(' ');
}

// 三种进制输入
document.getElementById('hexInput').addEventListener('change', function() {
    try {
        let v = this.value.trim().replace(/^0x/i, '').replace(/\s/g, '');
        if (!v) v = '0';
        if (!/^[0-9a-fA-F]+$/.test(v)) { alert('无效的十六进制数'); updateRepresentations(); return; }
        currentValue = BigInt('0x' + v) & MASK64;
        updateAllDisplays();
    } catch(e) { alert('错误: ' + e.message); updateRepresentations(); }
});

document.getElementById('decInput').addEventListener('change', function() {
    try {
        let v = this.value.trim().replace(/,/g, '');
        if (!v) v = '0';
        let n = BigInt(v);
        if (n < BigInt(0)) n = (BigInt(1) << BigInt(64)) + n;
        currentValue = n & MASK64;
        updateAllDisplays();
    } catch(e) { alert('错误: ' + e.message); updateRepresentations(); }
});

document.getElementById('binInput').addEventListener('change', function() {
    try {
        let v = this.value.trim().replace(/\s/g, '');
        if (!v) v = '0';
        if (!/^[01]+$/.test(v)) { alert('无效的二进制数'); updateRepresentations(); return; }
        if (v.length > 64) v = v.slice(-64);
        currentValue = BigInt('0b' + v) & MASK64;
        updateAllDisplays();
    } catch(e) { alert('错误: ' + e.message); updateRepresentations(); }
});

// ===== 64位移位功能（只输出结果，不修改原值）=====
function doShift64(val, bits, mode, direction) {
    bits = Math.max(0, Math.min(64, bits));
    if (bits === 0) return val & MASK64;

    if (direction === 'left') {
        if (mode === 'rotate') {
            const left = (val << BigInt(bits)) & MASK64;
            const right = (val >> BigInt(64 - bits)) & MASK64;
            return (left | right) & MASK64;
        } else {
            return (val << BigInt(bits)) & MASK64;
        }
    } else {
        if (mode === 'logical') {
            return (val >> BigInt(bits)) & MASK64;
        } else if (mode === 'arithmetic') {
            const signBit = (val >> BigInt(63)) & BigInt(1);
            let result = val >> BigInt(bits);
            if (signBit === BigInt(1)) {
                const fillMask = (MASK64 >> BigInt(64 - bits)) << BigInt(64 - bits);
                result = (result | fillMask) & MASK64;
            }
            return result & MASK64;
        } else {
            const right = (val >> BigInt(bits)) & MASK64;
            const left = (val << BigInt(64 - bits)) & MASK64;
            return (left | right) & MASK64;
        }
    }
}

function formatBigInt64(val) {
    const binStr = val.toString(2).padStart(64, '0');
    return binStr.match(/.{1,4}/g).join(' ');
}

function mainShift(direction) {
    updateMainShiftPreview(direction);
}

function resetMainShift() {
    const previewEl = document.getElementById('mainShiftResult');
    previewEl.innerHTML = '<span style="color:#666">(已重置)</span>';
    document.getElementById('mainShiftBits').value = '1';
}

function updateMainShiftPreview(direction) {
    const bits = parseInt(document.getElementById('mainShiftBits').value) || 0;
    const mode = document.querySelector('input[name="mainShiftMode"]:checked').value;
    const previewEl = document.getElementById('mainShiftResult');
    if (bits === 0) {
        previewEl.innerHTML = '<span style="color:#666">(无移位)</span>';
        return;
    }

    if (direction === 'left' || direction === 'right') {
        const result = doShift64(currentValue, bits, mode, direction);
        const dirLabel = direction === 'left' ? '⟵ 左移' : '⟶ 右移';
        previewEl.innerHTML = `
            <div class="preview-dir">
                <span class="dir-label">${dirLabel}:</span>
                <span class="dir-val">HEX 0x${result.toString(16).toUpperCase().padStart(16,'0')}</span>
                <span class="dir-val">DEC ${result.toString(10)}</span>
                <span class="dir-val">BIN ${formatBigInt64(result)}</span>
            </div>
        `;
    } else {
        const previewLeft = doShift64(currentValue, bits, mode, 'left');
        const previewRight = doShift64(currentValue, bits, mode, 'right');
        previewEl.innerHTML = `
            <div class="preview-dir">
                <span class="dir-label">⟵ 左移:</span>
                <span class="dir-val">HEX 0x${previewLeft.toString(16).toUpperCase().padStart(16,'0')}</span>
                <span class="dir-val">DEC ${previewLeft.toString(10)}</span>
                <span class="dir-val">BIN ${formatBigInt64(previewLeft)}</span>
            </div>
            <div class="preview-dir">
                <span class="dir-label">⟶ 右移:</span>
                <span class="dir-val">HEX 0x${previewRight.toString(16).toUpperCase().padStart(16,'0')}</span>
                <span class="dir-val">DEC ${previewRight.toString(10)}</span>
                <span class="dir-val">BIN ${formatBigInt64(previewRight)}</span>
            </div>
        `;
    }
}

document.getElementById('mainShiftBits').addEventListener('input', () => updateMainShiftPreview());
document.querySelectorAll('input[name="mainShiftMode"]').forEach(r => {
    r.addEventListener('change', () => updateMainShiftPreview());
});

// ===== 域段提取 =====
function addField() {
    const id = fieldIdCounter++;
    const list = document.getElementById('fieldList');
    const item = document.createElement('div');
    item.className = 'field-item';
    item.id = `field-${id}`;
    item.innerHTML = `
        <div class="field-item-header">
            <span class="field-tag">#${id + 1}</span>
            <input type="text" class="field-name-input" placeholder="域段名称" data-field-id="${id}">
            <input type="text" placeholder="高位:低位，如 20:16" oninput="onFieldInput(${id})" onkeydown="if(event.key==='Enter')onFieldInput(${id})">
            <button class="btn-reset" onclick="resetField(${id})" title="重置移位">↺ 重置</button>
            <button class="btn-delete" onclick="removeField(${id})">删除</button>
        </div>
        <div class="field-result-row">
            <div class="field-result-cell"><span class="label">HEX </span><span id="fieldHex-${id}">-</span></div>
            <div class="field-result-cell"><span class="label">DEC </span><span id="fieldDec-${id}">-</span></div>
            <div class="field-result-cell"><span class="label">BIN </span><span id="fieldBin-${id}">-</span></div>
        </div>
        <div class="field-shift">
            <div class="field-shift-row">
                <label>移位:</label>
                <input type="number" id="fieldShiftBits-${id}" value="1" min="0" max="64" oninput="updateFieldShiftResult(${id})">
                <select id="fieldShiftMode-${id}" onchange="updateFieldShiftResult(${id})">
                    <option value="logical">逻辑</option>
                    <option value="arithmetic">算术</option>
                    <option value="rotate">循环</option>
                </select>
                <button class="field-shift-btn" onclick="updateFieldShiftResult(${id},'left')">⟵ 左</button>
                <button class="field-shift-btn" onclick="updateFieldShiftResult(${id},'right')">右 ⟶</button>
            </div>
            <div class="field-shift-result">
                <div class="field-shift-cell"><span class="label">HEX </span><span id="fieldShiftHex-${id}">-</span></div>
                <div class="field-shift-cell"><span class="label">DEC </span><span id="fieldShiftDec-${id}">-</span></div>
                <div class="field-shift-cell"><span class="label">BIN </span><span id="fieldShiftBin-${id}">-</span></div>
            </div>
        </div>
    `;
    list.appendChild(item);
}

function removeField(id) {
    const el = document.getElementById(`field-${id}`);
    if (el) el.remove();
}

function resetField(id) {
    document.getElementById(`fieldShiftHex-${id}`).textContent = '-';
    document.getElementById(`fieldShiftDec-${id}`).textContent = '-';
    document.getElementById(`fieldShiftBin-${id}`).textContent = '-';
    const bitsInput = document.getElementById(`fieldShiftBits-${id}`);
    if (bitsInput) bitsInput.value = '1';
}

function onFieldInput(id) {
    const item = document.getElementById(`field-${id}`);
    if (!item) return;
    const input = item.querySelector('input[type="text"]:not(.field-name-input)');
    const rangeStr = input.value.trim();
    const match = rangeStr.match(/^(\d+)\s*:\s*(\d+)$/);
    if (!match) {
        document.getElementById(`fieldHex-${id}`).textContent = '-';
        document.getElementById(`fieldDec-${id}`).textContent = '-';
        document.getElementById(`fieldBin-${id}`).textContent = '-';
        clearFieldShiftResult(id);
        return;
    }
    const high = parseInt(match[1]);
    const low = parseInt(match[2]);
    if (high < low || high > 63 || low < 0) {
        document.getElementById(`fieldHex-${id}`).textContent = '范围无效';
        document.getElementById(`fieldDec-${id}`).textContent = '-';
        document.getElementById(`fieldBin-${id}`).textContent = '-';
        clearFieldShiftResult(id);
        return;
    }
    const width = high - low + 1;
    const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
    const fieldVal = (currentValue >> BigInt(low)) & mask;

    document.getElementById(`fieldHex-${id}`).textContent = '0x' + fieldVal.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0');
    document.getElementById(`fieldDec-${id}`).textContent = fieldVal.toString(10);
    const binStr = fieldVal.toString(2).padStart(width, '0');
    document.getElementById(`fieldBin-${id}`).textContent = binStr.match(/.{1,4}/g).join(' ');

    updateFieldShiftResult(id);
}

function clearFieldShiftResult(id) {
    document.getElementById(`fieldShiftHex-${id}`).textContent = '-';
    document.getElementById(`fieldShiftDec-${id}`).textContent = '-';
    document.getElementById(`fieldShiftBin-${id}`).textContent = '-';
}

function getFieldWidth(id) {
    const item = document.getElementById(`field-${id}`);
    if (!item) return 0;
    const input = item.querySelector('input[type="text"]:not(.field-name-input)');
    const match = input.value.trim().match(/^(\d+)\s*:\s*(\d+)$/);
    if (!match) return 0;
    const high = parseInt(match[1]);
    const low = parseInt(match[2]);
    if (high < low || high > 63 || low < 0) return 0;
    return high - low + 1;
}

function getFieldVal(id) {
    const item = document.getElementById(`field-${id}`);
    if (!item) return BigInt(0);
    const input = item.querySelector('input[type="text"]:not(.field-name-input)');
    const match = input.value.trim().match(/^(\d+)\s*:\s*(\d+)$/);
    if (!match) return BigInt(0);
    const high = parseInt(match[1]);
    const low = parseInt(match[2]);
    const width = high - low + 1;
    const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
    return (currentValue >> BigInt(low)) & mask;
}

function doShiftN(val, bits, mode, direction, width) {
    const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
    bits = Math.max(0, Math.min(width, bits));
    if (bits === 0) return val & mask;

    if (direction === 'left') {
        if (mode === 'rotate') {
            const left = (val << BigInt(bits)) & mask;
            const right = (val >> BigInt(width - bits)) & mask;
            return (left | right) & mask;
        } else {
            return (val << BigInt(bits)) & mask;
        }
    } else {
        if (mode === 'logical') {
            return (val >> BigInt(bits)) & mask;
        } else if (mode === 'arithmetic') {
            const signBit = (val >> BigInt(width - 1)) & BigInt(1);
            let result = val >> BigInt(bits);
            if (signBit === BigInt(1)) {
                const fillMask = (mask >> BigInt(width - bits)) << BigInt(width - bits);
                result = (result | fillMask) & mask;
            }
            return result & mask;
        } else {
            const right = (val >> BigInt(bits)) & mask;
            const left = (val << BigInt(width - bits)) & mask;
            return (left | right) & mask;
        }
    }
}

function formatBigIntN(val, width) {
    const binStr = val.toString(2).padStart(width, '0');
    return binStr.match(/.{1,4}/g).join(' ');
}

function updateFieldShiftResult(id, direction) {
    const bits = parseInt(document.getElementById(`fieldShiftBits-${id}`)?.value) || 0;
    const mode = document.getElementById(`fieldShiftMode-${id}`)?.value || 'logical';
    const width = getFieldWidth(id);
    if (width === 0) { clearFieldShiftResult(id); return; }
    const val = getFieldVal(id);
    if (bits === 0) {
        document.getElementById(`fieldShiftHex-${id}`).textContent = '(无移位)';
        document.getElementById(`fieldShiftDec-${id}`).textContent = '-';
        document.getElementById(`fieldShiftBin-${id}`).textContent = '-';
        return;
    }
    
    if (direction === 'left' || direction === 'right') {
        const result = doShiftN(val, bits, mode, direction, width);
        document.getElementById(`fieldShiftHex-${id}`).textContent = `0x${result.toString(16).toUpperCase()}`;
        document.getElementById(`fieldShiftDec-${id}`).textContent = result.toString(10);
        document.getElementById(`fieldShiftBin-${id}`).textContent = formatBigIntN(result, width);
    } else {
        const leftResult = doShiftN(val, bits, mode, 'left', width);
        const rightResult = doShiftN(val, bits, mode, 'right', width);
        document.getElementById(`fieldShiftHex-${id}`).textContent =
            `←0x${leftResult.toString(16).toUpperCase()} | →0x${rightResult.toString(16).toUpperCase()}`;
        document.getElementById(`fieldShiftDec-${id}`).textContent =
            `←${leftResult.toString(10)} | →${rightResult.toString(10)}`;
        document.getElementById(`fieldShiftBin-${id}`).textContent =
            `←${formatBigIntN(leftResult,width)} | →${formatBigIntN(rightResult,width)}`;
    }
}

function updateAllFields() {
    document.querySelectorAll('.field-item').forEach(item => {
        const input = item.querySelector('input[type="text"]:not(.field-name-input)');
        if (input && input.value.trim()) {
            const id = parseInt(item.id.replace('field-', ''));
            onFieldInput(id);
        }
    });
}

// ===== 导出/导入功能 =====
function collectAllData() {
    const fields = [];
    document.querySelectorAll('.field-item').forEach(item => {
        const id = parseInt(item.id.replace('field-', ''));
        const nameInput = item.querySelector('.field-name-input');
        const rangeInput = item.querySelector('input[type="text"]:not(.field-name-input)');
        const shiftBits = document.getElementById(`fieldShiftBits-${id}`);
        const shiftMode = document.getElementById(`fieldShiftMode-${id}`);
        
        fields.push({
            name: nameInput ? nameInput.value : '',
            range: rangeInput ? rangeInput.value : '',
            shiftBits: shiftBits ? shiftBits.value : '1',
            shiftMode: shiftMode ? shiftMode.value : 'logical'
        });
    });
    
    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        currentValue: currentValue.toString(),
        mainShift: {
            bits: document.getElementById('mainShiftBits').value,
            mode: document.querySelector('input[name="mainShiftMode"]:checked').value
        },
        fields: fields,
        history: historyEntries
    };
}

function exportJSON() {
    const data = collectAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chip_calc_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showExportMsg('JSON 导出成功', 'success');
}

function exportText() {
    const data = collectAllData();
    let text = '=== 数字芯片设计前端计算器 - 数据报告 ===\n';
    text += `导出时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}\n\n`;
    
    text += '【64位主数值】\n';
    const val = BigInt(data.currentValue);
    text += `  HEX: 0x${val.toString(16).toUpperCase().padStart(16, '0')}\n`;
    text += `  DEC: ${val.toString(10)}\n`;
    text += `  BIN: ${formatBigInt64(val)}\n\n`;
    
    text += '【主移位设置】\n';
    text += `  位数: ${data.mainShift.bits}\n`;
    text += `  模式: ${data.mainShift.mode}\n\n`;
    
    if (data.fields.length > 0) {
        text += '【域段提取】\n';
        data.fields.forEach((f, i) => {
            const name = f.name || `(未命名#${i + 1})`;
            text += `\n  ${i + 1}. ${name}\n`;
            text += `     范围: ${f.range || '-'}\n`;
            if (f.range) {
                const match = f.range.match(/^(\d+)\s*:\s*(\d+)$/);
                if (match) {
                    const high = parseInt(match[1]);
                    const low = parseInt(match[2]);
                    const width = high - low + 1;
                    const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
                    const fieldVal = (val >> BigInt(low)) & mask;
                    text += `     HEX: 0x${fieldVal.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0')}\n`;
                    text += `     DEC: ${fieldVal.toString(10)}\n`;
                    text += `     BIN: ${formatBigIntN(fieldVal, width)}\n`;
                    text += `     移位: ${f.shiftBits}位 (${f.shiftMode})\n`;
                }
            }
        });
        text += '\n';
    }
    
    if (data.history.length > 0) {
        text += '【计算历史】\n';
        data.history.forEach(h => {
            text += `  ${h.expr} = ${h.result}\n`;
        });
    }
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chip_calc_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showExportMsg('文本报告导出成功', 'success');
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.version !== '1.0') {
                throw new Error('不支持的文件版本');
            }
            
            // 恢复主数值
            currentValue = BigInt(data.currentValue) & MASK64;
            
            // 恢复主移位设置
            document.getElementById('mainShiftBits').value = data.mainShift.bits;
            const modeRadio = document.querySelector(`input[name="mainShiftMode"][value="${data.mainShift.mode}"]`);
            if (modeRadio) modeRadio.checked = true;
            
            // 清空现有域段
            document.getElementById('fieldList').innerHTML = '';
            fieldIdCounter = 0;
            
            // 恢复域段
            data.fields.forEach(f => {
                addField();
                const id = fieldIdCounter - 1;
                const item = document.getElementById(`field-${id}`);
                const nameInput = item.querySelector('.field-name-input');
                const rangeInput = item.querySelector('input[type="text"]:not(.field-name-input)');
                const shiftBits = document.getElementById(`fieldShiftBits-${id}`);
                const shiftMode = document.getElementById(`fieldShiftMode-${id}`);
                
                if (nameInput) nameInput.value = f.name || '';
                if (rangeInput) rangeInput.value = f.range || '';
                if (shiftBits) shiftBits.value = f.shiftBits || '1';
                if (shiftMode) shiftMode.value = f.shiftMode || 'logical';
                
                if (f.range) onFieldInput(id);
                if (f.shiftBits && parseInt(f.shiftBits) > 0) updateFieldShiftResult(id);
            });
            
            // 恢复历史
            historyEntries = data.history || [];
            renderHistory();
            
            updateAllDisplays();
            showExportMsg('导入成功', 'success');
        } catch (err) {
            showExportMsg('导入失败: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function copyToClipboard() {
    const data = collectAllData();
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        showExportMsg('已复制到剪贴板', 'success');
    }).catch(err => {
        showExportMsg('复制失败: ' + err.message, 'error');
    });
}

function showExportMsg(msg, type) {
    const el = document.getElementById('exportMsg');
    el.textContent = msg;
    el.className = 'export-msg ' + type;
    setTimeout(() => {
        el.className = 'export-msg';
    }, 3000);
}

// ===== 混合进制表达式计算器（支持按位运算）=====
function tokenize(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
        if (expr[i] === ' ' || expr[i] === '\t') { i++; continue; }
        
        // 数字: 0x..., 0b..., 0d..., 或纯数字
        if (/[0-9]/.test(expr[i]) || (expr[i] === '0' && i + 1 < expr.length && /[xXbBdD]/.test(expr[i + 1]))) {
            let start = i;
            if (expr[i] === '0' && i + 1 < expr.length && /[xXbBdD]/.test(expr[i + 1])) {
                const prefix = expr[i + 1].toLowerCase();
                i += 2;
                if (prefix === 'x') {
                    while (i < expr.length && /[0-9a-fA-F_]/.test(expr[i])) i++;
                    tokens.push({ type: 'num', value: BigInt('0x' + expr.slice(start + 2, i).replace(/_/g, '') || '0') });
                } else if (prefix === 'b') {
                    while (i < expr.length && /[01_]/.test(expr[i])) i++;
                    tokens.push({ type: 'num', value: BigInt('0b' + expr.slice(start + 2, i).replace(/_/g, '') || '0') });
                } else {
                    while (i < expr.length && /[0-9_]/.test(expr[i])) i++;
                    tokens.push({ type: 'num', value: BigInt(expr.slice(start + 2, i).replace(/_/g, '') || '0') });
                }
            } else {
                while (i < expr.length && /[0-9_]/.test(expr[i])) i++;
                tokens.push({ type: 'num', value: BigInt(expr.slice(start, i).replace(/_/g, '')) });
            }
            continue;
        }
        
        // 双字符运算符
        if (i + 1 < expr.length) {
            const two = expr.slice(i, i + 2);
            if (two === '<<' || two === '>>') {
                tokens.push({ type: 'op', value: two });
                i += 2;
                continue;
            }
        }
        
        // 单字符运算符（包括按位运算符）
        if ('+-*/%()&|^~'.includes(expr[i])) {
            tokens.push({ type: 'op', value: expr[i] });
            i++;
            continue;
        }
        
        throw new Error(`无法识别的字符: '${expr[i]}' (位置 ${i})`);
    }
    return tokens;
}

// 递归下降解析器（支持按位运算）
function parseExpr(tokens) {
    let pos = 0;

    function peek() { return pos < tokens.length ? tokens[pos] : null; }
    function consume() { return tokens[pos++]; }

    // expression = bitwiseOr
    function parseExpression() {
        return parseBitwiseOr();
    }

    // bitwiseOr = bitwiseXor ('|' bitwiseXor)*
    function parseBitwiseOr() {
        let left = parseBitwiseXor();
        while (peek() && peek().type === 'op' && peek().value === '|') {
            consume();
            const right = parseBitwiseXor();
            left = left | right;
        }
        return left;
    }

    // bitwiseXor = bitwiseAnd ('^' bitwiseAnd)*
    function parseBitwiseXor() {
        let left = parseBitwiseAnd();
        while (peek() && peek().type === 'op' && peek().value === '^') {
            consume();
            const right = parseBitwiseAnd();
            left = left ^ right;
        }
        return left;
    }

    // bitwiseAnd = bitwiseShift ('&' bitwiseShift)*
    function parseBitwiseAnd() {
        let left = parseBitwiseShift();
        while (peek() && peek().type === 'op' && peek().value === '&') {
            consume();
            const right = parseBitwiseShift();
            left = left & right;
        }
        return left;
    }

    // bitwiseShift = addition (('<<' | '>>') addition)*
    function parseBitwiseShift() {
        let left = parseAddition();
        while (peek() && peek().type === 'op' && (peek().value === '<<' || peek().value === '>>')) {
            const op = consume().value;
            const right = parseAddition();
            left = op === '<<' ? left << right : left >> right;
        }
        return left;
    }

    // addition = term (('+' | '-') term)*
    function parseAddition() {
        let left = parseTerm();
        while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
            const op = consume().value;
            const right = parseTerm();
            left = op === '+' ? left + right : left - right;
        }
        return left;
    }

    // term = unary (('*' | '/' | '%') unary)*
    function parseTerm() {
        let left = parseUnary();
        while (peek() && peek().type === 'op' && ('*/%'.includes(peek().value))) {
            const op = consume().value;
            const right = parseUnary();
            if (op === '*') left = left * right;
            else if (op === '/') {
                if (right === BigInt(0)) throw new Error('除数不能为零');
                left = left / right;
            }
            else left = left % right;
        }
        return left;
    }

    // unary = ('~' | '-' | '+') unary | primary
    function parseUnary() {
        if (peek() && peek().type === 'op' && (peek().value === '~' || peek().value === '-' || peek().value === '+')) {
            const op = consume().value;
            const val = parseUnary();
            if (op === '~') return ~val & MASK64;
            if (op === '-') return -val;
            return val;
        }
        return parsePrimary();
    }

    // primary = NUMBER | '(' expression ')'
    function parsePrimary() {
        const t = peek();
        if (!t) throw new Error('表达式意外结束');
        if (t.type === 'num') {
            consume();
            return t.value;
        }
        if (t.type === 'op' && t.value === '(') {
            consume();
            const val = parseExpression();
            if (!peek() || peek().value !== ')') throw new Error('缺少右括号 )');
            consume();
            return val;
        }
        throw new Error(`意外的 token: ${t.value}`);
    }

    const result = parseExpression();
    if (pos < tokens.length) throw new Error(`多余的输入: ${tokens[pos].value}`);
    return result;
}

function calculateExpr() {
    const expr = document.getElementById('exprInput').value.trim();
    const errEl = document.getElementById('calcError');
    errEl.textContent = '';
    if (!expr) { errEl.textContent = '请输入表达式'; return; }
    try {
        const tokens = tokenize(expr);
        if (tokens.length === 0) { errEl.textContent = '表达式为空'; return; }
        const result = parseExpr(tokens);
        const isNeg = result < BigInt(0);
        const abs = isNeg ? -result : result;
        const binStr = isNeg ? ('-' + abs.toString(2)) : abs.toString(2);
        const formattedBin = isNeg ? '-' + binStr.slice(1).match(/.{1,4}/g).join(' ') : (binStr.match(/.{1,4}/g)?.join(' ') || '0');
        document.getElementById('resultBin').textContent = formattedBin;
        document.getElementById('resultDec').textContent = result.toString(10);
        document.getElementById('resultHex').textContent = isNeg ? '-0x' + abs.toString(16).toUpperCase() : '0x' + abs.toString(16).toUpperCase();
        addHistory(expr, result.toString(10));
    } catch(e) { errEl.textContent = '❌ ' + e.message; }
}

function addHistory(expr, result) {
    historyEntries.unshift({ expr, result });
    if (historyEntries.length > 10) historyEntries.pop();
    renderHistory();
}
function renderHistory() {
    const el = document.getElementById('calcHistory');
    if (historyEntries.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = '<div style="color:#666;font-size:0.8em;margin-bottom:6px;">历史记录</div>' +
        historyEntries.map(h => `<div class="history-entry"><span class="expr">${h.expr}</span><span class="result">= ${h.result}</span></div>`).join('');
}
function clearResult() {
    document.getElementById('resultBin').textContent = '-';
    document.getElementById('resultDec').textContent = '-';
    document.getElementById('resultHex').textContent = '-';
    document.getElementById('calcError').textContent = '';
}

document.getElementById('exprInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') calculateExpr(); });

// ===== 初始化 =====
initBitDisplay();
updateAllDisplays();
addField();
