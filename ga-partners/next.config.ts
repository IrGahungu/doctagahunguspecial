

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add the expo modules that are causing issues to this array
  transpilePackages: [
    'expo-modules-core',
    'expo-secure-store',
    'lucide-react-native',
    'react-native-web', // Already present
    'react-native', // Add this line
  ],
  // ... rest of your config
};

module.exports = nextConfig;
