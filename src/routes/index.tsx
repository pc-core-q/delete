import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutTemplate, Settings2, Headphones, Rocket, ShieldCheck, TrendingUp, ExternalLink, Phone, Mail, MapPin, Lock, Store } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { useSiteData } from "@/lib/site-store";
import { useReveal } from "@/hooks/use-reveal";
import { AdminPanel } from "@/components/site/AdminPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "متجرك الرقمي — متاجر إلكترونية جاهزة" },
      { name: "description", content: "ننقل تجارتك إلى العالم الرقمي بمتاجر إلكترونية احترافية جاهزة للاستخدام." },
      { property: "og:title", content: "متجرك الرقمي — متاجر إلكترونية جاهزة" },
      { property: "og:description", content: "متاجر إلكترونية احترافية جاهزة لأصحاب المتاجر المحلية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SERVICES = [
  { icon: LayoutTemplate, title: "واجهة احترافية", text: "تصميم عصري وجذاب يعمل على جميع الأجهزة." },
  { icon: Settings2, title: "لوحة تحكم سهلة", text: "أدر منتجاتك وطلباتك بضغطة زر دون خبرة تقنية." },
  { icon: Headphones, title: "دعم فني", text: "فريق دعم متواجد لمساعدتك في كل خطوة." },
  { icon: Rocket, title: "إطلاق سريع", text: "متجرك جاهز للبيع خلال أيام قليلة." },
  { icon: ShieldCheck, title: "أمان وموثوقية", text: "حماية لبياناتك وبيانات عملائك." },
  { icon: TrendingUp, title: "زيادة المبيعات", text: "أدوات تسويق تساعدك على الوصول لعملاء أكثر." },
];

function Index() {
  const { texts, projects, saveTexts, addProject, removeProject } = useSiteData();
  const [adminOpen, setAdminOpen] = useState(false);
  useReveal([projects.length]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="#top" className="flex items-center gap-2 text-lg font-bold text-primary">
            <Store className="h-6 w-6" /> {texts.brand}
          </a>
          <div className="hidden gap-6 text-sm font-medium md:flex">
            {[["#about", "من نحن"], ["#services", "خدماتنا"], ["#portfolio", "أعمالنا"], ["#contact", "تواصل معنا"]].map(([h, l]) => (
              <a key={h} href={h} className="text-muted-foreground transition hover:text-primary">{l}</a>
            ))}
          </div>
          <a href="#contact" className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:-translate-y-0.5">تواصل معنا</a>
        </nav>
      </header>

      <section id="top" className="bg-gradient-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="reveal space-y-6 text-center md:text-right">
            <span className="inline-block rounded-full bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground">متاجر إلكترونية جاهزة</span>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
              <span className="text-gradient">{texts.heroTitle}</span>
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{texts.heroDescription}</p>
            <a href="#contact" className="inline-block rounded-full bg-gradient-primary px-8 py-3.5 text-lg font-bold text-primary-foreground shadow-lift transition hover:-translate-y-1">{texts.heroCta}</a>
          </div>
          <div className="reveal">
            <img src={heroImg} alt="متجر إلكتروني على الحاسوب والهاتف" width={1280} height={1024} className="float-slow w-full rounded-3xl shadow-lift" />
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="reveal space-y-5">
          <h2 className="text-3xl font-bold md:text-4xl">{texts.aboutTitle}</h2>
          <div className="mx-auto h-1 w-16 rounded-full bg-gradient-primary" />
          <p className="text-lg leading-loose text-muted-foreground">{texts.aboutText}</p>
        </div>
      </section>

      <section id="services" className="bg-sky py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="reveal mb-12 text-center text-3xl font-bold md:text-4xl">{texts.servicesTitle}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="reveal group rounded-2xl border bg-card p-7 transition duration-300 hover:-translate-y-2 hover:shadow-lift">
                <div className="mb-4 inline-flex rounded-xl bg-gradient-primary p-3 text-primary-foreground transition group-hover:scale-110">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{s.title}</h3>
                <p className="text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="portfolio" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="reveal mb-12 text-center text-3xl font-bold md:text-4xl">{texts.portfolioTitle}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="reveal group block overflow-hidden rounded-2xl border bg-card transition duration-300 hover:-translate-y-2 hover:shadow-lift">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {p.image && <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />}
              </div>
              <div className="p-5">
                <h3 className="flex items-center justify-between text-lg font-bold">
                  {p.name}
                  <ExternalLink className="h-4 w-4 text-primary opacity-0 transition group-hover:opacity-100" />
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <footer id="contact" className="bg-gradient-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-2xl font-bold"><Store className="h-6 w-6" /> {texts.brand}</h3>
            <p className="opacity-90">{texts.heroTitle}</p>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-3"><Phone className="h-5 w-5" /><span dir="ltr">{texts.contactPhone}</span></li>
            <li className="flex items-center gap-3"><Mail className="h-5 w-5" />{texts.contactEmail}</li>
            <li className="flex items-center gap-3"><MapPin className="h-5 w-5" />{texts.contactAddress}</li>
          </ul>
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-primary-foreground/20 py-4 text-sm opacity-80">
          © {new Date().getFullYear()} {texts.brand}. جميع الحقوق محفوظة.
          <button onClick={() => setAdminOpen(true)} aria-label="لوحة التحكم" className="opacity-30 transition hover:opacity-100">
            <Lock className="h-3 w-3" />
          </button>
        </div>
      </footer>

      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} texts={texts} projects={projects} saveTexts={saveTexts} addProject={addProject} removeProject={removeProject} />
    </div>
  );
}
