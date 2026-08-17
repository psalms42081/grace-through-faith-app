import React from "react";
import {
  Flame,
  Settings,
  BookOpen,
  Users,
  Feather,
  Play,
  ChevronRight,
  Home,
  Book,
  Map,
  Compass,
  User,
} from "lucide-react";

const T = {
  surface: "#FBF7EE",
  ink: "#1F1A12",
  inkSoft: "rgba(31,26,18,0.62)",
  inkFaint: "rgba(31,26,18,0.38)",
  gold: "#C9933A",
  goldSoft: "rgba(201,147,58,0.14)",
  teal: "#2A8C82",
  amber: "#C77A2B",
  violet: "#6E4FB8",
  line: "rgba(31,26,18,0.12)",
  card: "#FFFDF7",
};

const serif = { fontFamily: "'Lora', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

function SpineNode({
  color,
  icon,
  label,
  title,
  meta,
  action,
  last,
  done,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  meta: string;
  action?: string;
  last?: boolean;
  done?: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* rail */}
      <div className="flex flex-col items-center" style={{ width: 34 }}>
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 34,
            height: 34,
            background: done ? color : T.card,
            border: `1.5px solid ${color}`,
            color: done ? "#FFFDF7" : color,
          }}
        >
          {icon}
        </div>
        {!last && (
          <div
            className="flex-1"
            style={{ width: 2, background: `linear-gradient(${color}55, ${T.line})`, marginTop: 4, marginBottom: 4, minHeight: 26 }}
          />
        )}
      </div>
      {/* card */}
      <div className="flex-1 pb-5">
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{ background: T.card, border: `1px solid ${T.line}`, boxShadow: "0 1px 2px rgba(31,26,18,0.05)" }}
        >
          <div className="flex items-center justify-between">
            <span style={{ ...sans, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color }}>
              {label}
            </span>
            {done ? (
              <span style={{ ...sans, fontSize: 10.5, fontWeight: 600, color: T.inkFaint }}>Done ✓</span>
            ) : (
              <ChevronRight size={15} color={T.inkFaint} />
            )}
          </div>
          <div style={{ ...serif, fontSize: 16.5, fontWeight: 600, color: T.ink, marginTop: 3, lineHeight: 1.25 }}>
            {title}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span style={{ ...sans, fontSize: 12, color: T.inkSoft }}>{meta}</span>
            {action && (
              <span
                className="rounded-full px-3 py-1"
                style={{ ...sans, fontSize: 11.5, fontWeight: 700, background: T.gold, color: "#231A0C" }}
              >
                {action}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeRhythmSpine() {
  return (
    <div
      className="mx-auto flex flex-col overflow-hidden"
      style={{ ...sans, maxWidth: 450, height: "100dvh", background: T.surface, color: T.ink }}
    >
      {/* Sticky condensed header */}
      <header
        className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
        style={{ borderBottom: `1px solid ${T.line}`, background: T.surface }}
      >
        <div>
          <div style={{ ...serif, fontSize: 19, fontWeight: 600 }}>Good morning, Joe</div>
          <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 1 }}>Sabbath · April 19</div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1"
            style={{ background: T.goldSoft, color: T.gold, fontSize: 12, fontWeight: 700 }}
          >
            <Flame size={13} /> 7
          </span>
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 30, height: 30, border: `1px solid ${T.line}`, color: T.inkSoft }}
          >
            <Settings size={15} />
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-4">
        {/* Verse as a full-width typographic banner — spans the top, no card chrome */}
        <section className="pb-5" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2">
            <span style={{ width: 22, height: 2.5, background: T.gold, display: "inline-block" }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", color: T.inkSoft }}>
              VERSE OF THE DAY
            </span>
          </div>
          <p style={{ ...serif, fontSize: 23, lineHeight: 1.3, fontWeight: 500, marginTop: 10, marginBottom: 8 }}>
            Be still, and know that I am God.
          </p>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12.5, color: T.inkSoft }}>Psalm 46:10 · KJV</span>
            <span className="flex items-center gap-3">
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.gold }}>Read →</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkFaint }}>Share</span>
            </span>
          </div>
        </section>

        {/* The day's rhythm as a timeline spine */}
        <div className="flex items-baseline justify-between mt-5 mb-4">
          <h2 style={{ ...serif, fontSize: 17, fontWeight: 600 }}>Today's rhythm</h2>
          <span style={{ fontSize: 11.5, color: T.inkFaint, fontWeight: 600 }}>1 of 3 complete</span>
        </div>

        <SpineNode
          color={T.violet}
          icon={<BookOpen size={15} />}
          label="TODAY'S PLAN · MORNING"
          title="John: Light in the Dark"
          meta="Day 4 of 21 · 3 min"
          done
        />
        <SpineNode
          color={T.teal}
          icon={<Users size={15} />}
          label="SABBATH SCHOOL · MIDDAY"
          title="Sarah & Rachel — Lesson 3"
          meta="Living Faith · 18 min"
          action="Watch"
        />
        <SpineNode
          color={T.amber}
          icon={<Feather size={15} />}
          label="EGW DEVOTION · EVENING"
          title="Steps to Christ"
          meta="Ch. 4 — Confession · 6 min"
          last
        />

        {/* Explore by topic — horizontal rail, denser, pushed to the end */}
        <div className="flex items-baseline justify-between mt-2 mb-3">
          <h2 style={{ ...serif, fontSize: 17, fontWeight: 600 }}>Explore by topic</h2>
          <ChevronRight size={15} color={T.inkFaint} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {[
            { t: "Prophecy", c: T.violet },
            { t: "Sabbath", c: T.teal },
            { t: "Health", c: "#B3564C" },
            { t: "Relationships", c: "#3A6FA8" },
            { t: "End Times", c: T.amber },
          ].map((x) => (
            <span
              key={x.t}
              className="rounded-full px-3.5 py-1.5 shrink-0"
              style={{ fontSize: 12.5, fontWeight: 600, color: x.c, background: `${x.c}1A`, border: `1px solid ${x.c}33` }}
            >
              {x.t}
            </span>
          ))}
        </div>

        {/* Continue listening strip */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-3"
          style={{ background: T.card, border: `1px solid ${T.line}` }}
        >
          <span
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 34, height: 34, background: T.goldSoft, color: T.gold }}
          >
            <Play size={15} />
          </span>
          <div className="flex-1 min-w-0">
            <div style={{ ...serif, fontSize: 14.5, fontWeight: 600 }}>Continue: John 3 (audio)</div>
            <div style={{ fontSize: 11.5, color: T.inkSoft }}>12:40 remaining</div>
          </div>
          <ChevronRight size={16} color={T.inkFaint} />
        </div>
      </main>

      {/* Bottom nav */}
      <nav
        className="flex items-start justify-around px-2 pt-2 pb-4 shrink-0"
        style={{ borderTop: `1px solid ${T.line}`, background: T.card }}
      >
        {[
          { l: "Home", i: <Home size={19} />, active: true },
          { l: "Bible", i: <Book size={19} /> },
          { l: "Plans", i: <Map size={19} /> },
          { l: "Discover", i: <Compass size={19} /> },
          { l: "You", i: <User size={19} /> },
        ].map((t) => (
          <div key={t.l} className="flex flex-col items-center gap-0.5" style={{ width: 60 }}>
            <span style={{ color: t.active ? T.gold : T.inkSoft }}>{t.i}</span>
            <span style={{ fontSize: 10.5, fontWeight: t.active ? 700 : 500, color: t.active ? T.ink : T.inkSoft }}>
              {t.l}
            </span>
            {t.active && <span style={{ width: 18, height: 3, borderRadius: 2, background: T.gold }} />}
          </div>
        ))}
      </nav>
    </div>
  );
}
