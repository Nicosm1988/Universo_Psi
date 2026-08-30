import { Container } from "@/components/ui/container";

export default function ProfessionalsLoading() {
  return (
    <div role="status" aria-label="Buscando profesionales" className="bg-canvas py-14">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="skeleton hidden h-[640px] rounded-[1.5rem] lg:block" />
          <div className="grid gap-5">
            <div className="skeleton h-20 rounded-[1.25rem]" />
            {[0, 1, 2].map((item) => <div key={item} className="skeleton h-[390px] rounded-[1.5rem]" />)}
          </div>
        </div>
        <span className="sr-only">Buscando profesionales…</span>
      </Container>
    </div>
  );
}
