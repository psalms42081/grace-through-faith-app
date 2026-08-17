// GTF v12 light-mode-first redesign — Sabbath School lesson detail (Teal category)
// Tokens: bg #FAF9F7 · card #FFFFFF · ink #1A1A1A · muted #75706A · accent coral #E8604C
// Teal is Sabbath School's category colour. ONE gradient hero = the lesson card.
// Lora = large headings + verse text only. Inter = everything else.

const ACCENT_INK = "#C24431";
const INK = "#1A1A1A";
const MUTED = "#75706A";
const TEAL_DEEP = "#0B7285";
const TEAL_INK = "#0A6B7D"; // small teal text on light surfaces (WCAG-safe)
const TEAL_TINT = "#E4F4F4"; // find-it-fast tint for today's row

type DayRowProps = {
  day: string;
  date: string;
  title: string;
  meta: string;
  state: "done" | "today" | "upcoming";
};

function DayRow({ day, date, title, meta, state }: DayRowProps) {
  const isToday = state === "today";
  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5"
      style={
        isToday
          ? {
              background: TEAL_TINT,
              boxShadow: "0 2px 12px rgba(11,114,133,0.14)",
              border: "1.5px solid #B8E0E0",
            }
          : { background: "#FFFFFF", boxShadow: "0 1px 8px rgba(26,26,26,0.06)" }
      }
    >
      {/* Day badge */}
      <div
        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
        style={
          isToday
            ? { background: TEAL_DEEP }
            : { background: state === "done" ? "#F0F7F6" : "#F3F0EC" }
        }
      >
        <span
          className="text-[10px] font-bold tracking-wide uppercase leading-none"
          style={{ color: isToday ? "rgba(255,255,255,0.75)" : MUTED }}
        >
          {day}
        </span>
        <span
          className="text-[15px] font-bold leading-none mt-1"
          style={{ color: isToday ? "#FFFFFF" : INK }}
        >
          {date}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-['Inter'] text-[15px] font-semibold truncate" style={{ color: INK }}>
            {title}
          </p>
          {isToday && (
            <span
              className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ background: TEAL_DEEP }}
            >
              Today
            </span>
          )}
        </div>
        <p className="font-['Inter'] text-[12.5px] mt-0.5 truncate" style={{ color: isToday ? TEAL_INK : MUTED }}>
          {meta}
        </p>
      </div>
      {state === "done" ? (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px] shrink-0"
          style={{ background: "#3BAA6B" }}
        >
          ✓
        </div>
      ) : isToday ? (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] shrink-0"
          style={{ background: TEAL_DEEP }}
        >
          →
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full border-2 shrink-0" style={{ borderColor: "#E5E1DB" }} />
      )}
    </div>
  );
}

function ExtraRow({ icon, iconBg, title, meta }: { icon: string; iconBg: string; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[17px] shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-['Inter'] text-[14.5px] font-semibold truncate" style={{ color: INK }}>{title}</p>
        <p className="font-['Inter'] text-[12px] mt-0.5" style={{ color: MUTED }}>{meta}</p>
      </div>
      <span className="text-[15px]" style={{ color: "#C9C4BC" }}>›</span>
    </div>
  );
}

