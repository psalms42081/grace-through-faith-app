// GTF v12 light-mode-first redesign — Discover screen (Coral accent)
// Tokens: bg #FAF9F7 · card #FFFFFF · ink #1A1A1A · muted #75706A · accent coral #E8604C
// Lora = large headings + verse text only. Inter = everything else.
// One gradient hero only — all other tiles/chips are FLAT token colours.

const ACCENT = "#E8604C";
// Darker coral for SMALL text on light surfaces (WCAG: #E8604C on white fails at small sizes)
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

function ContentTile({
  bg, fg, badge, title, meta,
}: { bg: string; fg: string; badge: string; title: string; meta: string }) {
  return (
    <div className="w-[168px] shrink-0 rounded-2xl overflow-hidden bg-white shadow-[0_1px_8px_rgba(26,26,26,0.06)]">
      {/* Flat colour thumbnail — no gradients */}
      <div className="h-[96px] flex flex-col justify-between p-3" style={{ background: bg }}>
        <span className="self-start text-[10px] font-bold tracking-[0.08em] uppercase rounded-full px-2 py-0.5"
              style={{ background: "rgba(255,255,255,0.85)", color: fg }}>
          {badge}
        </span>
        <span className="text-[22px] leading-none self-end">▶</span>
      </div>
      <div className="p-3">
        <p className="font-['Inter'] text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>{title}</p>
        <p className="font-['Inter'] text-[11.5px] mt-1" style={{ color: MUTED }}>{meta}</p>
      </div>
    </div>
  );
}

function StudyMethodRow({
  icon, iconBg, title, desc,
}: { icon: string; iconBg: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-[0_1px_8px_rgba(26,26,26,0.06)]">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[19px] shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-['Inter'] text-[15px] font-semibold truncate" style={{ color: INK }}>{title}</p>
        <p className="font-['Inter'] text-[12.5px] mt-0.5 truncate" style={{ color: MUTED }}>{desc}</p>
      </div>
      <span className="text-[16px]" style={{ color: MUTED }}>›</span>
    </div>
  );
}

