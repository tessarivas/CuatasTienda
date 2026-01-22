"use client";

import * as React from "react";

type UsernameContextType = {
  username?: string;
  setUsername?: (username: string) => void;
};

export const UsernameContext = React.createContext<UsernameContextType>({});

type UsernameProviderProps = {
    children: React.ReactNode;
    initialUsername?: string | null;
};

export function UsernameProvider({
    children,
  initialUsername = null,
}: UsernameProviderProps) {
  const [username, setUsername] = React.useState<string | null>(initialUsername);

  return (
    // Username Context
    0
  );
}