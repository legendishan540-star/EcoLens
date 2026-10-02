# EcoLens — Identify • Segregate • Dispose

EcoLens is a browser-based waste awareness application with AI image classification, live camera object detection, an experiment lab, educational content, an impact calculator and quiz features.

## Live detector
The Live Detector uses an ONNX object-detection model through ONNX Runtime Web. It analyzes the live camera view, draws detection boxes, identifies battery objects, and gives an audio alert when a battery is detected with sufficient confidence.

The detector model used for the live object-detection feature is the Waste Classification YOLOv8 model by Kendrick's Model v1, published on Hugging Face under CC BY 4.0. The model includes a battery class and other waste classes.

The separate image scanner continues to use the WasteWise 8-class ONNX classifier.

## Deployment
The project is a static website and can be deployed to GitHub Pages. Keep any existing Google Search Console verification file in the repository.
