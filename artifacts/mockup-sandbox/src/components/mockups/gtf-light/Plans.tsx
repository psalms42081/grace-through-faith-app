// GTF v12 light-mode-first redesign — Plans tab (Coral accent, Purple = Plans category)
// Tokens: bg #FAF9F7 · card #FFFFFF · ink #1A1A1A · muted #75706A · accent coral #E8604C
// Lora = large headings + verse text only. Inter = everything else.

const ACCENT = "#E8604C";
// Darker coral for SMALL text on light surfaces (WCAG: #E8604C on white fails at small sizes)
const ACCENT_INK = "#C24431";
const INK = "#1A1A1A";
const MUTED = "#75706A";
// Refined purple family for the Plans category (small accents + tints only)
const PLUM = "#6A4FD0";
const PLUM_INK = "#5A41B8";
const PLUM_TINT = "#EAE6FA";

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-[52px] h-[52px] shrink-0">
      <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#EFEBE5" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11.5px] font-bold" style={{ color: INK }}>
        {pct}%
      </span>
    </div>
  );
}

function ActivePlanCard({
  art, artAlt, tileBg, eyebrow, eyebrowColor, title, meta, pct, ringColor, cta, ctaBg, ctaColor,
}: {
  art: string; artAlt: string; tileBg: string; eyebrow: string; eyebrowColor: string; title: string;
  meta: string; pct: number; ringColor: string; cta: string; ctaBg: string; ctaColor: string;
}) {
  return (
    <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_16px_rgba(26,26,26,0.07)]">
      <div className="flex items-center gap-3.5">
        <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden shrink-0" style={{ background: tileBg }}>
          <img src={art} alt={artAlt} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-bold tracking-[0.13em] uppercase" style={{ color: eyebrowColor }}>{eyebrow}</p>
          <p className="text-[15.5px] font-semibold mt-0.5 truncate" style={{ color: INK }}>{title}</p>
          <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>{meta}</p>
        </div>
        <ProgressRing pct={pct} color={ringColor} />
      </div>
      <button
        className="mt-3.5 w-full py-2.5 rounded-full text-[13.5px] font-semibold"
        style={{ background: ctaBg, color: ctaColor }}
      >
        {cta}
      </button>
    </div>
  );
}

function PlanTile({ bg, fg, art, artAlt, title, meta }: { bg: string; fg: string; art: string; artAlt: string; title: string; meta: string }) {
  return (
    <div className="rounded-[20px] overflow-hidden bg-white shadow-[0_2px_14px_rgba(26,26,26,0.07)]">
      <div className="h-[92px]" style={{ background: bg }}>
        <img src={art} alt={artAlt} className="w-full h-full object-cover" />
      </div>
      <div className="px-3.5 pt-3 pb-3.5">
        <p className="text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>{title}</p>
        <p className="text-[11.5px] font-medium mt-1" style={{ color: fg }}>{meta}</p>
      </div>
    </div>
  );
}

function CategoryChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className="font-['Inter'] text-[13px] font-semibold px-4 py-2 rounded-full whitespace-nowrap border"
      style={active
        ? { background: PLUM, color: "#FFFFFF", borderColor: PLUM }
        : { background: "#FFFFFF", color: MUTED, borderColor: "#EBE7E1" }}
    >
      {label}
    </button>
  );
}

