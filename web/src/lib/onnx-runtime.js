// src/lib/onnx-runtime.js
// KISS, DRY, stable ONNX Runtime loader for Vite.
// Loads ONNX Runtime Web ESM from local copy: src/lib/ort.min.js

console.log("[onnx-runtime] wrapper loading...");

let __ORT_PROMISE = null;

/**
 * Load the ONNX Runtime namespace (once)
 */
export async function getOrtNamespace() {
  if (__ORT_PROMISE) return __ORT_PROMISE;

  __ORT_PROMISE = (async () => {
    console.log("[onnx-runtime] importing ./ort.min.js ...");

    // IMPORTANT: import the local file, NOT node_modules
    const mod = await import("./ort.min.js");
    const ort = mod.default ?? mod;

    if (!ort || !ort.env) {
      throw new Error("onnxruntime-web failed to initialize: missing ort.env");
    }

    // ---- Configure WASM backend ----
    const wasmFile = "/ort-wasm/ort-wasm.wasm"; // your public wasm file
    const wasmConfig = {
      numThreads: 0,
      simd: false,
      proxy: false,
      wasmPaths: {
        "ort-wasm.wasm": wasmFile,
        "ort-wasm-simd.wasm": wasmFile,
        "ort-wasm-threaded.wasm": wasmFile,
        "ort-wasm-simd-threaded.wasm": wasmFile,
      },
    };

    try {
      // ONNX Runtime 1.16+ backend shape
      ort.env.backends = ort.env.backends || {};
      ort.env.backends.onnx = ort.env.backends.onnx || {};
      ort.env.backends.onnx.preferredBackend = "wasm";
      ort.env.backends.onnx.wasm = {
        ...wasmConfig,
        ...(ort.env.backends.onnx.wasm || {}),
      };

    } catch (err) {
      // fallback for older builds
      ort.env.wasm = {
        ...wasmConfig,
        ...(ort.env.wasm || {}),
      };
    }

    console.log("[onnx-runtime] env configured:", ort.env);

    return ort;
  })();

  return __ORT_PROMISE;
}

/**
 * Create a session from a URL or Uint8Array
 */
export async function createSessionFromUrl(modelUrlOrBuffer, sessionOptions = {}) {
  const ort = await getOrtNamespace();

  let bytes = modelUrlOrBuffer;

  if (typeof modelUrlOrBuffer === "string") {
    const resp = await fetch(modelUrlOrBuffer);
    if (!resp.ok) throw new Error(`Failed to fetch model: ${resp.status}`);
    bytes = new Uint8Array(await resp.arrayBuffer());
  }

  // Try known ORT API shapes
  if (ort.InferenceSession?.create) {
    return ort.InferenceSession.create(bytes, sessionOptions);
  }
  if (typeof ort.createSession === "function") {
    return ort.createSession(bytes, sessionOptions);
  }
  if (typeof ort.createInferenceSession === "function") {
    return ort.createInferenceSession(bytes, sessionOptions);
  }

  throw new Error("No compatible session creation API found in ORT namespace");
}

export default {
  getOrtNamespace,
  createSessionFromUrl,
};
