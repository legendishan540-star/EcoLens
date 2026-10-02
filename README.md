# EcoLens — Identify • Segregate • Dispose

EcoLens is a browser-based waste-awareness application with AI image classification, live camera analysis, an experiment lab, educational content, an impact calculator and quiz features.

## Live camera AI
The Live Detector uses the browser Camera API together with ONNX Runtime Web. It continuously analyzes camera frames using the same ONNX waste classifier used by the image scanner. When the model classifies a frame as **Battery**, EcoLens displays an e-waste alert and plays a short audio beep. The live view also reports the model confidence and current classification.

The ONNX model is loaded from the public WasteWise model repository by SriramRokkam. The model is an ONNX image-classification model with eight waste classes: battery, biological, cardboard, glass, metal, paper, plastic and trash.

## Experiment Lab
The Experiment Lab records the actual item, AI prediction, confidence and correctness so repeated trials can be analyzed and exported as CSV.

## Deployment
This is a static website and can be deployed to GitHub Pages. Keep any existing Google Search Console verification file in the repository.
