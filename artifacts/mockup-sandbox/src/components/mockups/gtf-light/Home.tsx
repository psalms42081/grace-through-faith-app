// GTF v12 light-mode-first redesign — Home screen (Coral accent)
// Tokens: bg #FAF9F7 · card #FFFFFF · ink #1A1A1A · muted #75706A · accent coral #E8604C
// Lora = large headings + verse text only. Inter = everything else.

const ACCENT = "#E8604C";
// Darker coral for SMALL text on light surfaces (WCAG: #E8604C on white is ~3.3:1, fails at small sizes)
const ACCENT_INK = "#C24431";
const INK = "#1A1A1A";
const MUTED = "#75706A";

function Chip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="font-['Inter'] text-[13px] font-semibold px-4 py-2 rounded-full whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function RhythmRow({
  icon, iconBg, title, meta, done,
}: { icon: string; iconBg: string; title: string; meta: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-[0_1px_8px_rgba(26,26,26,0.06)]">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <img src={icon} alt="" className="w-7 h-7 object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-['Inter'] text-[15px] font-semibold truncate" style={{ color: INK }}>{title}</p>
        <p className="font-['Inter'] text-[12.5px] mt-0.5" style={{ color: MUTED }}>{meta}</p>
      </div>
      {done ? (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px]" style={{ background: "#3BAA6B" }}>✓</div>
      ) : (
        <div className="w-7 h-7 rounded-full border-2" style={{ borderColor: "#E5E1DB" }} />
      )}
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-screen w-full font-['Inter'] flex flex-col" style={{ background: "#FAF9F7" }}>
      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: MUTED }}>Tuesday, August 18</p>
            <h1 className="font-['Lora'] text-[26px] font-semibold mt-0.5" style={{ color: INK }}>
              Good evening, Joe
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-[0_1px_6px_rgba(26,26,26,0.07)]">
              <span className="text-[14px]">🧒</span>
              <span className="text-[13px] font-semibold" style={{ color: INK }}>Kids</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-[0_1px_6px_rgba(26,26,26,0.07)]">
              <span className="text-[14px]">🔥</span>
              <span className="text-[13.5px] font-bold" style={{ color: INK }}>47</span>
            </div>
            <img src="/__mockup/images/gtf-art/avatar-coral.png" alt="Joe" className="w-10 h-10 rounded-full object-cover" />
          </div>
        </div>

        {/* Hero card — Verse / Signpost / Reflection tabs */}
        <div className="mx-5 rounded-[28px] overflow-hidden bg-white shadow-[0_4px_24px_rgba(26,26,26,0.09)]">
          {/* segmented tabs */}
          <div className="flex gap-1 p-1.5 m-4 mb-0 rounded-full" style={{ background: "#F3F0EC" }}>
            {["Verse", "Signpost", "Reflection"].map((t, i) => (
              <button key={t}
                className="flex-1 py-2 rounded-full text-[13.5px] font-semibold"
                style={i === 0
                  ? { background: "#FFFFFF", color: INK, boxShadow: "0 1px 4px rgba(26,26,26,0.10)" }
                  : { color: MUTED }}>
                {t}
              </button>
            ))}
          </div>
          {/* VOTD */}
          <div className="px-6 pt-6 pb-2">
            <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase" style={{ color: ACCENT_INK }}>Verse of the Day</p>
            <p className="font-['Lora'] text-[22px] leading-[1.45] mt-3" style={{ color: INK }}>
              “For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.”
            </p>
            <p className="text-[13.5px] font-semibold mt-3" style={{ color: MUTED }}>Ephesians 2:8 · KJV</p>
          </div>
          <div className="flex items-center gap-2.5 px-6 pb-6 pt-3">
            <button className="flex-1 py-3 rounded-full text-white text-[14.5px] font-semibold shadow-[0_4px_14px_rgba(232,96,76,0.35)]"
                    style={{ background: ACCENT }}>
              Read Ephesians 2
            </button>
            <button className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] bg-white border" style={{ borderColor: "#EEEAE4" }}>🔖</button>
            <button className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] bg-white border" style={{ borderColor: "#EEEAE4" }}>↗</button>
          </div>
        </div>

        {/* Sabbath School card — vibrant gradient cover */}
        <div className="mx-5 mt-5 rounded-[28px] overflow-hidden shadow-[0_4px_24px_rgba(26,26,26,0.10)]">
          <div className="relative px-6 pt-6 pb-5 text-white"
               style={{ background: "linear-gradient(140deg,#0B7285 0%,#13A0A2 55%,#2FC4A0 100%)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-white/75">Sabbath School · Q3 2026</p>
              <span className="text-[11px] font-semibold bg-white/20 rounded-full px-2.5 py-1">Lesson 7 of 13</span>
            </div>
            <h2 className="font-['Lora'] text-[21px] font-semibold mt-3 leading-snug">The Book of Joshua: Possessing the Promise</h2>
            <div className="mt-4 h-1.5 rounded-full bg-white/25">
              <div className="h-1.5 rounded-full bg-white" style={{ width: "54%" }} />
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <button className="px-5 py-2.5 rounded-full bg-white text-[13.5px] font-semibold" style={{ color: "#0B7285" }}>
                Continue — Wednesday
              </button>
              <button className="px-4 py-2.5 rounded-full bg-white/20 text-white text-[13.5px] font-semibold">▶ Watch</button>
            </div>
          </div>
        </div>

        {/* Daily Rhythm */}
        <div className="px-5 mt-7">
          <div className="flex items-baseline justify-between">
            <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Daily Rhythm</h3>
            <span className="text-[13px] font-semibold" style={{ color: MUTED }}>1 of 3 done</span>
          </div>
          <div className="flex flex-col gap-2.5 mt-3.5">
            <RhythmRow icon="/__mockup/images/gtf-art/rhythm-plan.png" iconBg="#EAE6FA" title="Today's Plan — Steps to Christ" meta="Ch. 4 · Confession · 6 min" done />
            <RhythmRow icon="/__mockup/images/gtf-art/rhythm-ss.png" iconBg="#DFF6F2" title="Sabbath School" meta="Wednesday — The Crossing" />
            <RhythmRow icon="/__mockup/images/gtf-art/rhythm-reflection-candle.png" iconBg="#FFF0D9" title="Evening Reflection" meta="2 min · with Ellen White" />
          </div>
        </div>

        {/* Topic chips */}
        <div className="mt-7">
          <h3 className="font-['Lora'] text-[19px] font-semibold px-5" style={{ color: INK }}>Explore Topics</h3>
          <div className="flex gap-2 mt-3.5 px-5 overflow-x-auto">
            <Chip label="Anxiety" bg="#FCE1EC" fg="#C2367C" />
            <Chip label="Hope" bg="#DDF0FB" fg="#1D7FC4" />
            <Chip label="Sabbath" bg="#DFF6F2" fg="#0E8F7E" />
            <Chip label="Prayer" bg="#FFF0D9" fg="#C07716" />
            <Chip label="Grace" bg="#EAE6FA" fg="#6A4FD0" />
          </div>
        </div>
      </div>

      {/* Bottom nav — decided labels */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-2 pt-2.5 pb-6 flex justify-around"
           style={{ borderColor: "#F0ECE6" }}>
        {[
          { l: "Home", i: "🏠", active: true },
          { l: "Bible", i: "📖" },
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
