// GTF Illustration Style Guide — full set shelf test (Path B, Aug 2026)
// v2: Prayer lamp regenerated flat; Reflection = candle (crescent banned set-wide).

const INK = "#1A1A1A";
const MUTED = "#75706A";
const ART = "/__mockup/images/gtf-art/";

const tiles = [
  { src: "plan-prayer.png", label: "Prayer" },
  { src: "plan-prophecy.png", label: "Prophecy" },
  { src: "plan-youth.png", label: "Youth" },
  { src: "plan-new-believers.png", label: "New Believers" },
  { src: "plan-sabbath.png", label: "Sabbath" },
  { src: "plan-health.png", label: "Health" },
  { src: "plan-family.png", label: "Family" },
  { src: "plan-doctrine.png", label: "Doctrine" },
  { src: "plan-end-times.png", label: "End Times" },
  { src: "plan-forgiveness.png", label: "Forgiveness" },
];
const icons = [
  { src: "rhythm-plan.png", label: "Today's Plan" },
  { src: "rhythm-ss.png", label: "Sabbath School" },
  { src: "rhythm-reflection-candle.png", label: "Reflection" },
  { src: "rhythm-morning.png", label: "Morning" },
  { src: "rhythm-listen.png", label: "Listen" },
];
const covers = [
  { src: "cover-steps-to-christ.png", label: "Steps to Christ" },
  { src: "cover-desire-of-ages.png", label: "The Desire of Ages" },
  { src: "cover-joshua.png", label: "Book of Joshua" },
  { src: "cover-daniel.png", label: "Daniel" },
  { src: "cover-bible-year.png", label: "Bible in a Year" },
];
const avatars = [
  { src: "avatar-coral.png", label: "Coral" },
  { src: "avatar-amber.png", label: "Amber" },
  { src: "avatar-sage.png", label: "Sage" },
  { src: "avatar-sky.png", label: "Sky" },
  { src: "avatar-violet.png", label: "Violet" },
  { src: "avatar-sand.png", label: "Sand" },
];

function Caption({ children }: { children: string }) {
  return <p className="text-[12px] font-semibold mt-2 text-center" style={{ color: MUTED }}>{children}</p>;
}

export function StyleShelf() {
  return (
    <div className="min-h-screen w-full font-['Inter'] p-8" style={{ background: "#FAF9F7" }}>
      <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase" style={{ color: "#C24431" }}>Illustration Style Guide · Full Set v2</p>
      <h1 className="font-['Lora'] text-[26px] font-semibold mt-1" style={{ color: INK }}>Shelf Test — 26 assets, one illustrator?</h1>

      <h2 className="font-['Lora'] text-[18px] font-semibold mt-7" style={{ color: INK }}>Plan category tiles</h2>
      <div className="grid grid-cols-5 gap-5 mt-3 max-w-[880px]">
        {tiles.map(t => (
          <div key={t.label}>
            <img src={ART + t.src} alt={t.label} className="w-full aspect-square rounded-2xl object-cover shadow-[0_1px_8px_rgba(26,26,26,0.08)]" />
            <Caption>{t.label}</Caption>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4 items-center">
        {tiles.map(t => <img key={t.label} src={ART + t.src} alt="" className="w-[60px] h-[60px] rounded-lg object-cover" />)}
        <span className="text-[12px] font-semibold ml-2" style={{ color: MUTED }}>Squint test @60px</span>
      </div>

      <h2 className="font-['Lora'] text-[18px] font-semibold mt-8" style={{ color: INK }}>Daily Rhythm icons (transparent)</h2>
      <div className="flex gap-5 mt-3 items-end">
        {icons.map(t => (
          <div key={t.label} className="w-[100px]">
            <div className="w-[100px] h-[100px] rounded-2xl bg-white shadow-[0_1px_8px_rgba(26,26,26,0.08)] flex items-center justify-center">
              <img src={ART + t.src} alt={t.label} className="w-[66px] h-[66px] object-contain" />
            </div>
            <Caption>{t.label}</Caption>
          </div>
        ))}
        <div className="ml-4">
          <div className="flex gap-2">
            {icons.map(t => (
              <div key={t.label} className="w-11 h-11 rounded-xl bg-white shadow flex items-center justify-center">
                <img src={ART + t.src} alt="" className="w-7 h-7 object-contain" />
              </div>
            ))}
          </div>
          <Caption>In-card size @44px</Caption>
        </div>
      </div>

      <h2 className="font-['Lora'] text-[18px] font-semibold mt-8" style={{ color: INK }}>Featured plan covers</h2>
      <div className="flex gap-5 mt-3 flex-wrap max-w-[1100px]">
        {covers.map(t => (
          <div key={t.label} className="w-[330px]">
            <img src={ART + t.src} alt={t.label} className="w-[330px] h-[220px] rounded-2xl object-cover shadow-[0_1px_8px_rgba(26,26,26,0.08)]" />
            <Caption>{t.label}</Caption>
          </div>
        ))}
      </div>

      <h2 className="font-['Lora'] text-[18px] font-semibold mt-8" style={{ color: INK }}>Avatar set</h2>
      <div className="flex gap-5 mt-3 items-end">
        {avatars.map(t => (
          <div key={t.label} className="w-[90px]">
            <img src={ART + t.src} alt={t.label} className="w-[90px] h-[90px] rounded-full object-cover shadow-[0_1px_8px_rgba(26,26,26,0.08)]" />
            <Caption>{t.label}</Caption>
          </div>
        ))}
        <div className="ml-4">
          <div className="flex gap-2">
            {avatars.map(t => <img key={t.label} src={ART + t.src} alt="" className="w-10 h-10 rounded-full object-cover" />)}
          </div>
          <Caption>@40px</Caption>
        </div>
      </div>
    </div>
  );
}
