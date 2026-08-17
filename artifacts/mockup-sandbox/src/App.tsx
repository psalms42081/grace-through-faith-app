import React, { Suspense, useMemo } from "react";

const modules = import.meta.glob("./components/mockups/*/*.tsx");

function resolve(pathname: string) {
  // strip vite base (/__mockup/) if present
  const cleaned = pathname.replace(/^\/__mockup/, "");
  const m = cleaned.match(/\/preview\/([^/]+)\/([^/]+)\/?$/);
  if (!m) return null;
  const key = `./components/mockups/${m[1]}/${m[2]}.tsx`;
  return modules[key] ? { key, name: m[2] } : null;
}

export default function App() {
  const match = useMemo(() => resolve(window.location.pathname), []);

  if (!match) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <h2>Mockup Sandbox</h2>
        <p>No component matched this route.</p>
        <ul>
          {Object.keys(modules).map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </div>
    );
  }

  const Comp = React.lazy(async () => {
    const mod: any = await modules[match.key]();
    return { default: mod.default ?? mod[match.name] };
  });

  return (
    <Suspense fallback={<div />}>
      <Comp />
    </Suspense>
  );
}
