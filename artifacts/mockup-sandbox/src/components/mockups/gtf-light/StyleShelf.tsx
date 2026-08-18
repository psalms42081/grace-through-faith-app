// GTF Illustration Style Guide — first batch shelf test (Path B, Aug 2026)
// All assets generated per the master prompt. Squint test: tiles shown small + large.

const INK = "#1A1A1A";
const MUTED = "#75706A";

const tiles = [
  { src: "/__mockup/images/gtf-art/plan-prayer.png", label: "Prayer" },
  { src: "/__mockup/images/gtf-art/plan-youth.png", label: "Youth" },
  { src: "/__mockup/images/gtf-art/plan-new-believers.png", label: "New Believers" },
  { src: "/__mockup/images/gtf-art/plan-sabbath.png", label: "Sabbath" },
];
const icons = [
  { src: "/__mockup/images/gtf-art/rhythm-plan.png", label: "Today's Plan" },
  { src: "/__mockup/images/gtf-art/rhythm-ss.png", label: "Sabbath School" },
  { src: "/__mockup/images/gtf-art/rhythm-reflection.png", label: "Reflection" },
];
const covers = [
  { src: "/__mockup/images/gtf-art/cover-steps-to-christ.png", label: "Steps to Christ" },
  { src: "/__mockup/images/gtf-art/cover-desire-of-ages.png", label: "The Desire of Ages" },
];

function Caption({ children }: { children: string }) {
  return <p className="text-[12px] font-semibold mt-2 text-center" style={{ color: MUTED }}>{children}</p>;
}

export function StyleShelf() {
  return (
    <div className="min-h-screen w-full font-['Inter'] p-8" style={{ background: "#FAF9F7" }}>
      <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase" style={{ color: "#C24431" }}>Illustration Style Guide · First Batch</p>
      <h1 className="font-['Lora'] text-[26px] font-semibold mt-1" style={{ color: INK }}>Shelf Test — 9 assets, one illustrator?</h1>

      <h2 className="font-['Lora'] text-[18px] font-semibold mt-7" style={{ color: INK }}>Plan category tiles</h2>
      <div className="flex gap-5 mt-3">
        {tiles.map(t => (
          <div key={t.label} className="w-[150px]">
            <img src={t.src} alt={t.label} className="w-[150px] h-[150px] rounded-2xl object-cover shadow-[0_1px_8px_rgba(26,26,26,0.08)]" />
            <Caption>{t.label}</Caption>
          </div>
        ))}
        {/* squint test row */}
        <div className="ml-4">
          <div className="flex gap-2">
            {tiles.map(t => <img key={t.label} src={t.src} alt="" className="w-[60px] h-[60px] rounded-lg object-cover" />)}
          </div>
          <Caption>Squint test @60px</Caption>
        </div>
      </div>

      <h2 className="font-['Lora'] text-[18px] font-semibold mt-8" style={{ color: INK }}>Daily Rhythm icons (transparent)</h2>
      <div className="flex gap-5 mt-3 items-end">
        {icons.map(t => (
          <div key={t.label} className="w-[110px]">
            <div className="w-[110px] h-[110px] rounded-2xl bg-white shadow-[0_1px_8px_rgba(26,26,26,0.08)] flex items-center justify-center">
              <img src={t.src} alt={t.label} className="w-[74px] h-[74px] object-contain" />
            </div>
            <Caption>{t.label}</Caption>
          </div>
        ))}
        <div className="ml-4">
          <div className="flex gap-2">
            {icons.map(t => (
              <div key={t.label} className="w-11 h-11 rounded-xl bg-white shadow flex items-center justify-center">
                <img src={t.src} alt="" className="w-7 h-7 object-contain" />
              </div>
            ))}
          </div>
          <Caption>In-card size @44px</Caption>
        </div>
      </div>

      <h2 className="font-['Lora'] text-[18px] font-semibold mt-8" style={{ color: INK }}>Featured plan covers</h2>
      <div className="flex gap-5 mt-3">
        {covers.map(t => (
          <div key={t.label} className="w-[330px]">
            <img src={t.src} alt={t.label} className="w-[330px] h-[220px] rounded-2xl object-cover shadow-[0_1px_8px_rgba(26,26,26,0.08)]" />
            <Caption>{t.label}</Caption>
          </div>
        ))}
      </div>
    </div>
  );
}
