import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";

const REPO = "https://github.com/piro0919/macopy";
const DOWNLOAD = `${REPO}/releases/latest`;

type Item = { title: string; body: string };

type PageProps = { params: Promise<{ locale: string }> };

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
  const features = t.raw("features.items") as Item[];
  const stack = t.raw("stack.items") as string[];

  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Image
            alt=""
            className="rounded-[24%]"
            height={26}
            src="/icon.png"
            width={26}
          />
          <span className="font-bold text-sm tracking-tight">Macopy</span>
        </div>
        <LanguageSwitch />
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pt-10 pb-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:pt-16">
          <div className="min-w-0">
            <h1 className="text-balance font-bold text-4xl leading-[1.2] tracking-tight sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-md text-pretty text-ink-2 leading-relaxed">
              {t("hero.tagline")}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="bg-ink px-7 py-3.5 text-center font-bold text-paper transition hover:bg-steel"
                href={DOWNLOAD}
              >
                {t("hero.download")}
              </a>
              <a
                className="border border-line px-7 py-3.5 text-center font-bold transition hover:border-ink"
                href={REPO}
              >
                {t("hero.source")}
              </a>
            </div>
            <p className="mt-5 text-ink-3 text-sm leading-relaxed">
              {t("hero.note")}
              <br />
              {t("hero.permission")}
            </p>
          </div>

          {/* 履歴そのものを台帳として置く。番号がそのまま押すキーになる */}
          <div className="min-w-0">
            <div className="flex items-baseline justify-between border-ink border-b pb-3">
              <span className="font-bold text-sm">{t("stack.title")}</span>
              <span className="text-ink-3 text-xs">{t("stack.hint")}</span>
            </div>
            <ol>
              {stack.map((line, i) => (
                <li
                  className="flex items-center gap-5 border-line border-b py-4"
                  key={line}
                >
                  <span
                    className={`w-6 shrink-0 font-mono text-sm ${
                      i === 0 ? "text-steel" : "text-ink-3"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`truncate text-sm ${
                      i === 0 ? "font-bold text-ink" : "text-ink-2"
                    }`}
                  >
                    {line}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* することは4つ。番号と罫だけで組む */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-x-12 gap-y-10 border-ink border-t pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item, i) => (
              <div key={item.title}>
                <span className="font-mono text-sm text-steel">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-bold text-base">{item.title}</h2>
                <p className="mt-2.5 text-ink-2 text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="flex flex-wrap items-end justify-center gap-6">
            <Image
              alt={t("screens.popup")}
              className="border border-line"
              height={640}
              src="/screenshot1.png"
              width={520}
            />
            <Image
              alt={t("screens.menu")}
              className="border border-line"
              height={640}
              src="/screenshot2.png"
              width={360}
            />
          </div>
        </section>
      </main>

      <footer className="border-line border-t px-6 py-8 text-center text-ink-3 text-sm">
        <a className="underline" href={REPO}>
          {t("footer.source")}
        </a>
        <span className="px-2">·</span>
        <Link className="underline" href="/privacy">
          {t("footer.privacy")}
        </Link>
      </footer>
    </>
  );
}
