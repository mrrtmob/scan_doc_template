// Global variables for canvas and state management
let canvas = document.getElementById('imageCanvas');
let ctx = canvas.getContext('2d');
let previewCanvas = document.getElementById('previewCanvas');
let previewCtx = previewCanvas.getContext('2d');
let currentImage = null;
let currentImageName = null;
let currentPreviewImage = null;
let isDrawing = false;
let startX, startY;
let boxes = [];

// Preview control variables
let scale = 1;
let translateX = 0;
let translateY = 0;

// Annotation classes storage
let annotationClasses = {};

// Initialize application
function initializeApp() {
    initCanvas();
    loadSettings();
    initializeTabs();
    setupEventListeners();
    showCanvasOverlay();
}

// Canvas initialization
function initCanvas() {
    if (!currentImage) return;

    // Set canvas size to match image size
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    
    // Reset transformation
    canvasScale = 1;
    
    redrawCanvas();
}

// Remove zoom-related functions

function showCanvasOverlay() {
    const overlay = document.getElementById('canvasOverlay');
    overlay.style.display = currentImage ? 'none' : 'flex';
}

// Tab management
function initializeTabs() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load dataset if switching to dataset tab
    if (tabName === 'dataset') {
        loadDataset();
    }
}

// Settings management
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('annotationSettings');
        if (savedSettings) {
            annotationClasses = JSON.parse(savedSettings);
        } else {
            // Default classes
            annotationClasses = {
                '0': { name: 'Name', color: '#FF0000' },
                '1': { name: 'Date of Birth', color: '#00FF00' },
                '2': { name: 'ID Number', color: '#0000FF' }
            };
            saveSettings();
        }
        updateClassSelector();
        updateFilterClassSelector();
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings', 'error');
    }
}

function saveSettings() {
    try {
        localStorage.setItem('annotationSettings', JSON.stringify(annotationClasses));
        updateClassSelector();
        updateFilterClassSelector();
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

function updateClassSelector() {
    const selector = document.getElementById('classSelector');
    if (!selector) return;
    
    selector.innerHTML = '';
    Object.entries(annotationClasses).forEach(([id, classInfo]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = classInfo.name;
        option.style.backgroundColor = classInfo.color + '40';
        selector.appendChild(option);
    });
}

function updateFilterClassSelector() {
    const selector = document.getElementById('filterClass');
    if (!selector) return;
    
    selector.innerHTML = '<option value="all">All Classes</option>';
    Object.entries(annotationClasses).forEach(([id, classInfo]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = classInfo.name;
        selector.appendChild(option);
    });
}

// Drawing functions
function startDrawing(e) {
    if (!currentImage) return;
    
    isDrawing = true;
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
}

function draw(e) {
    if (!isDrawing || !currentImage) return;
    
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Redraw existing content
    redrawCanvas();
    
    // Draw preview box
    const classId = document.getElementById('classSelector').value;
    const classInfo = annotationClasses[classId];
    
    // Set drawing styles
    ctx.strokeStyle = classInfo.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6]); // Dashed line for preview
    
    // Calculate box dimensions and position
    const width = currentX - startX;
    const height = currentY - startY;
    const boxX = Math.min(startX, currentX);
    const boxY = Math.min(startY, currentY);
    const boxWidth = Math.abs(width);
    const boxHeight = Math.abs(height);
    
    // Draw the preview box
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw dimensions
    ctx.fillStyle = classInfo.color;
    ctx.font = '12px Arial';
    const dimensionText = `${Math.abs(Math.round(width))}x${Math.abs(Math.round(height))}`;
    // Position text above the box, using the higher Y coordinate
    const textY = Math.min(startY, currentY) - 5;
    const textX = Math.min(startX, currentX);
    ctx.fillText(dimensionText, textX, textY);
    
    // Reset line dash
    ctx.setLineDash([]);
}
// Remove setupCanvasControls function as it's no longer needed

