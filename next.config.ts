import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@prisma/client"],
  images: {
    // Las fotos las achica Cloudinary, no Next (ver el archivo).
    loader: "custom",
    loaderFile: "./lib/images/cloudinary-loader.ts",
    remotePatterns: [ {
      protocol: "https",
      hostname: "res.cloudinary.com",
      port: "",
      pathname: "/**",
    } ],
  },
};

export default nextConfig;
