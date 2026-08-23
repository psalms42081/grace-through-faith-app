import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const previewSource = readFileSync(
  new URL("../components/touchpoints/TouchpointPreview.tsx", import.meta.url),
  "utf8"
);
const layoutSource = readFileSync(
  new URL("../app/_layout.tsx", import.meta.url),
  "utf8"
);
const productionTopicSource = readFileSync(
  new URL("../app/touchpoint-topic.tsx", import.meta.url),
  "utf8"
);
const productionStudySource = readFileSync(
  new URL("../app/touchpoint-study.tsx", import.meta.url),
  "utf8"
);

describe("pastoral touchpoint light previews", () => {
  it("registers hidden topic and generated-study preview routes", () => {
    assert.match(layoutSource, /name="touchpoint-topic-preview"/);
    assert.match(layoutSource, /name="touchpoint-study-preview"/);
    assert.match(previewSource, /touchpoint-study-preview\?topicId=/);
  });

  it("supports the three reference topics with quiet tints", () => {
    assert.match(previewSource, /grief:\s*\{\s*wash:/);
    assert.match(previewSource, /anxiety:\s*\{\s*wash:/);
    assert.match(previewSource, /addiction:\s*\{\s*wash:/);
  });

  it("pins both previews, including generated studies, to Path B light", () => {
    assert.match(previewSource, /backgroundColor:\s*HV2\.surface/);
    assert.match(previewSource, /testID="touchpoint-generated-study-container"/);
    assert.match(previewSource, /function TouchpointStudyPreview/);
    assert.doesNotMatch(previewSource, /useTheme/);
  });

  it("keeps the real API, translation, and canonical Scripture safeguards", () => {
    assert.match(previewSource, /\/api\/touchpoints\/\$\{topicId\}/);
    assert.match(previewSource, /\/bible-study/);
    assert.match(previewSource, /section\.resolved !== false/);
    assert.match(previewSource, /section\.translation \|\| studyTranslation/);
  });

  it("omits playful, grading, and progress-pressure furniture", () => {
    assert.doesNotMatch(previewSource, /name=["']sparkles["']/i);
    assert.doesNotMatch(
      previewSource,
      /\b(streak|score|graded?|assessment|competency|achievement|trophy)\b/i
    );
  });

  it("leaves the canonical production screens on their existing routes", () => {
    assert.match(productionTopicSource, /export default function TouchPointTopicScreen/);
    assert.match(productionStudySource, /export default function TouchPointStudyScreen/);
    assert.doesNotMatch(productionTopicSource, /TouchpointTopicPreview/);
    assert.doesNotMatch(productionStudySource, /TouchpointStudyPreview/);
  });
});