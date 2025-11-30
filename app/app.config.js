module.exports = {
  expo: {
    name: "Bonfire",
    slug: "bonfire",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.bonfire.app",
      usesAppleSignIn: true,
      infoPlist: {
        UIBackgroundModes: ["location", "remote-notification"],
        NSLocationWhenInUseUsageDescription: "Bonfire needs your location to discover nearby chat sessions.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Bonfire needs your location to discover nearby chat sessions even when the app is in the background.",
        NSCameraUsageDescription: "Bonfire needs camera access to take photos for chat messages.",
        NSPhotoLibraryUsageDescription: "Bonfire needs photo library access to share images in chat.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.bonfire.app",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-task-manager",
      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow Bonfire to discover nearby chat sessions even when the app is in the background.",
          locationWhenInUsePermission: "Allow Bonfire to discover nearby chat sessions.",
          isAndroidBackgroundLocationEnabled: true,
          isIosBackgroundLocationEnabled: true,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#FF6B35",
        },
      ],
    ],
    scheme: "bonfire",
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "4502d063-084a-4b12-9437-6f7a79106bf6",
      },
    },
  },
};
