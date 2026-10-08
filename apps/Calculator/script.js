let ratio = null;
let updating = false; // Biến để ngăn vòng lặp oninput

function switchMainTab(tabId) {
    document.querySelectorAll('.main-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.getElementById(tabId);
    activeTab.classList.add('active');
    document.querySelector(`button[onclick="switchMainTab('${tabId}')"]`).classList.add('active');
    if (tabId === 'geometry') {
        switchSubTab('triangle');
    } else if (tabId === 'ratio') {
        updateRatio();
    } else if (tabId === 'sensor') {
        calculateSensor();
    }
}

function switchSubTab(tabId) {
    document.querySelectorAll('.sub-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.getElementById(tabId);
    activeTab.style.display = 'block';
    document.querySelector(`button[onclick="switchSubTab('${tabId}')"]`).classList.add('active');
    
    // Trigger calculation for the active tab
    switch (tabId) {
        case 'triangle':
            calculateTriangle();
            break;
        case 'circle':
            calculateCircle();
            break;
        case 'rectangle':
            calculateRectangle();
            break;
        case 'cylinder':
            calculateCylinder();
            break;
        case 'cone':
            calculateCone();
            break;
        case 'pyramid':
            calculatePyramid();
            break;
    }
}

function calculateTriangle() {
    const a = parseFloat(document.getElementById('tri-a').value);
    const b = parseFloat(document.getElementById('tri-b').value);
    const c = parseFloat(document.getElementById('tri-c').value);
    const h = parseFloat(document.getElementById('tri-h').value);

    let perimeter = '-';
    let area = '-';
    let volume = '-';

    try {
        if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a > 0 && b > 0 && c > 0) {
            if (a + b <= c || b + c <= a || a + c <= b) {
                throw new Error('Invalid triangle');
            }
            perimeter = (a + b + c).toFixed(2);
            const s = (a + b + c) / 2;
            area = Math.sqrt(s * (s - a) * (s - b) * (s - c)).toFixed(2);
            if (!isNaN(h) && h > 0) {
                volume = ((area * h) / 3).toFixed(2);
            }
        }
    } catch {
        perimeter = '-';
        area = '-';
        volume = '-';
    }

    document.getElementById('tri-perimeter').textContent = perimeter;
    document.getElementById('tri-area').textContent = area;
    document.getElementById('tri-volume').textContent = volume;
}

function calculateCircle() {
    const radius = parseFloat(document.getElementById('circ-radius').value);

    let circumference = '-';
    let area = '-';
    let volume = '-';

    try {
        if (!isNaN(radius) && radius >= 0) {
            circumference = (2 * Math.PI * radius).toFixed(2);
            area = (Math.PI * radius ** 2).toFixed(2);
            volume = ((4 / 3) * Math.PI * radius ** 3).toFixed(2);
        }
    } catch {
        circumference = '-';
        area = '-';
        volume = '-';
    }

    document.getElementById('circ-circumference').textContent = circumference;
    document.getElementById('circ-area').textContent = area;
    document.getElementById('circ-volume').textContent = volume;
}

function calculateRectangle() {
    const length = parseFloat(document.getElementById('rect-length').value);
    const width = parseFloat(document.getElementById('rect-width').value);
    const height = parseFloat(document.getElementById('rect-height').value);

    let perimeter = '-';
    let area = '-';
    let volume = '-';

    try {
        if (!isNaN(length) && !isNaN(width) && length >= 0 && width >= 0) {
            perimeter = (2 * (length + width)).toFixed(2);
            area = (length * width).toFixed(2);
            if (!isNaN(height) && height >= 0) {
                volume = (length * width * height).toFixed(2);
            }
        }
    } catch {
        perimeter = '-';
        area = '-';
        volume = '-';
    }

    document.getElementById('rect-perimeter').textContent = perimeter;
    document.getElementById('rect-area').textContent = area;
    document.getElementById('rect-volume').textContent = volume;
}

function calculateCylinder() {
    const radius = parseFloat(document.getElementById('cyl-radius').value);
    const circumference = parseFloat(document.getElementById('cyl-circumference').value);
    const height = parseFloat(document.getElementById('cyl-height').value);

    let volume = '-';

    try {
        if (isNaN(height) || height < 0) {
            throw new Error('Invalid height');
        }
        let r;
        if (!isNaN(radius) && radius >= 0) {
            r = radius;
        } else if (!isNaN(circumference) && circumference >= 0) {
            r = circumference / (2 * Math.PI);
        } else {
            throw new Error('No radius or circumference');
        }
        volume = (Math.PI * r ** 2 * height).toFixed(2);
    } catch {
        volume = '-';
    }

    document.getElementById('cyl-volume').textContent = volume;
}

function calculateCone() {
    const radius = parseFloat(document.getElementById('cone-radius').value);
    const circumference = parseFloat(document.getElementById('cone-circumference').value);
    const height = parseFloat(document.getElementById('cone-height').value);

    let volume = '-';

    try {
        if (isNaN(height) || height < 0) {
            throw new Error('Invalid height');
        }
        let r;
        if (!isNaN(radius) && radius >= 0) {
            r = radius;
        } else if (!isNaN(circumference) && circumference >= 0) {
            r = circumference / (2 * Math.PI);
        } else {
            throw new Error('No radius or circumference');
        }
        volume = ((Math.PI * r ** 2 * height) / 3).toFixed(2);
    } catch {
        volume = '-';
    }

    document.getElementById('cone-volume').textContent = volume;
}

function calculatePyramid() {
    const length = parseFloat(document.getElementById('pyr-length').value);
    const width = parseFloat(document.getElementById('pyr-width').value);
    const height = parseFloat(document.getElementById('pyr-height').value);

    let volume = '-';

    try {
        if (!isNaN(length) && !isNaN(width) && !isNaN(height) && length >= 0 && width >= 0 && height >= 0) {
            volume = ((length * width * height) / 3).toFixed(2);
        }
    } catch {
        volume = '-';
    }

    document.getElementById('pyr-volume').textContent = volume;
}

function keepRatio() {
    const a = parseFloat(document.getElementById('ratio-a').value);
    const b = parseFloat(document.getElementById('ratio-b').value);
    const btn = document.getElementById('keep-ratio-btn');
    
    if (ratio !== null) {
        // Toggle off: Unactive button
        ratio = null;
        btn.classList.remove('active');
        document.getElementById('ratio-result').textContent = '-';
    } else {
        // Toggle on: Set ratio if valid
        if (!isNaN(a) && !isNaN(b) && a > 0 && b > 0) {
            ratio = a / b;
            btn.classList.add('active');
            document.getElementById('ratio-result').textContent = ratio.toFixed(3);
        } else {
            ratio = null;
            btn.classList.remove('active');
            document.getElementById('ratio-result').textContent = '-';
        }
    }
}

function updateRatio(changedInput) {
    if (updating) return; // Ngăn vòng lặp oninput
    updating = true;

    const btn = document.getElementById('keep-ratio-btn');
    const aInput = document.getElementById('ratio-a');
    const bInput = document.getElementById('ratio-b');
    const a = parseFloat(aInput.value);
    const b = parseFloat(bInput.value);

    if (ratio === null) {
        btn.classList.remove('active');
        document.getElementById('ratio-result').textContent = '-';
        updating = false;
        return;
    }

    if (changedInput === 'a' && !isNaN(a) && a >= 0) {
        // Số A được chỉnh sửa
        const newB = a / ratio;
        bInput.value = newB.toFixed(2);
        document.getElementById('ratio-result').textContent = (a / newB).toFixed(3);
    } else if (changedInput === 'b' && !isNaN(b) && b >= 0) {
        // Số B được chỉnh sửa
        const newA = b * ratio;
        aInput.value = newA.toFixed(2);
        document.getElementById('ratio-result').textContent = (newA / b).toFixed(3);
    }

    updating = false;
}

function calculateSensor() {
    const widthPixel = parseFloat(document.getElementById('sensor-width-pixel').value);
    const heightPixel = parseFloat(document.getElementById('sensor-height-pixel').value);
    const pixelSize = parseFloat(document.getElementById('sensor-pixel-size').value);

    let length = '-';
    let height = '-';
    let diagonal = '-';
    let ratio = '-';

    try {
        if (!isNaN(widthPixel) && !isNaN(heightPixel) && !isNaN(pixelSize) && widthPixel > 0 && heightPixel > 0 && pixelSize > 0) {
            // Tính chiều dài cảm biến (mm)
            length = (widthPixel * pixelSize / 1000).toFixed(2);
            // Tính chiều cao cảm biến (mm)
            height = (heightPixel * pixelSize / 1000).toFixed(2);
            // Tính chiều chéo cảm biến (mm)
            diagonal = Math.sqrt(length * length + height * height).toFixed(2);
            // Tính tỉ lệ cảm biến (width/height)
            ratio = (length / height).toFixed(3);
        }
    } catch {
        length = '-';
        height = '-';
        diagonal = '-';
        ratio = '-';
    }

    document.getElementById('sensor-length').textContent = length;
    document.getElementById('sensor-height').textContent = height;
    document.getElementById('sensor-diagonal').textContent = diagonal;
    document.getElementById('sensor-ratio').textContent = ratio;
}

// Gắn sự kiện input trực tiếp qua JavaScript để đảm bảo tương thích
document.getElementById('ratio-a').addEventListener('input', () => updateRatio('a'));
document.getElementById('ratio-b').addEventListener('input', () => updateRatio('b'));
document.getElementById('ratio-a').addEventListener('change', () => updateRatio('a'));
document.getElementById('ratio-b').addEventListener('change', () => updateRatio('b'));

// Initialize with Geometry Calculator tab
switchMainTab('geometry');