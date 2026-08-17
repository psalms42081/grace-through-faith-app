// GTF v12 light-mode-first redesign — Bible Reader screen
// Philosophy: scripture is the feature, the reader should disappear.
// Tokens: bg #FAF9F7 · card #FFFFFF · ink #1A1A1A · muted #75706A · accent coral #E8604C
// Lora = large headings + verse text only. Inter = everything else.

const ACCENT = "#E8604C";
// Darker coral for SMALL text on light surfaces (WCAG: #E8604C on white is ~3.3:1, fails at small sizes)
const ACCENT_INK = "#C24431";
const INK = "#1A1A1A";
const MUTED = "#75706A";

function Verse({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="font-['Lora'] text-[17.5px] leading-[1.85]" style={{ color: INK }}>
      <sup
        className="font-['Inter'] text-[10.5px] font-semibold mr-1.5 select-none"
        style={{ color: "#B3ADA5" }}
      >
        {n}
      </sup>
      {children}
    </p>
  );
}

function StudyTool({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border whitespace-nowrap"
      style={{ borderColor: "#EEEAE4" }}
    >
      <span className="text-[14px]">{icon}</span>
      <span className="font-['Inter'] text-[12.5px] font-semibold" style={{ color: INK }}>
        {label}
      </span>
    </button>
  );
}

export function Bible() {
  return (
    <div className="min-h-screen w-full font-['Inter'] flex flex-col" style={{ background: "#FAF9F7" }}>
      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Reader toolbar — compact, quiet */}
        <div className="sticky top-0 z-10 px-5 pt-12 pb-3 flex items-center gap-2"
             style={{ background: "rgba(250,249,247,0.96)", backdropFilter: "blur(8px)" }}>
          <button className="flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full bg-white shadow-[0_1px_8px_rgba(26,26,26,0.07)]">
            <span className="text-[14.5px] font-semibold" style={{ color: INK }}>Joshua 3</span>
            <span className="text-[10px]" style={{ color: MUTED }}>▾</span>
          </button>
          <button className="px-3.5 py-2.5 rounded-full bg-white shadow-[0_1px_8px_rgba(26,26,26,0.07)] text-[13px] font-semibold"
                  style={{ color: MUTED }}>
            KJV
          </button>
          <div className="flex-1" />
          <button className="w-10 h-10 rounded-full bg-white shadow-[0_1px_8px_rgba(26,26,26,0.07)] flex items-center justify-center text-[15px]">
            🔍
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] text-white shadow-[0_4px_14px_rgba(232,96,76,0.35)]"
                  style={{ background: ACCENT }} aria-label="Listen">
            🎧
          </button>
        </div>

        {/* Paper surface — the passage */}
        <div className="mx-5 mt-2 rounded-[28px] bg-white shadow-[0_1px_12px_rgba(26,26,26,0.05)] px-6 pt-8 pb-7">
          <p className="text-[11.5px] font-bold tracking-[0.16em] uppercase" style={{ color: MUTED }}>
            The Book of Joshua
          </p>
          <h1 className="font-['Lora'] text-[30px] font-semibold mt-1.5" style={{ color: INK }}>
            Chapter 3
          </h1>
          <p className="text-[12.5px] mt-1" style={{ color: MUTED }}>Israel crosses the Jordan</p>

          <div className="mt-6 flex flex-col gap-4">
            <Verse n={1}>
              And Joshua rose early in the morning; and they removed from Shittim, and came to
              Jordan, he and all the children of Israel, and lodged there before they passed over.
            </Verse>
            <Verse n={2}>
              And it came to pass after three days, that the officers went through the host;
            </Verse>
            <Verse n={3}>
              And they commanded the people, saying, When ye see the ark of the covenant of the
              LORD your God, and the priests the Levites bearing it, then ye shall remove from your
              place, and go after it.
            </Verse>
            <Verse n={4}>
              Yet there shall be a space between you and it, about two thousand cubits by measure:
              come not near unto it, that ye may know the way by which ye must go: for ye have not
              passed this way heretofore.
            </Verse>
            <Verse n={5}>
              And Joshua said unto the people, Sanctify yourselves: for to morrow the LORD will do
              wonders among you.
            </Verse>
            <Verse n={6}>
              And Joshua spake unto the priests, saying, Take up the ark of the covenant, and pass
              over before the people. And they took up the ark of the covenant, and went before the
              people.
            </Verse>
            <Verse n={7}>
              And the LORD said unto Joshua, This day will I begin to magnify thee in the sight of
              all Israel, that they may know that, as I was with Moses, so I will be with thee.
            </Verse>
            <Verse n={8}>
              And thou shalt command the priests that bear the ark of the covenant, saying, When ye
              are come to the brink of the water of Jordan, ye shall stand still in Jordan.
            </Verse>
          </div>

          {/* Quiet chapter-level study affordance */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: "#F0ECE6" }}>
            <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase" style={{ color: MUTED }}>
              Study this chapter
            </p>
            <div className="flex gap-2 mt-3 overflow-x-auto -mx-6 px-6">
              <StudyTool icon="🗺️" label="Context" />
              <StudyTool icon="🔤" label="Word Study" />
              <StudyTool icon="📜" label="Historic Voices" />
              <StudyTool icon="🌱" label="Application" />
            </div>
          </div>
        </div>

        {/* Chapter navigation — quiet */}
        <div className="mx-5 mt-4 flex items-center justify-between">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-[0_1px_8px_rgba(26,26,26,0.06)] text-[13px] font-semibold"
                  style={{ color: MUTED }}>
            ← Joshua 2
          </button>
          <span className="text-[12px] font-medium" style={{ color: "#B3ADA5" }}>Chapter 3 of 24</span>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-[0_1px_8px_rgba(26,26,26,0.06)] text-[13px] font-semibold"
                  style={{ color: INK }}>
            Joshua 4 →
          </button>
        </div>
      </div>

      {/* Bottom nav — identical to Home.tsx, Bible active */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-2 pt-2.5 pb-6 flex justify-around"
           style={{ borderColor: "#F0ECE6" }}>
        {[
          { l: "Home", i: "🏠" },
          { l: "Bible", i: "📖", active: true },
          { l: "Plans", i: "🗓️" },
          { l: "Discover", i: "🧭" },
          { l: "Profile", i: "👤" },
        ].map(t => (
          <div key={t.l} className="flex flex-col items-center gap-1 w-14">
            <span className="text-[19px]" style={{ opacity: t.active ? 1 : 0.45 }}>{t.i}</span>
            <span className="text-[10.5px] font-semibold" style={{ color: t.active ? ACCENT_INK : MUTED }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
