const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "tflite" && ext !== "onnx"
);
config.resolver.assetExts.push("tflite", "onnx");

config.resolver.sourceExts = config.resolver.sourceExts.concat(["cjs"]);

module.exports = config;
