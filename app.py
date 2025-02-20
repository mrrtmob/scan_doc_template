from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import uuid
import logging
from werkzeug.utils import secure_filename
import shutil

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure folders
UPLOAD_FOLDER = 'static/uploads'
DATASET_FOLDER = 'dataset'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Configure Flask app
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_folders_exist():
    """Ensure all necessary folders exist"""
    folders = [
        UPLOAD_FOLDER,
        DATASET_FOLDER,
        os.path.join(DATASET_FOLDER, 'images'),
        os.path.join(DATASET_FOLDER, 'labels')
    ]
    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        logger.debug(f"Ensuring folder exists: {folder}")

@app.after_request
def add_header(response):
    """Add headers to disable caching"""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@app.route('/')
def index():
    """Render the main page"""
    ensure_folders_exist()
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle image upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{str(uuid.uuid4())}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            
            logger.debug(f"Saving uploaded file to: {filepath}")
            file.save(filepath)
            
            return jsonify({'filename': unique_filename})
        
        return jsonify({'error': 'File type not allowed'}), 400
    
    except Exception as e:
        logger.error(f"Error in upload_file: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/dataset/<path:filename>')
def serve_dataset_image(filename):
    """Serve images from dataset folder"""
    try:
        return send_from_directory(os.path.join(DATASET_FOLDER, 'images'), filename)
    except Exception as e:
        logger.error(f"Error serving dataset image: {str(e)}")
        return jsonify({'error': 'Image not found'}), 404

@app.route('/get_dataset')
def get_dataset():
    """Get all images and their annotations from the dataset"""
    try:
        images = []
        dataset_path = os.path.join(DATASET_FOLDER, 'images')
        labels_path = os.path.join(DATASET_FOLDER, 'labels')
        
        logger.debug(f"Scanning dataset path: {dataset_path}")
        
        if os.path.exists(dataset_path):
            for image_file in os.listdir(dataset_path):
                if allowed_file(image_file):
                    label_file = os.path.splitext(image_file)[0] + '.txt'
                    label_path = os.path.join(labels_path, label_file)
                    
                    annotations = []
                    if os.path.exists(label_path):
                        with open(label_path, 'r') as f:
                            annotations = f.readlines()
                    
                    images.append({
                        'filename': image_file,
                        'path': f'/dataset/{image_file}',
                        'annotations': annotations
                    })
        
        return jsonify(images)
    
    except Exception as e:
        logger.error(f"Error in get_dataset: {str(e)}")
        return jsonify({'error': 'Error loading dataset'}), 500

@app.route('/save_annotation', methods=['POST'])
def save_annotation():
    """Save annotations and move image to dataset"""
    try:
        data = request.json
        image_name = data['image_name']
        annotations = data['annotations']
        
        # Create dataset directories if they don't exist
        ensure_folders_exist()
        
        # Move image to dataset folder
        source_path = os.path.join(UPLOAD_FOLDER, image_name)
        dest_path = os.path.join(DATASET_FOLDER, 'images', image_name)
        
        logger.debug(f"Moving image from {source_path} to {dest_path}")
        
        if os.path.exists(source_path):
            shutil.move(source_path, dest_path)
        else:
            return jsonify({'error': 'Source image not found'}), 404
        
        # Save annotations
        label_filename = os.path.splitext(image_name)[0] + '.txt'
        label_path = os.path.join(DATASET_FOLDER, 'labels', label_filename)
        
        logger.debug(f"Saving annotations to {label_path}")
        
        with open(label_path, 'w') as f:
            for ann in annotations:
                # Convert to YOLO format
                x_center = (ann['x'] + ann['width'] / 2) / ann['imageWidth']
                y_center = (ann['y'] + ann['height'] / 2) / ann['imageHeight']
                width = ann['width'] / ann['imageWidth']
                height = ann['height'] / ann['imageHeight']
                
                f.write(f"{ann['class']} {x_center} {y_center} {width} {height}\n")
        
        return jsonify({'success': True})
    
    except Exception as e:
        logger.error(f"Error in save_annotation: {str(e)}")
        return jsonify({'error': 'Error saving annotations'}), 500

@app.route('/delete_image', methods=['POST'])
def delete_image():
    """Delete image and its annotations"""
    try:
        data = request.json
        image_name = data['image_name']
        
        # Delete image
        image_path = os.path.join(DATASET_FOLDER, 'images', image_name)
        if os.path.exists(image_path):
            os.remove(image_path)
            logger.debug(f"Deleted image: {image_path}")
        
        # Delete label file
        label_name = os.path.splitext(image_name)[0] + '.txt'
        label_path = os.path.join(DATASET_FOLDER, 'labels', label_name)
        if os.path.exists(label_path):
            os.remove(label_path)
            logger.debug(f"Deleted label file: {label_path}")
        
        return jsonify({'success': True})
    
    except Exception as e:
        logger.error(f"Error in delete_image: {str(e)}")
        return jsonify({'error': 'Error deleting image'}), 500

@app.route('/debug/dataset')
def debug_dataset():
    """Debug endpoint to check dataset structure"""
    try:
        dataset_info = {
            'dataset_folder': os.path.abspath(DATASET_FOLDER),
            'images_folder': os.path.abspath(os.path.join(DATASET_FOLDER, 'images')),
            'labels_folder': os.path.abspath(os.path.join(DATASET_FOLDER, 'labels')),
            'images': [],
            'labels': []
        }
        
        # List images
        images_path = os.path.join(DATASET_FOLDER, 'images')
        if os.path.exists(images_path):
            dataset_info['images'] = os.listdir(images_path)
        
        # List labels
        labels_path = os.path.join(DATASET_FOLDER, 'labels')
        if os.path.exists(labels_path):
            dataset_info['labels'] = os.listdir(labels_path)
        
        # Add folder permissions
        dataset_info['permissions'] = {
            'dataset_folder': oct(os.stat(DATASET_FOLDER).st_mode)[-3:],
            'images_folder': oct(os.stat(images_path).st_mode)[-3:] if os.path.exists(images_path) else 'not found',
            'labels_folder': oct(os.stat(labels_path).st_mode)[-3:] if os.path.exists(labels_path) else 'not found'
        }
        
        return jsonify(dataset_info)
    
    except Exception as e:
        logger.error(f"Error in debug_dataset: {str(e)}")
        return jsonify({'error': 'Error getting debug info'}), 500

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'folders': {
            'upload_folder': os.path.exists(UPLOAD_FOLDER),
            'dataset_folder': os.path.exists(DATASET_FOLDER),
            'images_folder': os.path.exists(os.path.join(DATASET_FOLDER, 'images')),
            'labels_folder': os.path.exists(os.path.join(DATASET_FOLDER, 'labels'))
        }
    })

if __name__ == '__main__':
    ensure_folders_exist()
    app.run(debug=True)