export function Discover() {
  return (
    <div className="min-h-screen w-full font-['Inter'] flex flex-col" style={{ background: "#FAF9F7" }}>
      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between">
          <h1 className="font-['Lora'] text-[26px] font-semibold" style={{ color: INK }}>Discover</h1>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-[0_1px_6px_rgba(26,26,26,0.07)]">
              <span className="text-[14px]">🔥</span>
              <span className="text-[13.5px] font-bold" style={{ color: INK }}>47</span>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[15px] font-bold"
                 style={{ background: "linear-gradient(135deg,#E8604C,#F2935C)" }}>J</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mx-5">
          <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3.5 shadow-[0_1px_8px_rgba(26,26,26,0.06)]">
            <span className="text-[16px]" style={{ opacity: 0.55 }}>🔍</span>
            <span className="text-[14.5px]" style={{ color: MUTED }}>Search topics, verses, videos…</span>
          </div>
        </div>

        {/* Featured hero — the ONE gradient on this screen (teal = Sabbath School) */}
        <div className="mx-5 mt-5 rounded-[28px] overflow-hidden shadow-[0_4px_24px_rgba(26,26,26,0.10)]">
          <div className="relative px-6 pt-6 pb-6 text-white"
               style={{ background: "linear-gradient(140deg,#0B7285 0%,#13A0A2 55%,#2FC4A0 100%)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-white/75">Featured Series</p>
              <span className="text-[11px] font-semibold bg-white/20 rounded-full px-2.5 py-1">5 episodes</span>
            </div>
            <h2 className="font-['Lora'] text-[22px] font-semibold mt-3 leading-snug">Walls Fall: Faith Lessons from Jericho</h2>
            <p className="text-[13px] mt-2 text-white/85 leading-relaxed">
              A video companion to this quarter's study of Joshua — how obedience precedes the miracle.
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <button className="px-5 py-2.5 rounded-full bg-white text-[13.5px] font-semibold" style={{ color: "#0B7285" }}>
                ▶ Watch Episode 1
              </button>
              <button className="px-4 py-2.5 rounded-full bg-white/20 text-white text-[13.5px] font-semibold">+ Save</button>
            </div>
          </div>
        </div>

        {/* Topic chips — two staggered rows */}
        <div className="mt-7">
          <h3 className="font-['Lora'] text-[19px] font-semibold px-5" style={{ color: INK }}>Browse Topics</h3>
          <div className="flex gap-2 mt-3.5 px-5 overflow-x-auto">
            <Chip label="Anxiety" bg="#FCE1EC" fg="#C2367C" />
            <Chip label="Hope" bg="#DDF0FB" fg="#1D7FC4" />
            <Chip label="Sabbath" bg="#DFF6F2" fg="#0E8F7E" />
            <Chip label="Prayer" bg="#FFF0D9" fg="#C07716" />
            <Chip label="Grace" bg="#EAE6FA" fg="#6A4FD0" />
          </div>
          <div className="flex gap-2 mt-2 px-5 overflow-x-auto">
            <Chip label="Forgiveness" bg="#EAE6FA" fg="#6A4FD0" />
            <Chip label="Health" bg="#DFF6F2" fg="#0E8F7E" />
            <Chip label="Prophecy" bg="#FFF0D9" fg="#C07716" />
            <Chip label="Family" bg="#FCE1EC" fg="#C2367C" />
            <Chip label="Second Coming" bg="#DDF0FB" fg="#1D7FC4" />
          </div>
        </div>

        {/* Video row */}
        <div className="mt-7">
          <div className="flex items-baseline justify-between px-5">
            <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Watch</h3>
            <span className="text-[13px] font-semibold" style={{ color: ACCENT_INK }}>See all</span>
          </div>
          <div className="flex gap-3 mt-3.5 px-5 overflow-x-auto">
            <ContentTile bg="#DFF6F2" fg="#0E8F7E" badge="Video · 12 min"
                         title="The Crossing of Jordan" meta="Joshua 3 · Sabbath School" />
            <ContentTile bg="#EAE6FA" fg="#6A4FD0" badge="Video · 8 min"
                         title="What Is Righteousness by Faith?" meta="Romans 3 · Doctrine" />
            <ContentTile bg="#FFF0D9" fg="#C07716" badge="Video · 15 min"
                         title="The Sanctuary Explained" meta="Hebrews 8 · Series" />
          </div>
        </div>

        {/* Devotional row */}
        <div className="mt-7">
          <div className="flex items-baseline justify-between px-5">
            <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Daily Devotionals</h3>
            <span className="text-[13px] font-semibold" style={{ color: ACCENT_INK }}>See all</span>
          </div>
          <div className="flex gap-3 mt-3.5 px-5 overflow-x-auto">
            <ContentTile bg="#FDE8E4" fg="#C24431" badge="Devotional · 5 min"
                         title="Steps to Christ — Consecration" meta="Ellen G. White · Ch. 5" />
            <ContentTile bg="#DDF0FB" fg="#1D7FC4" badge="Devotional · 4 min"
                         title="Morning Watch: Be Strong" meta="Joshua 1:9 · KJV" />
            <ContentTile bg="#FCE1EC" fg="#C2367C" badge="Devotional · 6 min"
                         title="The Desire of Ages — At Bethany" meta="Ellen G. White · Ch. 62" />
          </div>
        </div>

        {/* Study methods — quiet row of cards */}
        <div className="px-5 mt-7">
          <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Ways to Study</h3>
          <p className="text-[13px] mt-1" style={{ color: MUTED }}>Pick a method that fits how you learn.</p>
          <div className="flex flex-col gap-2.5 mt-3.5">
            <StudyMethodRow icon="🧭" iconBg="#FDE8E4" title="Guided Study"
                            desc="Step-by-step through a passage with prompts" />
            <StudyMethodRow icon="🔎" iconBg="#E3F2F7" title="Deep Dive"
                            desc="Cross-references, Greek & Hebrew word studies" />
            <StudyMethodRow icon="📝" iconBg="#EAE6FA" title="Inductive Study"
                            desc="Observe, interpret, apply — at your own pace" />
          </div>
        </div>
      </div>

      {/* Bottom nav — decided labels */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-2 pt-2.5 pb-6 flex justify-around"
           style={{ borderColor: "#F0ECE6" }}>
        {[
          { l: "Home", i: "🏠" },
          { l: "Bible", i: "📖" },
          { l: "Plans", i: "🗓️" },
          { l: "Discover", i: "🧭", active: true },
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
