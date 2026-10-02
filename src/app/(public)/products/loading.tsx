export default function ProductsHubLoading() {
  return (
    <div className="bg-white">
      <div className="border-b border-border bg-white py-3">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <div className="h-4 w-40 animate-pulse rounded-full bg-muted" aria-hidden />
        </div>
      </div>

      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <div className="mb-6 space-y-2">
            <div className="h-7 w-48 animate-pulse rounded-full bg-muted" aria-hidden />
            <div className="h-4 w-28 animate-pulse rounded-full bg-muted" aria-hidden />
          </div>

          <div
            className="mb-6 h-11 w-full max-w-xl animate-pulse rounded-full bg-muted"
            aria-hidden
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2" aria-hidden>
                <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
