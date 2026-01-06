import * as React from "react"
import { GalleryVerticalEnd } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Proveedores",
      url: "#",
      items: [
        {
          title: "Lista de Proveedores",
          url: "#",
        },
        {
          title: "Agregar Proveedor",
          url: "#",
        },
        {
          title: "Editar Proveedores",
          url: "#",
        }
      ],
    },
    {
      title: "Productos",
      url: "#",
      items: [
        {
          title: "Lista de Productos",
          url: "#",
        },
        {
          title: "Agregar Producto",
          url: "#",
          isActive: true,
        },
        {
          title: "Editar Producto",
          url: "#",
        }
      ],
    },
    {
      title: "Clientes",
      url: "#",
      items: [
        {
          title: "Lista de Clientes",
          url: "#",
        },
        {
          title: "Agregar Cliente",
          url: "#",
        },
        {
          title: "Editar Cliente",
          url: "#",
        }
      ],
    },
    {
      title: "Caja Registradora",
      url: "#",
      items: [
        {
          title: "Vender",
          url: "#",
        },
        {
          title: "Historial de Ventas",
          url: "#",
        },
        {
          title: "Corte de Caja",
          url: "#",
        }
      ],
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
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
                <SidebarMenuButton asChild>
                  <a href={item.url} className="font-medium">
                    {item.title}
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={item.isActive}>
                          <a href={item.url}>{item.title}</a>
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
    </Sidebar>
  )
}
