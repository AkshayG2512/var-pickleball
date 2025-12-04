// Minimal ONNXRuntime-Web loader + runner for a small YOLO-seg ONNX model.
// Assumes model expects an image tensor [1,3,H,W] with H=W=320 or 256.

import * as ort from "onnxruntime-web";

const MODEL_PATH = "/models/yolo_seg_tiny.onnx"; // place in web/public/models/

let session = null;
let inputSize = 320; // adapt to your exported model

export async function initModel() {
  if (session) return session;
  
  // NOTE: I recommend using the CDN path for simplicity unless you must bundle locally
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/'; 
  
  session = await ort.InferenceSession.create(MODEL_PATH, { executionProviders: ["webgl", "wasm", "webgpu"] });
  return session;
}

function preprocessImage(imageBitmap, size = inputSize) {
  // draw to canvas, resize, normalize to [0,1], HWC->CHW float32
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const { data } = imgData;
  const float32 = new Float32Array(3 * size * size);
  // normalize 0..1 and convert to CHW order
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const idx = y * size + x;
      float32[idx] = r;
      float32[size * size + idx] = g;
      float32[2 * size * size + idx] = b;
    }
  }
  return float32;
}

export async function runInferenceOnBitmap(imageBitmap) {
  if (!session) await initModel();
  const inputTensorData = preprocessImage(imageBitmap, inputSize);
  
  // Create a tensor for the model input
  const inputTensor = new ort.Tensor('float32', inputTensorData, [1, 3, inputSize, inputSize]);
  
  // NOTE: 'input' is a common name, but you must check your model's actual input name
  const feeds = { input: inputTensor }; 

  try {
      const results = await session.run(feeds);
      
      // THIS PART WAS MISSING/TRUNCATED IN YOUR INPUT:
      return parseYolov8Outputs(results); 
  } catch (e) {
      console.error("Inference Error:", e);
      return [];
  }
}

// Placeholder/Scaffolding for Post-processing (YOU NEED TO IMPLEMENT THIS)
function parseYolov8Outputs(results) {
    // This is where you implement NMS and extract boxes/masks from the model output.
    console.warn("parseYolov8Outputs needs full implementation for your specific model output format.");
    // Example: Find the output name (e.g., 'output0')
    const outputName = Object.keys(results)[0]; 
    const outputTensor = results[outputName].data;
    
    // Returning mock data for testing UI integration
    return [
        { box: [50, 100, 100, 100], label: "ball", confidence: 0.99 },
    ];
}