function endDrawing(e) {
    if (!isDrawing || !currentImage) return;
    
    isDrawing = false;
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    // Calculate box dimensions
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Minimum size (10 pixels)
    const minSize = 10;
    
    if (width > minSize && height > minSize) {
        boxes.push({
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(width),
            height: Math.abs(height),
            class: document.getElementById('classSelector').value,
            imageWidth: canvas.width,
            imageHeight: canvas.height
        });
        redrawCanvas();
    } else {
        // If box is too small, just redraw without adding
        redrawCanvas();
        showNotification('Box too small - draw larger', 'info');
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (currentImage) {
        ctx.drawImage(currentImage, 0, 0);
        
        // Draw boxes
        boxes.forEach((box, index) => {
            const classInfo = annotationClasses[box.class];
            ctx.strokeStyle = classInfo.color;
            ctx.lineWidth = 2;
            
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Draw label
            ctx.fillStyle = classInfo.color;
            ctx.font = '12px Arial';
            ctx.fillText(`${classInfo.name} (${index + 1})`, box.x, box.y - 5);
        });
    }
}

// Dataset management
function loadDataset() {
    showLoading();
    fetch('/get_dataset')
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            renderDataset(data);
            updateDatasetStats(data);
        })
        .catch(error => {
            console.error('Error loading dataset:', error);
            showNotification('Error loading dataset', 'error');
        })
        .finally(hideLoading);
}

function renderDataset(data) {
    const grid = document.getElementById('datasetGrid');
    grid.innerHTML = '';
    
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dataset-item';
        
        const img = document.createElement('img');
        img.src = item.path;
        img.alt = item.filename;
        img.classList.add('loading');
        
        const info = document.createElement('div');
        info.className = 'dataset-item-info';
        info.innerHTML = `
            <p class="filename">${item.filename}</p>
            <p class="annotation-count">${item.annotations.length} annotations</p>
        `;
        
        div.appendChild(img);
        div.appendChild(info);
        
        img.onload = () => {
            img.classList.remove('loading');
        };
        
        img.onerror = () => {
            img.src = '/static/placeholder.png';
            img.classList.add('error');
        };
        
        div.addEventListener('click', () => showPreview(item));
        grid.appendChild(div);
    });
}

function updateDatasetStats(data) {
    const totalImages = data.length;
    const totalAnnotations = data.reduce((sum, item) => sum + item.annotations.length, 0);
    
    document.getElementById('totalImages').textContent = `Total Images: ${totalImages}`;
    document.getElementById('totalAnnotations').textContent = `Total Annotations: ${totalAnnotations}`;
}

// Preview functionality
function showPreview(item) {
    const modal = document.getElementById('previewModal');
    const annotationInfo = document.getElementById('annotationInfo');
    
    // Reset transform
    scale = 1;
    translateX = 0;
    translateY = 0;
    
    currentPreviewImage = new Image();
    currentPreviewImage.onload = function() {
        previewCanvas.width = currentPreviewImage.width;
        previewCanvas.height = currentPreviewImage.height;
        redrawPreview();
        
        // Generate annotation info
        let annotationsHtml = '<h3>Annotations:</h3><div class="annotation-list">';
        item.annotations.forEach((annotation, index) => {
            const [classId] = annotation.trim().split(' ');
            const classInfo = annotationClasses[classId] || { name: `Class ${classId}`, color: '#FF0000' };
            annotationsHtml += `
                <div class="annotation-item">
                    <span class="annotation-class" style="background-color: ${classInfo.color}">
                        ${classInfo.name} (${index + 1})
                    </span>
                    <span class="annotation-details">${annotation}</span>
                </div>
            `;
        });
        annotationsHtml += '</div>';
        
        annotationInfo.innerHTML = annotationsHtml;
    };
    
    currentPreviewImage.src = item.path;
    currentPreviewImage.annotations = item.annotations;
    modal.style.display = 'block';
    
    // Setup delete button
    document.getElementById('deleteImage').onclick = () => {
        if (confirm('Are you sure you want to delete this image and its annotations?')) {
            fetch('/delete_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_name: item.filename
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Image deleted successfully', 'success');
                    document.getElementById('previewModal').style.display = 'none';
                    loadDataset(); // Refresh the dataset view
                } else {
                    throw new Error(data.error || 'Error deleting image');
                }
            })
            .catch(error => {
                console.error('Delete error:', error);
                showNotification('Error deleting image: ' + error.message, 'error');
            });
        }
    };
}

