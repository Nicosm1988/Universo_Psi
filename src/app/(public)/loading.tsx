import { Container } from "@/components/ui/container";

export default function PublicLoading() {
  return (
    <div role="status" aria-label="Cargando contenido" className="py-16 sm:py-20">
      <Container>
        <div className="skeleton h-5 w-28 rounded-full" />
        <div className="skeleton mt-6 h-14 max-w-2xl rounded-2xl sm:h-20" />
        <div className="skeleton mt-5 h-6 max-w-xl rounded-xl" />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-[1.5rem] border border-line p-6">
              <div className="skeleton size-16 rounded-2xl" />
              <div className="skeleton mt-6 h-7 w-2/3 rounded-xl" />
              <div className="skeleton mt-4 h-20 rounded-xl" />
            </div>
          ))}
        </div>
        <span className="sr-only">Cargando…</span>
      </Container>
    </div>
  );
}
