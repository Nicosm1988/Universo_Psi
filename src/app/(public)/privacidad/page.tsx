import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Privacidad | Universo Psi",
  description: "Cómo Universo Psi trata y protege los datos personales.",
};

export default function PrivacyPage() {
  return (
    <section className="bg-paper py-16 sm:py-24">
      <Container className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Versión agosto de 2026</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">Privacidad, en lenguaje claro</h1>
        <div className="mt-10 space-y-8 text-base leading-8 text-muted">
          <section><h2 className="text-xl font-semibold text-ink">Datos que usamos</h2><p className="mt-2">Tratamos los datos de cuenta, la información de perfiles profesionales, las consultas que decidís enviar y eventos técnicos mínimos para operar, proteger y mejorar el servicio.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Para qué</h2><p className="mt-2">Los usamos para autenticarte, mostrar perfiles, conectar consultas con el profesional elegido, verificar credenciales, moderar contenido, prevenir abuso y medir el funcionamiento del producto.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Separación y acceso</h2><p className="mt-2">Los datos de contacto y documentos se almacenan en áreas privadas. Un profesional sólo accede a las consultas dirigidas a su perfil. Las credenciales sólo pueden verlas su titular y las personas autorizadas para verificarlas.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Conservación y derechos</h2><p className="mt-2">Conservamos cada dato sólo durante el tiempo necesario para su finalidad, obligaciones legales, prevención de fraude y resolución de disputas. Podés solicitar acceso, corrección o eliminación desde los canales de soporte de la plataforma.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Proveedores</h2><p className="mt-2">Usamos proveedores de infraestructura, autenticación, base de datos, analítica y correo bajo configuraciones limitadas a la prestación del servicio. No vendemos datos personales.</p></section>
        </div>
      </Container>
    </section>
  );
}
