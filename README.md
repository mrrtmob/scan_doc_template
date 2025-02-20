# Document Template Processor

This project automates the OCR (Optical Character Recognition) process for different document templates using Tesseract with Khmer language support. It allows users to define templates and extract relevant sections of text efficiently.

## Features

- **Template Management**: Define different document templates with coordinates for cropping.
- **OCR Support**: Extract text using Tesseract (configured for Khmer).
- **Structured Outputs**: Automatically saves images and extracted text in organized directories.
- **Markdown Reports**: Generates comprehensive reports for processed documents.

## Requirements

- Python 3.x
- OpenCV
- pytesseract
- PyYAML

### Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd <repository_directory>
   ```

2. Install the required packages:
   ```bash
   pip install opencv-python pytesseract pyyaml
   ```

3. Install Tesseract:
   - Download and install Tesseract from [Tesseract GitHub](https://github.com/tesseract-ocr/tesseract).
   - Ensure to include the Khmer traineddata file in the `tessdata` directory.

## Usage

1. Create a YAML file for your document templates (e.g., `templates.yaml`).

### Example Configuration (templates.yaml)

```yaml
tax_invoice:
  template_name: "Tax Invoice Template"
  description: "Cambodian Standard Tax Invoice"
  sections:
    - name: "header_left"
      coordinates:
        x_start: 0.0
        x_end: 0.4
        y_start: 0.0
        y_end: 0.2
    - name: "header_right"
      coordinates:
        x_start: 0.6
        x_end: 1.0
        y_start: 0.0
        y_end: 0.2
    - name: "department_info"
      coordinates:
        x_start: 0.0
        x_end: 1.0
        y_start: 0.2
        y_end: 0.3
    - name: "registration_table"
      coordinates:
        x_start: 0.0
        x_end: 1.0
        y_start: 0.3
        y_end: 0.5
    - name: "fees_table"
      coordinates:
        x_start: 0.1
        x_end: 0.9
        y_start: 0.5
        y_end: 0.7
    - name: "payment_section"
      coordinates:
        x_start: 0.0
        x_end: 1.0
        y_start: 0.7
        y_end: 0.85
    - name: "qr_code"
      coordinates:
        x_start: 0.0
        x_end: 0.3
        y_start: 0.85
        y_end: 1.0
    - name: "signature_box"
      coordinates:
        x_start: 0.7
        x_end: 1.0
        y_start: 0.85
        y_end: 1.0

gov_form_001:
  template_name: "Government Form 001"
  description: "Official Department Form Layout"
  sections:
    - name: "department_header"
      coordinates:
        x_start: 0.0
        x_end: 1.0
        y_start: 0.0
        y_end: 0.2
    - name: "applicant_details"
      coordinates:
        x_start: 0.1
        x_end: 0.9
        y_start: 0.25
        y_end: 0.4
    - name: "approval_stamp"
      coordinates:
        x_start: 0.7
        x_end: 0.95
        y_start: 0.85
        y_end: 1.0
```

2. **Run the Processor:**
   - Update the path to `templates.yaml` in the code as necessary.
   - Use the processor by selecting the desired template, e.g.:
   ```python
   processor.set_template("tax_invoice")
   processor.process_document("path/to/your/document.jpg")
   ```

## Output Structure

After processing, the output will be organized as follows:

```
output/
└── your_document_YYYYMMDD_HHMMSS/
    ├── sections/
    │   ├── 01_header_left.png
    │   ├── 02_header_right.png
    │   └── ...
    ├── text/
    │   ├── 01_header_left.txt
    │   ├── 02_header_right.txt
    │   └── ...
    └── OCR_REPORT.md
```