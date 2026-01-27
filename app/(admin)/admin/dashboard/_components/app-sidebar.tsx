"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
export const data = {
  navMain: [
    {
      title: "Proveedores",
      url: "/admin/dashboard/suppliers",
    },
    {
      title: "Productos",
      url: "/admin/dashboard/inventory",
    },
    {
      title: "Clientes",
      url: "/admin/dashboard/clients",
    },
    {
      title: "Caja Registradora",
      url: "/admin/dashboard/pos",
      items: [
        { title: "Historial de Ventas", url: "#" },
        { title: "Corte de Caja", url: "#" },
      ],
    },
  ],
};

export function AppSidebar({
   ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const username = "Admin"

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error al cerrar sesión");
      }

      router.push("/admin/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/admin/dashboard">
                <Image
                  src="/LOGO_CUATAS.svg"
                  alt="Cuatas Tienda Logo"
                  width={24}
                  height={24}
                  className="rounded-lg mr-1.5"
                />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Cuatas Tienda</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.url)}
                >
                  <a href={item.url} className="font-medium">
                    {item.title}
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith(subItem.url)}
                        >
                          <a href={subItem.url}>{subItem.title}</a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex flex-col gap-0.5 leading-none p-2 text-sm">
                <span className="font-medium capitalize">{username}</span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Button
                variant="ghost"
                className="w-full justify-start cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Cerrar sesión
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
