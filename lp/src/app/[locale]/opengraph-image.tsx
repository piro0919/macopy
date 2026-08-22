import { ImageResponse } from "next/og";

export const alt = "Macopy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#fbfbfa";
const INK = "#171a1d";
const INK_2 = "#5c636a";
const INK_3 = "#8e959b";
const STEEL = "#2f6b9c";
const LINE = "#e3e4e5";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ImageResponse> {
  const { locale } = await params;
  const isJa = locale === "ja";

  const rows = isJa
    ? [
        "https://kkweb.io/blog/",
        "会議のメモ: 来週までに見積り",
        "piro.haniwa@example.com",
        "git rebase -i origin/main",
      ]
    : [
        "https://kkweb.io/blog/",
        "Meeting note: estimate by next week",
        "piro.haniwa@example.com",
        "git rebase -i origin/main",
      ];

  return new ImageResponse(
    <div
      style={{
        background: PAPER,
        display: "flex",
        height: "100%",
        padding: "60px 64px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 640,
        }}
      >
        <div style={{ color: STEEL, fontSize: 19, letterSpacing: 5 }}>
          MACOPY
        </div>
        <div
          style={{
            color: INK,
            display: "flex",
            flexDirection: "column",
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.25,
            marginTop: 26,
          }}
        >
          {(isJa
            ? ["直前にコピーした10件を、", "ショートカット1つで"]
            : ["Your last ten copies,", "one shortcut away"]
          ).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div style={{ color: INK_2, fontSize: 21, marginTop: 28 }}>
          {isJa
            ? "無料・オープンソース。Apple Silicon の Mac 向け。"
            : "Free and open source. For Apple Silicon Macs."}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 28,
        }}
      >
        <div
          style={{
            borderBottom: `2px solid ${INK}`,
            color: INK,
            display: "flex",
            fontSize: 18,
            justifyContent: "space-between",
            paddingBottom: 12,
          }}
        >
          <span>{isJa ? "きょうの履歴" : "Recent copies"}</span>
          <span style={{ color: INK_3 }}>
            {isJa ? "数字キーで選ぶ" : "Pick with a number key"}
          </span>
        </div>
        {rows.map((row, i) => (
          <div
            key={row}
            style={{
              alignItems: "center",
              borderBottom: `1px solid ${LINE}`,
              display: "flex",
              gap: 22,
              padding: "18px 2px",
            }}
          >
            <span
              style={{ color: i === 0 ? STEEL : INK_3, fontSize: 18, width: 22 }}
            >
              {i + 1}
            </span>
            <span style={{ color: i === 0 ? INK : INK_2, fontSize: 19 }}>
              {row}
            </span>
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
