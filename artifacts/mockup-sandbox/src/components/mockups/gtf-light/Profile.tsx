// GTF v12 light-mode-first redesign — Profile screen (quiet practice surface)
// Tokens: bg #FAF9F7 · card #FFFFFF · ink #1A1A1A · muted #75706A · accent coral #E8604C
// Coral appears in exactly two places: the streak number + the single "Set a reminder" CTA.

const ACCENT = "#E8604C";
// Darker coral for SMALL text on light surfaces (WCAG: #E8604C on white is ~3.3:1, fails at small sizes)
const ACCENT_INK = "#C24431";
const INK = "#1A1A1A";
const MUTED = "#75706A";

function StatCell({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center py-4">
      <p className="text-[21px] font-bold leading-none" style={{ color: valueColor ?? INK }}>{value}</p>
      <p className="text-[11.5px] font-medium mt-1.5" style={{ color: MUTED }}>{label}</p>
    </div>
  );
}

function Badge({ icon, label, earned }: { icon: string; label: string; earned?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-[24px] bg-white shadow-[0_1px_8px_rgba(26,26,26,0.06)]"
        style={earned ? undefined : { opacity: 0.35, filter: "grayscale(1)" }}
      >
        {icon}
      </div>
      <p
        className="text-[10.5px] font-semibold text-center leading-tight"
        style={{ color: earned ? INK : MUTED, opacity: earned ? 1 : 0.6 }}
      >
        {label}
      </p>
    </div>
  );
}

function SettingRow({ icon, label, value, last }: { icon: string; label: string; value?: string; last?: boolean }) {
  return (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5"
      style={last ? undefined : { borderBottom: "1px solid #F3F0EC" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px]" style={{ background: "#F6F3EF" }}>
        {icon}
      </div>
      <p className="flex-1 text-[14.5px] font-semibold" style={{ color: INK }}>{label}</p>
      {value && <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>{value}</p>}
      <span className="text-[15px]" style={{ color: "#C9C4BC" }}>›</span>
    </div>
  );
}

export function Profile() {
  return (
    <div className="min-h-screen w-full font-['Inter'] flex flex-col" style={{ background: "#FAF9F7" }}>
      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="px-5 pt-12 pb-2 flex items-center justify-between">
          <h1 className="font-['Lora'] text-[26px] font-semibold" style={{ color: INK }}>Profile</h1>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-[17px] bg-white shadow-[0_1px_6px_rgba(26,26,26,0.07)]">
            ⚙️
          </button>
        </div>

        {/* Identity */}
        <div className="px-5 mt-4 flex flex-col items-center">
          <img
            src="/__mockup/images/gtf-art/avatar-coral.png"
            alt="Joe's profile avatar"
            className="w-[84px] h-[84px] rounded-full object-cover shadow-[0_4px_16px_rgba(232,96,76,0.28)]"
          />
          <h2 className="font-['Lora'] text-[22px] font-semibold mt-3.5" style={{ color: INK }}>Joe</h2>
          <p className="text-[13px] font-medium mt-1" style={{ color: MUTED }}>Walking through Scripture since March 2024</p>
        </div>

        {/* Stat row — streak is the coral moment */}
        <div className="mx-5 mt-5 bg-white rounded-[24px] shadow-[0_2px_16px_rgba(26,26,26,0.07)] flex items-stretch">
          <div className="flex-1 flex flex-col items-center py-4">
            <p className="text-[21px] font-bold leading-none flex items-center gap-1">
              <span className="text-[18px]">🔥</span>
              <span style={{ color: ACCENT_INK }}>47</span>
            </p>
            <p className="text-[11.5px] font-medium mt-1.5" style={{ color: MUTED }}>Day streak</p>
          </div>
          <div className="w-px my-3.5" style={{ background: "#F0ECE6" }} />
          <StatCell value="312" label="Chapters read" />
          <div className="w-px my-3.5" style={{ background: "#F0ECE6" }} />
          <StatCell value="9" label="Badges" />
        </div>

        {/* The ONE coral CTA */}
        <div className="mx-5 mt-4">
          <button
            className="w-full py-3.5 rounded-full text-white text-[15px] font-semibold shadow-[0_4px_14px_rgba(232,96,76,0.35)]"
            style={{ background: ACCENT }}
          >
            Set a daily reminder
          </button>
          <p className="text-center text-[12px] font-medium mt-2" style={{ color: MUTED }}>
            Joe reads most often around 6:30 AM
          </p>
        </div>

        {/* Milestones */}
        <div className="mt-7">
          <div className="flex items-baseline justify-between px-5">
            <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Milestones</h3>
            <span className="text-[13px] font-semibold" style={{ color: MUTED }}>9 of 24</span>
          </div>
          <div className="flex gap-2.5 mt-3.5 px-5 overflow-x-auto">
            <Badge icon="🌅" label="30 Mornings" earned />
            <Badge icon="📖" label="Gospels Done" earned />
            <Badge icon="🕊️" label="Full Quarter" earned />
            <Badge icon="✍️" label="50 Notes" earned />
            <Badge icon="🌾" label="Book of Joshua" />
            <Badge icon="🕯️" label="90-Day Streak" />
          </div>
        </div>

        {/* Continue growing — quiet plan progress */}
        <div className="mx-5 mt-7 bg-white rounded-[24px] shadow-[0_2px_16px_rgba(26,26,26,0.07)] px-5 py-4">
          <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase" style={{ color: "#6A4FD0" }}>Current Plan</p>
          <p className="font-['Lora'] text-[17px] font-semibold mt-1.5" style={{ color: INK }}>Steps to Christ — Ellen G. White</p>
          <div className="mt-3 h-1.5 rounded-full" style={{ background: "#F0ECE6" }}>
            <div className="h-1.5 rounded-full" style={{ width: "31%", background: "#6A4FD0" }} />
          </div>
          <p className="text-[12.5px] font-medium mt-2" style={{ color: MUTED }}>Chapter 4 of 13 · Confession</p>
        </div>

        {/* Settings */}
        <div className="px-5 mt-7">
          <h3 className="font-['Lora'] text-[19px] font-semibold" style={{ color: INK }}>Settings</h3>
          <div className="mt-3.5 bg-white rounded-[24px] shadow-[0_2px_16px_rgba(26,26,26,0.07)] overflow-hidden">
            <SettingRow icon="🔔" label="Notifications" value="Daily · 6:30 AM" />
            <SettingRow icon="📖" label="Bible version" value="KJV" />
            <SettingRow icon="🌗" label="Appearance" value="Light" />
            <SettingRow icon="⬇️" label="Downloads" value="2 plans offline" />
            <SettingRow icon="ℹ️" label="About" last />
          </div>
          <p className="text-center text-[11.5px] font-medium mt-5" style={{ color: "#B5AFA7" }}>
            Grow Through Faith · v12.0 · “Thy word is a lamp unto my feet” — Psalm 119:105
          </p>
        </div>
      </div>

      {/* Bottom nav — identical to Home.tsx, Profile active */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-2 pt-2.5 pb-6 flex justify-around"
           style={{ borderColor: "#F0ECE6" }}>
        {[
          { l: "Home", i: "🏠" },
          { l: "Bible", i: "📖" },
          { l: "Plans", i: "🗓️" },
          { l: "Discover", i: "🧭" },
          { l: "Profile", i: "👤", active: true },
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