function redrawPreview() {
    if (!currentPreviewImage) return;

    previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.setTransform(scale, 0, 0, scale, translateX, translateY);
    
    previewCtx.drawImage(currentPreviewImage, 0, 0);
    
    if (currentPreviewImage.annotations) {
        currentPreviewImage.annotations.forEach((annotation, index) => {
            const [classId, x_center, y_center, width, height] = annotation.trim().split(' ').map(Number);
            const classInfo = annotationClasses[classId] || { name: `Class ${classId}`, color: '#FF0000' };
            
            const x = (x_center - width/2) * currentPreviewImage.width;
            const y = (y_center - height/2) * currentPreviewImage.height;
            const w = width * currentPreviewImage.width;
            const h = height * currentPreviewImage.height;
            
            previewCtx.strokeStyle = classInfo.color;
            previewCtx.lineWidth = 2;
            previewCtx.strokeRect(x, y, w, h);
            
            previewCtx.fillStyle = classInfo.color;
            previewCtx.font = '16px Arial';
            previewCtx.fillText(`${classInfo.name} (${index + 1})`, x, y - 5);
        });
    }
}

// File upload handling
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showLoading();
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        
        currentImageName = data.filename;
        currentImage = new Image();
        currentImage.onload = function() {
            initCanvas();
            showCanvasOverlay();
        };
        currentImage.src = '/static/uploads/' + data.filename;
    })
    .catch(error => {
        console.error('Upload error:', error);
        showNotification('Error uploading image: ' + error.message, 'error');
    })
    .finally(hideLoading);
}

// Utility functions
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notificationMessage');
    messageElement.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function saveAnnotations() {
    if (!currentImageName || boxes.length === 0) {
        showNotification('Please upload an image and draw at least one box', 'error');
        return;
    }
    
    showLoading();
    fetch('/save_annotation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image_name: currentImageName,
            annotations: boxes
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Annotations saved successfully', 'success');
            currentImage = null;
            currentImageName = null;
            boxes = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            document.getElementById('imageUpload').value = '';
            showCanvasOverlay();
        } else {
            throw new Error(data.error || 'Error saving annotations');
        }
    })
    .catch(error => {
        console.error('Save error:', error);
        showNotification('Error saving annotations: ' + error.message, 'error');
    })
    .finally(hideLoading);
}

function clearAnnotations() {
    if (boxes.length === 0) {
        showNotification('No annotations to clear', 'info');
        return;
    }

    if (confirm('Are you sure you want to clear all annotations?')) {
        boxes = [];
        redrawCanvas();
        showNotification('Annotations cleared', 'success');
    }
}

function handleKeyboardShortcuts(e) {
    // Handle Escape key
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Handle Delete/Backspace to remove last annotation
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (boxes.length > 0) {
            boxes.pop();
            redrawCanvas();
            showNotification('Last annotation removed', 'info');
        }
    }

    // Handle Ctrl + S to save
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveAnnotations();
    }

    // Handle Ctrl + Z to undo last annotation
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (boxes.length > 0) {
            boxes.pop();
            redrawCanvas();
            showNotification('Undo last annotation', 'info');
        }
    }
}

function addClassItemListeners() {
    // Class name input listeners
    document.querySelectorAll('.class-name-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            annotationClasses[id].name = e.target.value;
            saveSettings();
        });
    });

    // Class color input listeners
    document.querySelectorAll('.class-color-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            annotationClasses[id].color = e.target.value;
            saveSettings();
        });
    });

    // Delete class button listeners
    document.querySelectorAll('.delete-class').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('.delete-class').dataset.id;
            if (Object.keys(annotationClasses).length > 1) {
                if (confirm('Are you sure you want to delete this class?')) {
                    delete annotationClasses[id];
                    saveSettings();
                    renderClasses();
                    showNotification('Class deleted successfully', 'success');
                }
            } else {
                showNotification('You must have at least one class', 'error');
            }
        });
    });
}

