# VAR for Pickleball
## ✅ Checkpoint 2 — Browser ONNX Inference Verified (Locked)

**Status:** Stable  
**Date:** Dec 14, 2025  

### What works
- Browser-only inference using `onnxruntime-web`
- YOLOv5n ONNX model loaded from `/public/models/yolov5n.onnx`
- FP16 inference using correct `Uint16Array` conversion
- WASM backend (single-threaded, SIMD disabled)
- No Python, GPU, or backend inference dependency

### Evidence
- Model loads successfully in browser
- Input: `images`
- Output: `output0`
- `session.run()` completes with valid output tensors

### What is intentionally NOT included yet
- Video frame capture / preprocessing
- Canvas rendering
- Detection parsing
- Ball tracking
- Foul or scoring logic

### Next planned phase
➡️ Phase 3 — Video frame preprocessing (camera/video → tensor)
