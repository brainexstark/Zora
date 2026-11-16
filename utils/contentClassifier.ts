// ============================================================
// ENGINE C1: CONTENT CLASSIFIER - On-device quest/flex classification
// ============================================================
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as FileSystem from "expo-file-system";
import { decode as atob } from "base-64";

export type QuestType = "quest" | "flex";

const QUEST_KEYWORDS = [
  "hack",
  "money",
  "how to",
  "tutorial",
  "learn",
  "build",
  "edit",
  "glow",
  "psychology",
  "business",
  "coding",
  "ai",
  "course",
  "guide",
  "invest",
  "save",
  "skill",
  "study",
  "teach",
  "recipe",
];

const QUEST_IMAGE_LABELS = ["text", "book", "laptop", "screen", "monitor", "keyboard", "desk", "menu", "abacus", "web site"];

let _mobilenetModel: any | null = null;

/** Classify a caption into quest (value/content) vs flex (show-off) on device. */
export function classifyPostCaption(caption: string): QuestType {
  if (!caption) return "flex";
  const lower = caption.toLowerCase();
  const isQuest = QUEST_KEYWORDS.some((k) => lower.includes(k));
  return isQuest ? "quest" : "flex";
}

/**
 * Classify an image. Attempts MobileNet (on-device) - if predictions include
 * text/book/screen-like labels, it's a quest post. Falls back to caption
 * classification when the model or image can't be loaded.
 */
export async function classifyPostImage(
  imageUri: string,
  caption?: string
): Promise<QuestType> {
  try {
    await tf.ready();
    if (!_mobilenetModel) {
      _mobilenetModel = await mobilenet.load();
    }
    let base64: string;
    if (imageUri.startsWith("data:")) {
      base64 = imageUri.split(",")[1];
    } else {
      base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    const raw = atob(base64);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    const tensor = (tf as any).node ? (tf as any).node.decodeImage(buf, 3) : (tf as any).decodeImage(buf, 3);
    if (!tensor) {
      return caption ? classifyPostCaption(caption) : "flex";
    }
    const predictions = await _mobilenetModel.classify(tensor, 5);
    tensor.dispose();
    const labels = predictions.map((p: any) => (p.className || "").toLowerCase());
    const looksQuest = labels.some((l: string) =>
      QUEST_IMAGE_LABELS.some((q) => l.includes(q))
    );
    return looksQuest ? "quest" : "flex";
  } catch (e) {
    console.log("classifyPostImage fell back to caption classifier:", e);
    return caption ? classifyPostCaption(caption) : "flex";
  }
}

/** Combined classifier used by CreatePostScreen. */
export async function classifyPost(
  imageUri: string | null,
  caption: string
): Promise<QuestType> {
  if (imageUri) {
    try {
      const imgType = await Promise.race([
        classifyPostImage(imageUri, caption),
        new Promise<QuestType>((resolve) => setTimeout(() => resolve("flex" as QuestType), 4000)),
      ]);
      // Combine image + caption: quest if either signals quest
      const captionType = classifyPostCaption(caption);
      return imgType === "quest" || captionType === "quest" ? "quest" : "flex";
    } catch {
      return classifyPostCaption(caption);
    }
  }
  return classifyPostCaption(caption);
}
