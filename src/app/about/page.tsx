import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B8863F]">About BaanNest</p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight md:text-7xl">A simpler way to find your place in Bangkok.</h1>
        <p className="mt-8 max-w-2xl text-base leading-8 text-[#5C6B62]">BaanNest brings property seekers, owners and agents together in one focused marketplace built around clear listings and straightforward communication.</p>
        <Link href="/properties" className="mt-10 inline-flex rounded-xl bg-[#1F2E28] px-6 py-3.5 text-sm font-semibold text-white">Explore properties →</Link>
      </section>
    </main>
  );
}
