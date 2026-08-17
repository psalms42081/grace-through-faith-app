// Accent option board — 3 warm accent candidates applied to key UI elements
const OPTIONS = [
  { name: "Coral", hex: "#E8604C", note: "Friendly, energetic. Closest to the YouVersion warmth. Reads modern + youthful.", soft: "#FDE8E4" },
  { name: "Amber", hex: "#D9862A", note: "Heritage nod to the old gold — keeps brand continuity while feeling brighter.", soft: "#FBEEDC" },
  { name: "Terracotta", hex: "#C25B3F", note: "Earthy, grounded, slightly more reverent. Ages well, less trendy.", soft: "#F7E5DF" },
];

export function AccentOptions() {
  return (
    <div className="min-h-screen w-full font-['Inter'] p-8" style={{ background: "#FAF9F7" }}>
      <h1 className="font-['Lora'] text-[22px] font-semibold" style={{ color: "#1A1A1A" }}>Brand accent — pick one</h1>
      <p className="text-[13px] mt-1" style={{ color: "#75706A" }}>One warm accent for primary buttons, active tab, streak, progress. Everything else stays colour-forward via gradients + chips.</p>
      <div className="grid grid-cols-3 gap-5 mt-6">
        {OPTIONS.map(o => (
          <div key={o.name} className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(26,26,26,0.07)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full" style={{ background: o.hex }} />
              <div>
                <p className="text-[15px] font-bold" style={{ color: "#1A1A1A" }}>{o.name}</p>
                <p className="text-[11.5px] font-mono" style={{ color: "#75706A" }}>{o.hex}</p>
              </div>
            </div>
            <button className="w-full mt-4 py-2.5 rounded-full text-white text-[13.5px] font-semibold"
                    style={{ background: o.hex, boxShadow: `0 4px 14px ${o.hex}55` }}>
              Read Ephesians 2
            </button>
            <div className="mt-3 h-1.5 rounded-full" style={{ background: "#F0ECE6" }}>
              <div className="h-1.5 rounded-full" style={{ width: "60%", background: o.hex }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: o.soft, color: o.hex }}>Verse of the Day</span>
              <span className="text-[11px] font-semibold" style={{ color: o.hex }}>● Home</span>
            </div>
            <p className="text-[12px] leading-relaxed mt-4" style={{ color: "#75706A" }}>{o.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
