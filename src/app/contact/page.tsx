import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B8863F]">BaanNest Support</p>
        <h1 className="mt-5 font-display text-5xl md:text-6xl">How can we help?</h1>
        <p className="mt-6 max-w-2xl leading-8 text-[#5C6B62]">Need help with a listing, your account, or finding a property? Contact details can be added here when your support channel is ready.</p>
        <div className="mt-10 rounded-3xl border border-[#DDD6C3] bg-white p-8">
          <h2 className="font-display text-2xl">Contact BaanNest</h2>
          <p className="mt-3 text-sm leading-7 text-[#6F776F]">For now, you can manage your account from your profile or continue browsing the marketplace.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/profile" className="rounded-xl bg-[#1F2E28] px-5 py-3 text-sm font-semibold text-white">Profile & settings</Link><Link href="/properties" className="rounded-xl border border-[#DDD6C3] px-5 py-3 text-sm font-semibold">Browse properties</Link></div>
        </div>
      </section>
    </main>
  );
}
