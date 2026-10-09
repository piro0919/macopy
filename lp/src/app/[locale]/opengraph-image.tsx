import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";

export const alt = "Macopy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* ビルド時に焼く。動的なままだと public/ が関数側に含まれず、
   本番で icon.png を読めずに 500 になる */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

/* 実際に出るのは kk-web の一覧で176px、X のカードで500px 前後。
   その大きさで残るのはアイコンと名前と1行だけなので、それしか置かない。
   色はアプリのアイコンから取る */
const PAPER = "#eef2f4";
const NAVY = "#1c3a56";
const INK_2 = "#4a5c6b";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ImageResponse> {
  const { locale } = await params;
  const isJa = locale === "ja";
  /* 見出しの書体はサイトと同じ Murecho。使う文字だけに絞ったものを
     同梱している。文言を変えたら assets/README.md の手順で作り直す */
  const [icon, font] = await Promise.all([
    readFile(join(process.cwd(), "public/icon.png")),
    readFile(join(process.cwd(), "assets/Murecho-500-subset.ttf")),
  ]);
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: PAPER,
        display: "flex",
        gap: 64,
        height: "100%",
        /* 中央に寄せる。左揃えだと副題の長い英語版で右が詰まる */
        justifyContent: "center",
        width: "100%",
      }}
    >
      {/* icon.png は絵の左右に 300px 換算で 28px の地がある。左側だけ打ち消して、
          見た目の左右の余白を揃える */}
      {/* biome-ignore lint/performance/noImgElement: next/image is not available in ImageResponse */}
      <img alt="" height={300} src={iconSrc} style={{ marginLeft: -28 }} width={300} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: NAVY,
            fontSize: 128,
            letterSpacing: -3,
            /* 128px だと M の左の字形の余白が見えて、説明文より右から始まって見える */
            marginLeft: -7,
          }}
        >
          Macopy
        </div>
        {/* 1行だと題名より大きく右へはみ出し、その軽さで全体が左に寄って見えるので2行に折る */}
        <div
          style={{
            color: INK_2,
            display: "flex",
            flexDirection: "column",
            fontSize: 38,
            lineHeight: 1.4,
            marginTop: 18,
          }}
        >
          {(isJa
            ? ["直前の10件を、", "ショートカット1つで"]
            : ["Your last ten copies,", "one shortcut away"]
          ).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { data: font, name: "Murecho", style: "normal", weight: 500 },
      ],
    },
  );
}