export function Plans() {
  return (
    <div className="min-h-screen w-full font-['Inter'] flex flex-col" style={{ background: "#FAF9F7" }}>
      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: MUTED }}>2 active · 47-day streak 🔥</p>
            <h1 className="font-['Lora'] text-[26px] font-semibold mt-0.5" style={{ color: INK }}>Plans</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-white shadow-[0_1px_6px_rgba(26,26,26,0.07)] flex items-center justify-center text-[17px]">
            🔍
          </button>
        </div>

        {/* My Plans */}
        <div className="px-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>My Plans</h3>
            <span className="text-[13px] font-semibold" style={{ color: MUTED }}>See history</span>
          </div>

          <div className="flex flex-col gap-3 mt-3.5">
            {/* Today's reading — primary active plan */}
            <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_16px_rgba(26,26,26,0.07)]">
              <div className="flex items-center gap-3.5">
                <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden shrink-0" style={{ background: PLUM_TINT }}>
                  <img src="/__mockup/images/gtf-art/cover-steps-to-christ.png" alt="Steps to Christ book cover" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] font-bold tracking-[0.13em] uppercase" style={{ color: PLUM_INK }}>Reading Plan · Day 7 of 13</p>
                  <p className="text-[15.5px] font-semibold mt-0.5 truncate" style={{ color: INK }}>Steps to Christ</p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Ellen G. White · 13 chapters</p>
                </div>
                <ProgressRing pct={54} color={PLUM} />
              </div>
              {/* Today's reading affordance */}
              <div className="mt-3.5 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "#F8F6FD" }}>
                <img src="/__mockup/images/gtf-art/rhythm-morning.png" alt="Rising sun icon" className="w-6 h-6 object-contain shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: INK }}>Today — Ch. 4 · Confession</p>
                  <p className="font-['Inter'] text-[12.5px] italic mt-0.5 truncate" style={{ color: MUTED }}>
                    “He that covereth his sins shall not prosper…” — Prov. 28:13
                  </p>
                </div>
                <span className="text-[11.5px] font-semibold shrink-0" style={{ color: MUTED }}>6 min</span>
              </div>
              <button
                className="mt-3 w-full py-3 rounded-full text-white text-[14.5px] font-semibold shadow-[0_4px_14px_rgba(232,96,76,0.35)]"
                style={{ background: ACCENT }}
              >
                Continue Reading
              </button>
            </div>

            {/* Sabbath School — teal category */}
            <ActivePlanCard
              art="/__mockup/images/gtf-art/cover-joshua-v2.png"
              artAlt="The Book of Joshua study cover"
              tileBg="#DFF6F2"
              eyebrow="Sabbath School · Q3 2026"
              eyebrowColor="#0B7285"
              title="The Book of Joshua"
              meta="Lesson 7 · Wednesday — The Crossing"
              pct={46}
              ringColor="#13A0A2"
              cta="Open Wednesday's Study"
              ctaBg="#E3F2F7"
              ctaColor="#0B7285"
            />
          </div>
        </div>

        {/* Featured plan — the ONE gradient, purple-led */}
        <div className="mx-5 mt-7 rounded-[28px] overflow-hidden shadow-[0_4px_24px_rgba(26,26,26,0.10)]">
          <div className="relative px-6 pt-6 pb-5 text-white">
            <img
              src="/__mockup/images/gtf-art/cover-desire-of-ages.png"
              alt="The Desire of Ages cover art"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0"
                 style={{ background: "linear-gradient(140deg,rgba(76,58,168,0.92) 0%,rgba(106,79,208,0.86) 55%,rgba(155,123,232,0.78) 100%)" }} />
            <div className="relative flex items-center justify-between">
              <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-white/75">Featured Plan</p>
              <span className="text-[11px] font-semibold bg-white/20 rounded-full px-2.5 py-1">21 days</span>
            </div>
            <h2 className="relative font-['Lora'] text-[21px] font-semibold mt-3 leading-snug">The Desire of Ages: Walking with Jesus</h2>
            <p className="relative text-[13px] mt-2 text-white/85 leading-relaxed">
              Three weeks through the life of Christ — one chapter and one Gospel passage a day.
            </p>
            <div className="relative mt-4 flex items-center gap-2.5">
              <button className="px-5 py-2.5 rounded-full bg-white text-[13.5px] font-semibold" style={{ color: "#4C3AA8" }}>
                Start Plan
              </button>
              <button className="px-4 py-2.5 rounded-full bg-white/20 text-white text-[13.5px] font-semibold">Preview</button>
            </div>
          </div>
        </div>

        {/* Browse Plans */}
        <div className="mt-7">
          <div className="flex items-baseline justify-between px-5">
            <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Browse Plans</h3>
            <span className="text-[13px] font-semibold" style={{ color: ACCENT_INK }}>See all</span>
          </div>

          {/* Category filter chips */}
          <div className="flex gap-2 mt-3.5 px-5 overflow-x-auto">
            <CategoryChip label="All" active />
            <CategoryChip label="Prayer" />
            <CategoryChip label="Prophecy" />
            <CategoryChip label="Youth" />
            <CategoryChip label="New Believers" />
            <CategoryChip label="Health" />
          </div>

          {/* Plan library grid — flat colour covers */}
          <div className="grid grid-cols-2 gap-3 px-5 mt-4">
            <PlanTile bg="#FFF0D9" fg="#C07716" art="/__mockup/images/gtf-art/plan-prayer-v3.png" artAlt="30 Days of Prayer plan art" title="30 Days of Prayer" meta="Prayer · 30 days" />
            <PlanTile bg="#DDF0FB" fg="#1D7FC4" art="/__mockup/images/gtf-art/plan-prophecy.png" artAlt="Daniel prophecy plan art" title="Daniel: Kingdoms & Prophecy" meta="Prophecy · 12 days" />
            <PlanTile bg="#FCE1EC" fg="#C2367C" art="/__mockup/images/gtf-art/plan-new-believers.png" artAlt="New believers plan art" title="First Steps: New in Christ" meta="New Believers · 14 days" />
            <PlanTile bg="#DFF6F2" fg="#0E8F7E" art="/__mockup/images/gtf-art/plan-sabbath.png" artAlt="Sabbath rest plan art" title="Sabbath Rest Reset" meta="Sabbath · 7 days" />
            <PlanTile bg="#EAE6FA" fg="#6A4FD0" art="/__mockup/images/gtf-art/plan-youth.png" artAlt="Revelation for Youth plan art" title="Revelation for Youth" meta="Youth · 21 days" />
            <PlanTile bg="#FDE8E4" fg="#C24431" art="/__mockup/images/gtf-art/plan-health.png" artAlt="Ministry of Healing health plan art" title="The Ministry of Healing" meta="Health · 10 days" />
          </div>
        </div>

        {/* Completed */}
        <div className="px-5 mt-7">
          <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Completed</h3>
          <div className="mt-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-[0_1px_8px_rgba(26,26,26,0.06)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[19px] shrink-0" style={{ background: "#E3F2F7" }}>
              🏔️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold truncate" style={{ color: INK }}>The Sermon on the Mount</p>
              <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Finished July 12 · Matthew 5–7 · KJV</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px]" style={{ background: "#3BAA6B" }}>✓</div>
          </div>
        </div>
      </div>

      {/* Bottom nav — identical to Home, active = Plans */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-2 pt-2.5 pb-6 flex justify-around"
           style={{ borderColor: "#F0ECE6" }}>
        {[
          { l: "Home", i: "🏠" },
          { l: "Bible", i: "📖" },
          { l: "Plans", i: "🗓️", active: true },
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
