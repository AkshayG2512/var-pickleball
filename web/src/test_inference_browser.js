import * as ort from "onnxruntime-web";

export async function testYoloInference() {
  console.log("[TEST] Initializing ONNX Runtime");

  // safest config
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = false;
  ort.env.wasm.wasmPaths = "/ort-wasm/";

  console.log("[TEST] Creating inference session...");

  const session = await ort.InferenceSession.create(
    "/models/yolov5n.onnx",
    {
      executionProviders: ["wasm"],
    }
  );

  console.log("[TEST] Model loaded successfully");

  console.log("[TEST] Input names:", session.inputNames);
  console.log("[TEST] Output names:", session.outputNames);

  const inputName = session.inputNames[0];

// Create FP16 input tensor (ONNX Runtime Web expects Uint16Array)
const inputSize = 1 * 3 * 640 * 640;
const inputData = new Float32Array(inputSize);

// FP32 → FP16 bit conversion
function float32ToFloat16(val) {
  const floatView = new Float32Array(1);
  const intView = new Uint32Array(floatView.buffer);

  floatView[0] = val;
  const x = intView[0];

  const sign = (x >> 31) & 0x1;
  let exp = (x >> 23) & 0xff;
  let mantissa = x & 0x7fffff;

  if (exp === 0xff) {
    // Inf / NaN
    return (sign << 15) | 0x7c00;
  }

  exp = exp - 127 + 15;
  if (exp >= 0x1f) {
    return (sign << 15) | 0x7c00;
  } else if (exp <= 0) {
    return sign << 15;
  }

  return (sign << 15) | (exp << 10) | (mantissa >> 13);
}

const inputDataFP16 = new Uint16Array(inputSize);
for (let i = 0; i < inputSize; i++) {
  inputDataFP16[i] = float32ToFloat16(inputData[i]);
}

const inputTensor = new ort.Tensor(
  "float16",
  inputDataFP16,
  [1, 3, 640, 640]
);



  console.log("[TEST] Running inference...");

  const outputs = await session.run({
    [inputName]: inputTensor,
  });

  console.log("[TEST] Inference completed");
  console.log(
    "[TEST] Output shapes:",
    Object.entries(outputs).map(([k, v]) => ({
      name: k,
      dims: v.dims,
      type: v.type,
    }))
  );

  return outputs;
}
