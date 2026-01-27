import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [ {
      protocol: "https",
      hostname: "res.cloudinary.com",
      port: "",
      pathname: "/**",
    } ],
  },
};

export default nextConfig;
