# ZORA AI Models

## Twin Engine — phi-3-mini ONNX

Place the ONNX model here OR deploy it so it downloads to the device's
documentDirectory on first launch.

Recommended quantized build (1.8 GB → 900 MB with int4):
```
phi3-mini-quantized.onnx
```

**Free source (Microsoft HuggingFace):**
https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-onnx

Download the `cpu_and_mobile/cpu-int4-rtn-block-32-acc-level-4` variant.

If the model is NOT present, `twinEngine.ts` automatically falls back to the
100% on-device Markov/slang engine — the app still passes acceptance test #12.

## Age Guard — blazeface

No manual download needed. `@tensorflow-models/blazeface` fetches its weights
from the TF Hub CDN the first time `estimateAgeLocal()` is called, then caches
them on-device. For fully offline age estimation, pre-bundle the model by
copying the weights to `documentDirectory` before first run.