export function SabbathSchool() {
  return (
    <div className="min-h-screen w-full font-['Inter'] flex flex-col" style={{ background: "#FAF9F7" }}>
      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Top bar — pushed detail screen */}
        <div className="px-5 pt-12 pb-3 flex items-center justify-between">
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[16px] shadow-[0_1px_6px_rgba(26,26,26,0.07)]">
            ←
          </button>
          <p className="text-[13.5px] font-semibold" style={{ color: MUTED }}>Sabbath School</p>
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[16px] shadow-[0_1px_6px_rgba(26,26,26,0.07)]">
            ↗
          </button>
        </div>

        {/* THE gradient hero — lesson card */}
        <div className="mx-5 mt-1 rounded-[28px] overflow-hidden shadow-[0_4px_24px_rgba(26,26,26,0.10)]">
          <div
            className="relative px-6 pt-6 pb-6 text-white"
            style={{ background: "linear-gradient(140deg,#0B7285 0%,#13A0A2 55%,#2FC4A0 100%)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-white/75">Q3 2026 · Adult Quarterly</p>
              <span className="text-[11px] font-semibold bg-white/20 rounded-full px-2.5 py-1">Lesson 7 of 13</span>
            </div>
            <h1 className="font-['Lora'] text-[24px] font-semibold mt-3 leading-snug">
              The Book of Joshua: Possessing the Promise
            </h1>
            <p className="text-[13px] mt-2 text-white/80">Aug 15 – Aug 21 · “Crossing into Canaan”</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-white/25">
                <div className="h-1.5 rounded-full bg-white" style={{ width: "54%" }} />
              </div>
              <span className="text-[12px] font-semibold text-white/85">4 of 7 days</span>
            </div>
            <button className="mt-5 w-full py-3 rounded-full bg-white text-[14.5px] font-semibold" style={{ color: TEAL_DEEP }}>
              Continue — Wednesday: The Crossing
            </button>
          </div>
        </div>

        {/* Memory verse */}
        <div className="mx-5 mt-5 rounded-[24px] bg-white px-6 pt-5 pb-6 shadow-[0_2px_16px_rgba(26,26,26,0.07)]">
          <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase" style={{ color: TEAL_INK }}>
            Memory Verse
          </p>
          <p className="font-['Lora'] text-[19px] leading-[1.5] mt-3" style={{ color: INK }}>
            “Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou
            dismayed: for the Lord thy God is with thee whithersoever thou goest.”
          </p>
          <p className="text-[13px] font-semibold mt-3" style={{ color: MUTED }}>Joshua 1:9 · KJV</p>
        </div>

        {/* This week's days */}
        <div className="px-5 mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>This Week</h2>
            <span className="text-[13px] font-semibold" style={{ color: MUTED }}>Aug 15–21</span>
          </div>
          <div className="flex flex-col gap-2.5 mt-3.5">
            <DayRow day="Sab" date="15" title="Sabbath Afternoon" meta="Read for this week's study · Josh. 1–4" state="done" />
            <DayRow day="Sun" date="16" title="A Charge to Be Strong" meta="Joshua 1:1–9 · 8 min" state="done" />
            <DayRow day="Mon" date="17" title="Rahab's Confession" meta="Joshua 2:8–14 · 7 min" state="done" />
            <DayRow day="Tue" date="18" title="Sanctify Yourselves" meta="Joshua 3:1–6 · 6 min" state="done" />
            <DayRow day="Wed" date="19" title="The Crossing" meta="Joshua 3:14–17 · 9 min" state="today" />
            <DayRow day="Thu" date="20" title="Stones of Remembrance" meta="Joshua 4:1–9 · 7 min" state="upcoming" />
            <DayRow day="Fri" date="21" title="Further Thought" meta="Patriarchs and Prophets, ch. 44 · 10 min" state="upcoming" />
          </div>
        </div>

        {/* Quiet extras */}
        <div className="px-5 mt-7">
          <h2 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Go Deeper</h2>
          <div className="mt-3.5 rounded-2xl bg-white shadow-[0_1px_8px_rgba(26,26,26,0.06)] divide-y" style={{ borderColor: "#F3F0EC" }}>
            <ExtraRow icon="▶️" iconBg="#E4F4F4" title="Watch — Hope Sabbath School" meta="Lesson 7 panel discussion · 58 min" />
            <ExtraRow icon="💬" iconBg="#FFF0D9" title="Teacher Comments" meta="Teaching plan & discussion starters" />
            <ExtraRow icon="🕊️" iconBg="#EAE6FA" title="Ellen G. White Notes" meta="Patriarchs and Prophets · selected passages" />
          </div>
        </div>
      </div>

      {/* Bottom nav — pushed detail screen, no active highlight */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-2 pt-2.5 pb-6 flex justify-around"
        style={{ borderColor: "#F0ECE6" }}
      >
        {[
          { l: "Home", i: "🏠" },
          { l: "Bible", i: "📖" },
          { l: "Plans", i: "🗓️" },
          { l: "Discover", i: "🧭" },
          { l: "Profile", i: "👤" },
        ].map(t => (
          <div key={t.l} className="flex flex-col items-center gap-1 w-14">
            <span className="text-[19px]" style={{ opacity: 0.45 }}>{t.i}</span>
            <span className="text-[10.5px] font-semibold" style={{ color: MUTED }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
