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

  return (
    <>
      {/* 見出し。文章より先に、開いたところの実物を見せる */}
      <header className="brand px-6 pt-8 pb-0 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              alt=""
              className="rounded-[24%]"
              height={32}
              src="/icon.png"
              width={32}
            />
            <span className="font-bold text-lg tracking-tight">Macopy</span>
          </div>
          <LanguageSwitch />
        </div>

        <div className="mx-auto mt-14 max-w-3xl text-center">
          <h1 className="text-balance font-bold text-4xl leading-tight tracking-tight sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 text-pretty text-lg text-white/85 leading-relaxed">
            {t("hero.tagline")}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              className="rounded-full bg-white px-8 py-3.5 font-bold text-deep transition hover:bg-white/90"
              href={DOWNLOAD}
            >
              {t("hero.download")}
            </a>
            <a
              className="rounded-full border border-white/50 px-8 py-3.5 font-bold transition hover:bg-white/10"
              href={REPO}
            >
              {t("hero.source")}
            </a>
          </div>
          <p className="mt-4 text-sm text-white/60">{t("hero.note")}</p>
          {/* 貼り付けが動かない、で終わらせないために先に書いておく */}
          <p className="mt-2 text-sm text-white/60">{t("hero.permission")}</p>
        </div>

        {/* 元の画像が 480×320 しかないので、引き伸ばさずその幅で置く */}
        <div className="mx-auto mt-14 flex max-w-5xl flex-wrap items-end justify-center gap-6">
          <Image
            alt={t("screens.popup")}
            className="rounded-t-2xl"
            height={320}
            priority={true}
            quality={100}
            src="/screenshot1.png"
            width={480}
          />
          <Image
            alt={t("screens.menu")}
            className="rounded-t-2xl"
            height={320}
            quality={100}
            src="/screenshot2.png"
            width={480}
          />
        </div>
      </header>

      {/* することは4つ。枠で囲まず、鋼色の罫だけで区切る */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-x-12 gap-y-10 sm:grid-cols-2">
          {features.map((item) => (
            <div className="border-signal border-l-2 pl-5" key={item.title}>
              <h2 className="font-bold text-xl">{item.title}</h2>
              <p className="mt-3 text-ink/70 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-line border-t px-6 py-10 text-center text-ink/60 text-sm">
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
