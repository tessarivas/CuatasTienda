import { LoginForm } from "./_components/login-form"
import Image from "next/image"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6">
            <Image
              src="/LOGO_CUATAS.svg"
              alt="Cuatas Tienda"
              width={120}
              height={120}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cuatas Tienda</h1>
          <p className="text-muted-foreground mt-1">Panel de Administración</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}