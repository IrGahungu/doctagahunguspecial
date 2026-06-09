module.exports = function (api) {
  const isExpo = api.caller((caller) => 
    caller && (caller.name === "babel-loader" || caller.name === "metro" || caller.name === "@expo/metro-config")
  );

  api.cache(true);

  if (!isExpo) {
    return {}; // Let Next.js handle its own transpilation (e.g., via SWC)
  }

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // This plugin must be listed last.
      "module:react-native-dotenv",
    ],
  };
};