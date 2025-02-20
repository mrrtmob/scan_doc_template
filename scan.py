import cv2
import pytesseract
import os
import yaml
import json
from datetime import datetime

class DocumentTemplateProcessor:
    def __init__(self, config_file="templates.yaml"):
        self.templates = self.load_templates(config_file)
        self.active_template = None
        self.tesseract_config = r'--oem 3 --psm 6 -l khm+eng'

    def load_templates(self, config_file):
        """Load document templates from YAML config"""
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
                return config['templates']
        except FileNotFoundError:
            raise Exception(f"Template config file not found: {config_file}")

    def set_template(self, template_name):
        """Select active processing template"""
        if template_name not in self.templates:
            available = ", ".join(self.templates.keys())
            raise ValueError(f"Template '{template_name}' not found. Available: {available}")
        self.active_template = self.templates[template_name]
        print(f"Selected template: {template_name}")

    def crop_section(self, img, section_config):
        """Crop section based on template coordinates"""
        h, w = img.shape[:2]
        c = section_config['coordinates']
        
        x1 = int(w * c['x_start'])
        x2 = int(w * c['x_end'])
        y1 = int(h * c['y_start'])
        y2 = int(h * c['y_end'])
        
        return img[y1:y2, x1:x2]

    def extract_text(self, image):
        """Perform OCR with preprocessing and get bounding boxes"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        processed = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        
        # Get detailed OCR data including bounding boxes
        data = pytesseract.image_to_data(processed, config=self.tesseract_config, output_type=pytesseract.Output.DICT)
        
        results = []
        for i in range(len(data['text'])):
            if int(data['conf'][i]) > 0:  # Filter out low confidence results
                result = {
                    "text": data['text'][i].strip(),
                    "x": data['left'][i],
                    "y": data['top'][i],
                    "width": data['width'][i],
                    "height": data['height'][i],
                    "confidence": data['conf'][i]
                }
                if result["text"]:  # Only include non-empty text
                    results.append(result)
        
        return results

    def process_document(self, image_path, output_dir="output"):
        """Process document using active template"""
        if not self.active_template:
            raise Exception("No template selected. Use set_template() first")
            
        img = cv2.imread(image_path)
        if img is None:
            raise FileNotFoundError(f"Image not found: {image_path}")
            
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f"{base_name}_{timestamp}")
        
        os.makedirs(output_path, exist_ok=True)
        report_content = []
        final_results = {}
        
        for idx, section in enumerate(self.active_template['sections']):
            try:
                # Crop section using template coordinates
                cropped = self.crop_section(img, section)
                
                # Save section image
                img_file = f"{idx+1:02}_{section['name']}.png"
                img_path = os.path.join(output_path, img_file)
                cv2.imwrite(img_path, cropped)
                
                # OCR processing with bounding boxes
                text_data = self.extract_text(cropped)
                
                # Save extracted text as JSON
                json_file = f"{idx+1:02}_{section['name']}.json"
                json_path = os.path.join(output_path, json_file)
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(text_data, f, ensure_ascii=False, indent=2)
                
                final_results[section['name']] = text_data
                
                report_content.append({
                    'section': section['name'],
                    'image': img_file,
                    'text_data': text_data,
                    'coordinates': section['coordinates']
                })
                
            except Exception as e:
                print(f"Error processing {section['name']}: {str(e)}")
                final_results[section['name']] = {"error": str(e)}
        
        # Save final results
        final_json_path = os.path.join(output_path, "final_results.json")
        with open(final_json_path, 'w', encoding='utf-8') as f:
            json.dump(final_results, f, ensure_ascii=False, indent=2)
        
        # Generate markdown report
        self.generate_report(report_content, output_path, image_path)
            
        return output_path, final_results

    def generate_report(self, data, output_path, original_image_path):
        """Generate markdown report with template information"""
        report_path = os.path.join(output_path, "OCR_REPORT.md")
        
        with open(report_path, 'w', encoding='utf-8') as f:
            # Header
            f.write(f"# OCR Processing Report\n\n")
            f.write(f"## Document Information\n")
            f.write(f"- **Original File:** `{os.path.basename(original_image_path)}`\n")
            f.write(f"- **Template:** {self.active_template['template_name']}\n")
            f.write(f"- **Description:** {self.active_template['description']}\n")
            f.write(f"- **Processing Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Processing Summary
            f.write(f"## Processing Summary\n")
            f.write(f"Total sections processed: {len(data)}\n\n")
            
            # Detailed Results
            f.write(f"## Detailed Results\n\n")
            for idx, item in enumerate(data, 1):
                f.write(f"### {idx}. {item['section'].replace('_', ' ').title()}\n\n")
                
                # Section coordinates
                f.write("#### Coordinates\n")
                f.write("```yaml\n")
                f.write(yaml.dump(item['coordinates'], default_flow_style=False))
                f.write("```\n\n")
                
                # Section image
                f.write("#### Processed Image\n")
                f.write(f"![{item['section']}]({item['image']})\n\n")
                
                # Extracted text data
                f.write("#### Extracted Text\n")
                if item['text_data']:
                    f.write("```json\n")
                    f.write(json.dumps(item['text_data'], ensure_ascii=False, indent=2))
                    f.write("\n```\n\n")
                else:
                    f.write("*No text extracted from this section*\n\n")
                
                f.write("---\n\n")
            
            # Footer
            f.write(f"\n## Processing Notes\n")
            f.write("- OCR Engine: Tesseract\n")
            f.write(f"- Configuration: `{self.tesseract_config}`\n")
            f.write(f"- Output Directory: `{output_path}`\n")
        
        print(f"Report generated: {report_path}")

def main():
    # Initialize processor
    processor = DocumentTemplateProcessor("templates.yaml")
    
    # Select template
    processor.set_template("tax_invoice")
    
    # Process document
    image_path = "gg.jpg"  # Replace with your image path
    try:
        output_path, results = processor.process_document(image_path)
        print(f"Processing completed. Results saved to: {output_path}")
        print("\nExtracted Text Data:")
        print(json.dumps(results, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Error processing document: {str(e)}")

if __name__ == "__main__":
    main()