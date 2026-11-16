export default {
  expo: {
    name: "ZORA",
    slug: "zora",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "zora",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#000000"
    },
    web: {
      favicon: "./assets/icon.png",
      bundler: "metro"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zora.app",
      infoPlist: {
        NSCameraUsageDescription: "ZORA uses the camera for age verification selfies and capturing posts.",
        NSPhotoLibraryUsageDescription: "ZORA accesses your photos so you can upload posts and stories.",
        NSMicrophoneUsageDescription: "ZORA uses the microphone when you record video posts."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      package: "com.zora.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "ZORA accesses your photos so you can upload posts and stories."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "ZORA uses the camera for age verification selfies and capturing posts."
        }
      ]
    ],
    experiments: {
      tsconfigPaths: true
    },
    extra: {
      router: {
        origin: false
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ""
    }
  }
};
