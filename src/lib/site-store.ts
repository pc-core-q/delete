import { useCallback, useEffect, useState } from "react";
import { onValue, push, ref, remove, set } from "firebase/database";
import { getDb } from "./firebase";

export type Project = {
  id: string;
  name: string;
  description: string;
  image: string;
  url: string;
};

export type SiteTexts = {
  brand: string;
  heroTitle: string;
  heroDescription: string;
  heroCta: string;
  aboutTitle: string;
  aboutText: string;
  servicesTitle: string;
  portfolioTitle: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
};

export const DEFAULT_TEXTS: SiteTexts = {
  brand: "متجرك الرقمي",
  heroTitle: "ننقل تجارتك إلى العالم الرقمي",
  heroDescription:
    "نصمم لك متجرًا إلكترونيًا جاهزًا للاستخدام، احترافيًا وسريعًا، لتبدأ البيع عبر الإنترنت خلال أيام.",
  heroCta: "ابدأ متجرك الآن",
  aboutTitle: "من نحن",
  aboutText:
    "نساعد أصحاب المتاجر المحلية على زيادة مبيعاتهم من خلال الانتقال إلى الإنترنت. نتولى التصميم والإعداد والتدريب، لتركّز أنت على منتجاتك وعملائك.",
  servicesTitle: "لماذا تختارنا؟",
  portfolioTitle: "أعمالنا",
  contactPhone: "+964 770 000 0000",
  contactEmail: "info@example.com",
  contactAddress: "بغداد، العراق",
};

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "متجر الأناقة",
    description: "متجر أزياء نسائية بتصميم عصري وتجربة شراء سلسة.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=70",
    url: "https://example.com",
  },
  {
    id: "p2",
    name: "بيت العطور",
    description: "متجر عطور فاخرة مع نظام طلبات وتوصيل متكامل.",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=70",
    url: "https://example.com",
  },
  {
    id: "p3",
    name: "تقنية بلس",
    description: "متجر إلكترونيات وإكسسوارات مع لوحة تحكم بالمخزون.",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=70",
    url: "https://example.com",
  },
];

type ProjectsRecord = Record<string, Omit<Project, "id">>;

function recordToProjects(record: ProjectsRecord | null): Project[] {
  if (!record) return [];
  return Object.entries(record).map(([id, p]) => ({ id, ...p }));
}

/** Reads site data from Firebase Realtime Database with live listeners, and seeds defaults on first run. */
export function useSiteData() {
  const [texts, setTexts] = useState<SiteTexts>(DEFAULT_TEXTS);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubTexts: (() => void) | undefined;
    let unsubProjects: (() => void) | undefined;
    let cancelled = false;

    getDb().then((db) => {
      if (cancelled) return;

      unsubTexts = onValue(ref(db, "texts"), (snap) => {
        const val = snap.val() as Partial<SiteTexts> | null;
        if (val) {
          setTexts({ ...DEFAULT_TEXTS, ...val });
        } else {
          // First run: seed default texts
          set(ref(db, "texts"), DEFAULT_TEXTS).catch(() => {});
        }
        setLoading(false);
      });

      unsubProjects = onValue(ref(db, "projects"), (snap) => {
        const val = snap.val() as ProjectsRecord | null;
        if (val) {
          setProjects(recordToProjects(val));
        } else {
          // First run: seed default projects
          const seed: ProjectsRecord = {};
          for (const p of DEFAULT_PROJECTS) {
            const { id, ...rest } = p;
            seed[id] = rest;
          }
          set(ref(db, "projects"), seed).catch(() => {});
        }
      });
    });

    return () => {
      cancelled = true;
      unsubTexts?.();
      unsubProjects?.();
    };
  }, []);

  const saveTexts = useCallback(async (t: SiteTexts) => {
    const db = await getDb();
    await set(ref(db, "texts"), t);
  }, []);

  const addProject = useCallback(async (p: Omit<Project, "id">) => {
    const db = await getDb();
    await push(ref(db, "projects"), p);
  }, []);

  const removeProject = useCallback(async (id: string) => {
    const db = await getDb();
    await remove(ref(db, `projects/${id}`));
  }, []);

  return { texts, projects, loading, saveTexts, addProject, removeProject };
}