function renderClasses() {
    const classList = document.getElementById('classList');
    classList.innerHTML = '';
    
    Object.entries(annotationClasses).forEach(([id, classInfo]) => {
        const classItem = document.createElement('div');
        classItem.className = 'class-item';
        classItem.innerHTML = `
            <input type="text" value="${classInfo.name}" data-id="${id}" class="class-name-input">
            <input type="color" value="${classInfo.color}" data-id="${id}" class="class-color-input">
            <button class="delete-class" data-id="${id}">
                <span class="icon">🗑️</span>
            </button>
        `;
        classList.appendChild(classItem);
    });

    // Add event listeners for class items
    addClassItemListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Canvas events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDrawing);
    canvas.addEventListener('mouseleave', endDrawing);

    // File upload
    document.getElementById('imageUpload').addEventListener('change', handleFileUpload);

    // Save button
    document.getElementById('saveButton').addEventListener('click', saveAnnotations);

    // Clear button
    document.getElementById('clearButton').addEventListener('click', clearAnnotations);

    // Settings button
    document.getElementById('settingsButton').addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'block';
        renderClasses();
    });

    // Help button
    document.getElementById('helpButton')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'block';
    });

    // Close buttons
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    // Preview zoom controls
    document.getElementById('zoomIn')?.addEventListener('click', () => {
        scale = Math.min(scale * 1.2, 5);
        redrawPreview();
    });

    document.getElementById('zoomOut')?.addEventListener('click', () => {
        scale = Math.max(scale / 1.2, 0.5);
        redrawPreview();
    });

    document.getElementById('resetZoom')?.addEventListener('click', () => {
        scale = 1;
        translateX = 0;
        translateY = 0;
        redrawPreview();
    });

    // Window resize
    window.addEventListener('resize', initCanvas);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}



// Initialize on load
document.addEventListener('DOMContentLoaded', initializeApp);

document.addEventListener('DOMContentLoaded', () => {
    // Add class button
    document.getElementById('addClassBtn')?.addEventListener('click', () => {
        const nameInput = document.getElementById('newClassName');
        const colorInput = document.getElementById('newClassColor');
        
        if (nameInput.value.trim()) {
            const newId = Object.keys(annotationClasses).length.toString();
            annotationClasses[newId] = {
                name: nameInput.value.trim(),
                color: colorInput.value
            };
            
            nameInput.value = '';
            colorInput.value = '#FF0000';
            
            saveSettings();
            renderClasses();
            showNotification('New class added', 'success');
        } else {
            showNotification('Please enter a class name', 'error');
        }
    });

    // Save settings button
    document.getElementById('saveSettings')?.addEventListener('click', () => {
        saveSettings();
        document.getElementById('settingsModal').style.display = 'none';
        showNotification('Settings saved successfully', 'success');
    });

    // Reset settings button
    document.getElementById('resetSettings')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset to default settings?')) {
            localStorage.removeItem('annotationSettings');
            loadSettings();
            renderClasses();
            showNotification('Settings reset to default', 'success');
        }
    });
});

const style = document.createElement('style');
style.textContent = `
    .class-item {
        display: flex;
        align-items: center;
        padding: 10px;
        background: #f5f5f5;
        margin: 5px 0;
        border-radius: 4px;
        gap: 10px;
    }

    .class-item input[type="text"] {
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .class-item input[type="color"] {
        width: 40px;
        height: 30px;
        padding: 0;
        border: none;
        border-radius: 4px;
    }

    .delete-class {
        background: #ff4444;
        color: white;
        border: none;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .delete-class:hover {
        background: #cc0000;
    }
`;
document.head.appendChild(style);