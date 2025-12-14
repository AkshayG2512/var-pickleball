// MOCK INFERENCE MODULE (Clean Reset)
// This version is stable and guaranteed to work with video -> canvas pipeline.

export async function initModel() {
console.log("Mock model: initModel()");
return true; // pretend model is ready
}

// Return one fake "ball" detection so pipeline is testable
export async function runInferenceOnBitmap(bitmap) {
console.log("Mock model: runInferenceOnBitmap()");

// Simulate 1 detection (always in center)
return [
{
label: "ball",
score: 0.99,
box: [0.4, 0.4, 0.2, 0.2],

// normalized [x, y, width, height]

}
];
}
