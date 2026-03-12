import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import ScreenHeader from "@/components/ScreenHeader";

interface ResourceDetail {
  id: string;
  title: string;
  slug: string;
  resourceType: string;
  category: string;
  tier: string;
  estimatedMinutes: number | null;
  description: string | null;
  contentJson: any;
  isBookmarked?: boolean;
  progressPercent?: number;
  isTeaser?: boolean;
  requiresPro?: boolean;
}

function SectionCard({
  title,
  icon,
  iconColor,
  children,
  theme,
  completed,
  onToggleComplete,
  isExpanded,
  onToggleExpand,
  stepLabel,
  previewText,
  isCurrent,
}: {
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  theme: any;
  completed?: boolean;
  onToggleComplete?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  stepLabel?: string;
  previewText?: string;
  isCurrent?: boolean;
}) {
  const expanded = isExpanded !== undefined ? isExpanded : true;
  return (
    <View style={[
      sStyles.card,
      {
        backgroundColor: theme.backgroundCard,
        borderColor: isCurrent ? theme.accent + "60" : completed ? "#22C55E30" : theme.border,
      },
      isCurrent && { borderWidth: 1.5 },
    ]}>
      <Pressable
        onPress={onToggleExpand}
        style={sStyles.cardHeaderRow}
      >
        <Ionicons name={icon as any} size={16} color={iconColor} />
        <Text style={[sStyles.cardTitle, { color: iconColor, fontFamily: "Inter_600SemiBold", flex: 1 }]}>
          {title}
        </Text>
        {completed && (
          <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={{ marginRight: 4 }} />
        )}
        {stepLabel && (
          <Text style={[sStyles.stepLabel, { color: theme.textMuted }]}>
            {stepLabel}
          </Text>
        )}
        {onToggleExpand && (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.textMuted}
          />
        )}
      </Pressable>
      {!expanded && previewText ? (
        <Text style={[sStyles.previewText, { color: theme.textMuted }]} numberOfLines={2}>
          {previewText}
        </Text>
      ) : null}
      {expanded && (
        <>
          {children}
          {onToggleComplete && !completed && (
            <Pressable
              onPress={onToggleComplete}
              style={({ pressed }) => [
                sStyles.completeBtn,
                { backgroundColor: theme.accent + "12", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.accent} />
              <Text style={[sStyles.completeBtnText, { color: theme.accent }]}>
                Complete & Continue
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function SabbathSchoolContent({ content, theme, completedSections, toggleSection, isSectionExpanded, toggleExpand, getSectionStepLabel, firstIncompleteKey }: {
  content: any;
  theme: any;
  completedSections: Set<string>;
  toggleSection: (key: string) => void;
  isSectionExpanded: (key: string) => boolean;
  toggleExpand: (key: string) => void;
  getSectionStepLabel: (key: string) => string | undefined;
  firstIncompleteKey: string | undefined;
}) {
  if (!content) return null;

  return (
    <>
      {content.overview && (
        <SectionCard
          title="Overview"
          icon="book-outline"
          iconColor="#C9933A"
          theme={theme}
          completed={completedSections.has("overview")}
          onToggleComplete={() => toggleSection("overview")}
          isExpanded={isSectionExpanded("overview")}
          onToggleExpand={() => toggleExpand("overview")}
          stepLabel={getSectionStepLabel("overview")}
          previewText={content.overview}
          isCurrent={firstIncompleteKey === "overview"}
        >
          <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {content.overview}
          </Text>
        </SectionCard>
      )}

      {content.dailyStudyPrompts?.map((day: any, i: number) => {
        const key = `day-${i}`;
        return (
        <SectionCard
          key={key}
          title={`Day ${day.day || i + 1}${day.dayTitle ? ` - ${day.dayTitle}` : day.title ? ` - ${day.title}` : ""}`}
          icon="calendar-outline"
          iconColor="#1565C0"
          theme={theme}
          completed={completedSections.has(key)}
          onToggleComplete={() => toggleSection(key)}
          isExpanded={isSectionExpanded(key)}
          onToggleExpand={() => toggleExpand(key)}
          stepLabel={getSectionStepLabel(key)}
          previewText={day.focusText || day.reading || day.studyPrompt || day.prompt || ""}
          isCurrent={firstIncompleteKey === key}
        >
          {(day.focusText || day.reading) && (
            <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {day.focusText || day.reading}
            </Text>
          )}
          {(day.studyPrompt || day.prompt) && (
            <Text style={[sStyles.promptText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
              {day.studyPrompt || day.prompt}
            </Text>
          )}
          {day.keyInsight && (
            <Text style={[sStyles.promptText, { color: "#C9933A", fontFamily: "Lora_400Regular_Italic", marginTop: 8 }]}>
              {day.keyInsight}
            </Text>
          )}
        </SectionCard>
        );
      })}

      {content.discussionQuestions?.length > 0 && (
        <SectionCard
          title="Discussion Questions"
          icon="chatbubbles-outline"
          iconColor="#8B5CF6"
          theme={theme}
          completed={completedSections.has("discussion")}
          onToggleComplete={() => toggleSection("discussion")}
          isExpanded={isSectionExpanded("discussion")}
          onToggleExpand={() => toggleExpand("discussion")}
          stepLabel={getSectionStepLabel("discussion")}
          previewText={content.discussionQuestions?.[0]?.question || content.discussionQuestions?.[0] || ""}
          isCurrent={firstIncompleteKey === "discussion"}
        >
          {content.discussionQuestions.map((q: any, i: number) => {
            const questionText = typeof q === "string" ? q : q.question || "";
            const contextText = typeof q === "object" && q.context ? q.context : null;
            return (
              <View key={i} style={sStyles.listItem}>
                <Text style={[sStyles.listNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {i + 1}.
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {questionText}
                  </Text>
                  {contextText && (
                    <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Lora_400Regular_Italic", fontSize: 13, marginTop: 4, opacity: 0.7 }]}>
                      {contextText}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </SectionCard>
      )}

      {(content.memoryVerseMeditation || content.memoryVerseGuide) && (() => {
        const mv = content.memoryVerseGuide || content.memoryVerseMeditation;
        return (
          <SectionCard
            title="Memory Verse Meditation"
            icon="sparkles-outline"
            iconColor="#E65100"
            theme={theme}
            completed={completedSections.has("memoryVerse")}
            onToggleComplete={() => toggleSection("memoryVerse")}
            isExpanded={isSectionExpanded("memoryVerse")}
            onToggleExpand={() => toggleExpand("memoryVerse")}
            stepLabel={getSectionStepLabel("memoryVerse")}
            previewText={typeof mv === "string" ? mv : mv?.verse ? `"${mv.verse}" — ${mv.reference}` : ""}
            isCurrent={firstIncompleteKey === "memoryVerse"}
          >
            {typeof mv === "string" ? (
              <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Lora_400Regular" }]}>
                {mv}
              </Text>
            ) : (
              <>
                {mv.reference && mv.verse && (
                  <Text style={[sStyles.promptText, { color: "#C9933A", fontFamily: "Lora_600SemiBold", marginBottom: 8 }]}>
                    "{mv.verse}" — {mv.reference}
                  </Text>
                )}
                {mv.meditationSteps?.map((step: string, i: number) => (
                  <View key={i} style={sStyles.listItem}>
                    <Text style={[sStyles.listNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {i + 1}.
                    </Text>
                    <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", flex: 1 }]}>
                      {step}
                    </Text>
                  </View>
                ))}
                {mv.applicationPrompt && (
                  <Text style={[sStyles.promptText, { color: theme.text, fontFamily: "Lora_400Regular", marginTop: 8 }]}>
                    {mv.applicationPrompt}
                  </Text>
                )}
              </>
            )}
          </SectionCard>
        );
      })()}

      {content.familyWorshipAdaptation && (
        <SectionCard
          title="Family Worship Adaptation"
          icon="people-outline"
          iconColor="#2E7D32"
          theme={theme}
          completed={completedSections.has("familyWorship")}
          onToggleComplete={() => toggleSection("familyWorship")}
          isExpanded={isSectionExpanded("familyWorship")}
          onToggleExpand={() => toggleExpand("familyWorship")}
          stepLabel={getSectionStepLabel("familyWorship")}
          previewText={typeof content.familyWorshipAdaptation === "string" ? content.familyWorshipAdaptation : content.familyWorshipAdaptation?.kidsVersion || ""}
          isCurrent={firstIncompleteKey === "familyWorship"}
        >
          {typeof content.familyWorshipAdaptation === "string" ? (
            <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {content.familyWorshipAdaptation}
            </Text>
          ) : (
            <>
              {content.familyWorshipAdaptation.kidsVersion && (
                <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", marginBottom: 8 }]}>
                  {content.familyWorshipAdaptation.kidsVersion}
                </Text>
              )}
              {content.familyWorshipAdaptation.activityIdea && (
                <View style={sStyles.listItem}>
                  <Ionicons name="bulb-outline" size={14} color="#C9933A" />
                  <Text style={[sStyles.bodyText, { color: theme.text, fontFamily: "Inter_500Medium", flex: 1, marginLeft: 6 }]}>
                    {content.familyWorshipAdaptation.activityIdea}
                  </Text>
                </View>
              )}
              {content.familyWorshipAdaptation.discussionForKids?.map((q: string, i: number) => (
                <View key={i} style={sStyles.listItem}>
                  <Text style={[sStyles.listNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    {i + 1}.
                  </Text>
                  <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", flex: 1 }]}>
                    {q}
                  </Text>
                </View>
              ))}
              {content.familyWorshipAdaptation.prayer && (
                <Text style={[sStyles.promptText, { color: theme.text, fontFamily: "Lora_400Regular_Italic", marginTop: 8 }]}>
                  {content.familyWorshipAdaptation.prayer}
                </Text>
              )}
            </>
          )}
        </SectionCard>
      )}

      {content.egwConnections?.length > 0 && (
        <SectionCard
          title="Ellen G. White Connections"
          icon="library-outline"
          iconColor="#6A1B9A"
          theme={theme}
          completed={completedSections.has("egw")}
          onToggleComplete={() => toggleSection("egw")}
          isExpanded={isSectionExpanded("egw")}
          onToggleExpand={() => toggleExpand("egw")}
          stepLabel={getSectionStepLabel("egw")}
          previewText={Array.isArray(content.egwConnections) && content.egwConnections[0]?.topic ? content.egwConnections[0].topic : ""}
          isCurrent={firstIncompleteKey === "egw"}
        >
          {Array.isArray(content.egwConnections) ? (
            content.egwConnections.map((conn: any, i: number) => (
              <View key={i} style={{ marginBottom: i < content.egwConnections.length - 1 ? 12 : 0 }}>
                <Text style={[sStyles.bodyText, { color: "#C9933A", fontFamily: "Inter_600SemiBold" }]}>
                  {conn.topic}
                </Text>
                <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }]}>
                  {conn.bookReference}
                </Text>
                <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Lora_400Regular", marginTop: 4 }]}>
                  {conn.relevance}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {String(content.egwConnections)}
            </Text>
          )}
        </SectionCard>
      )}
    </>
  );
}

function TopicalStudyContent({ content, theme, completedSections, toggleSection, isSectionExpanded, toggleExpand, getSectionStepLabel, firstIncompleteKey }: {
  content: any;
  theme: any;
  completedSections: Set<string>;
  toggleSection: (key: string) => void;
  isSectionExpanded: (key: string) => boolean;
  toggleExpand: (key: string) => void;
  getSectionStepLabel: (key: string) => string | undefined;
  firstIncompleteKey: string | undefined;
}) {
  if (!content) return null;

  return (
    <>
      {content.introduction && (
        <SectionCard
          title="Introduction"
          icon="document-text-outline"
          iconColor="#C9933A"
          theme={theme}
          completed={completedSections.has("intro")}
          onToggleComplete={() => toggleSection("intro")}
          isExpanded={isSectionExpanded("intro")}
          onToggleExpand={() => toggleExpand("intro")}
          stepLabel={getSectionStepLabel("intro")}
          previewText={content.introduction}
          isCurrent={firstIncompleteKey === "intro"}
        >
          <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {content.introduction}
          </Text>
        </SectionCard>
      )}

      {content.scriptureFoundation && (
        <SectionCard
          title="Scripture Foundation"
          icon="book-outline"
          iconColor="#1565C0"
          theme={theme}
          completed={completedSections.has("scripture")}
          onToggleComplete={() => toggleSection("scripture")}
          isExpanded={isSectionExpanded("scripture")}
          onToggleExpand={() => toggleExpand("scripture")}
          stepLabel={getSectionStepLabel("scripture")}
          previewText={typeof content.scriptureFoundation === "string" ? content.scriptureFoundation : Array.isArray(content.scriptureFoundation) && content.scriptureFoundation[0]?.reference || ""}
          isCurrent={firstIncompleteKey === "scripture"}
        >
          {typeof content.scriptureFoundation === "string" ? (
            <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Lora_400Regular" }]}>
              {content.scriptureFoundation}
            </Text>
          ) : Array.isArray(content.scriptureFoundation) ? (
            content.scriptureFoundation.map((s: any, i: number) => (
              <View key={i} style={{ marginBottom: i < content.scriptureFoundation.length - 1 ? 16 : 0 }}>
                <Text style={[sStyles.bodyText, { color: "#C9933A", fontFamily: "Lora_600SemiBold" }]}>
                  {s.reference}
                </Text>
                {s.text && (
                  <Text style={[sStyles.promptText, { color: theme.text, fontFamily: "Lora_400Regular_Italic", marginTop: 4 }]}>
                    "{s.text}"
                  </Text>
                )}
                {s.explanation && (
                  <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", marginTop: 6 }]}>
                    {s.explanation}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Lora_400Regular" }]}>
              {String(content.scriptureFoundation)}
            </Text>
          )}
        </SectionCard>
      )}

      {content.historicalContext && (
        <SectionCard
          title="Historical Context"
          icon="time-outline"
          iconColor="#E65100"
          theme={theme}
          completed={completedSections.has("history")}
          onToggleComplete={() => toggleSection("history")}
          isExpanded={isSectionExpanded("history")}
          onToggleExpand={() => toggleExpand("history")}
          stepLabel={getSectionStepLabel("history")}
          previewText={content.historicalContext}
          isCurrent={firstIncompleteKey === "history"}
        >
          <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {content.historicalContext}
          </Text>
        </SectionCard>
      )}

      {content.applicationQuestions?.length > 0 && (
        <SectionCard
          title="Application Questions"
          icon="help-circle-outline"
          iconColor="#8B5CF6"
          theme={theme}
          completed={completedSections.has("application")}
          onToggleComplete={() => toggleSection("application")}
          isExpanded={isSectionExpanded("application")}
          onToggleExpand={() => toggleExpand("application")}
          stepLabel={getSectionStepLabel("application")}
          previewText={typeof content.applicationQuestions?.[0] === "string" ? content.applicationQuestions[0] : content.applicationQuestions?.[0]?.question || ""}
          isCurrent={firstIncompleteKey === "application"}
        >
          {content.applicationQuestions.map((q: any, i: number) => {
            const questionText = typeof q === "string" ? q : q.question || "";
            const guidance = typeof q === "object" && q.guidanceNote ? q.guidanceNote : null;
            return (
              <View key={i} style={sStyles.listItem}>
                <Text style={[sStyles.listNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {i + 1}.
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {questionText}
                  </Text>
                  {guidance && (
                    <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Lora_400Regular_Italic", fontSize: 13, marginTop: 4, opacity: 0.7 }]}>
                      {guidance}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </SectionCard>
      )}

      {content.prayerPrompts?.length > 0 && (
        <SectionCard
          title="Prayer Prompts"
          icon="hand-left-outline"
          iconColor="#2E7D32"
          theme={theme}
          completed={completedSections.has("prayer")}
          onToggleComplete={() => toggleSection("prayer")}
          isExpanded={isSectionExpanded("prayer")}
          onToggleExpand={() => toggleExpand("prayer")}
          stepLabel={getSectionStepLabel("prayer")}
          previewText={content.prayerPrompts?.[0] || ""}
          isCurrent={firstIncompleteKey === "prayer"}
        >
          {content.prayerPrompts.map((p: string, i: number) => (
            <View key={i} style={sStyles.bulletItem}>
              <Ionicons name="ellipse" size={6} color={theme.textMuted} style={{ marginTop: 6 }} />
              <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", flex: 1 }]}>
                {p}
              </Text>
            </View>
          ))}
        </SectionCard>
      )}

      {content.sdaContext && (
        <SectionCard
          title="Adventist Perspective"
          icon="school-outline"
          iconColor="#7C3AED"
          theme={theme}
          completed={completedSections.has("sdaContext")}
          onToggleComplete={() => toggleSection("sdaContext")}
          isExpanded={isSectionExpanded("sdaContext")}
          onToggleExpand={() => toggleExpand("sdaContext")}
          stepLabel={getSectionStepLabel("sdaContext")}
          previewText={content.sdaContext}
          isCurrent={firstIncompleteKey === "sdaContext"}
        >
          <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {content.sdaContext}
          </Text>
        </SectionCard>
      )}

      {content.furtherStudy?.length > 0 && (
        <SectionCard
          title="Further Study"
          icon="reader-outline"
          iconColor="#1565C0"
          theme={theme}
          completed={completedSections.has("furtherStudy")}
          onToggleComplete={() => toggleSection("furtherStudy")}
          isExpanded={isSectionExpanded("furtherStudy")}
          onToggleExpand={() => toggleExpand("furtherStudy")}
          stepLabel={getSectionStepLabel("furtherStudy")}
          previewText={typeof content.furtherStudy?.[0] === "string" ? content.furtherStudy[0] : content.furtherStudy?.[0]?.resource || ""}
          isCurrent={firstIncompleteKey === "furtherStudy"}
        >
          {content.furtherStudy.map((item: any, i: number) => (
            <View key={i} style={{ marginBottom: i < content.furtherStudy.length - 1 ? 10 : 0 }}>
              <Text style={[sStyles.bodyText, { color: "#C9933A", fontFamily: "Inter_600SemiBold" }]}>
                {typeof item === "string" ? item : item.resource}
              </Text>
              {typeof item === "object" && item.description && (
                <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }]}>
                  {item.description}
                </Text>
              )}
            </View>
          ))}
        </SectionCard>
      )}
    </>
  );
}

function FamilyWorshipContent({ content, theme, completedSections, toggleSection, isSectionExpanded, toggleExpand, getSectionStepLabel, firstIncompleteKey }: {
  content: any;
  theme: any;
  completedSections: Set<string>;
  toggleSection: (key: string) => void;
  isSectionExpanded: (key: string) => boolean;
  toggleExpand: (key: string) => void;
  getSectionStepLabel: (key: string) => string | undefined;
  firstIncompleteKey: string | undefined;
}) {
  if (!content) return null;
  const days = content.days || [];

  return (
    <>
      {content.introduction && (
        <SectionCard
          title={content.theme ? `Theme: ${content.theme}` : "Introduction"}
          icon="document-text-outline"
          iconColor="#C9933A"
          theme={theme}
          completed={completedSections.has("fw-intro")}
          onToggleComplete={() => toggleSection("fw-intro")}
          isExpanded={isSectionExpanded("fw-intro")}
          onToggleExpand={() => toggleExpand("fw-intro")}
          stepLabel={getSectionStepLabel("fw-intro")}
          previewText={content.introduction}
          isCurrent={firstIncompleteKey === "fw-intro"}
        >
          <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {content.introduction}
          </Text>
        </SectionCard>
      )}

      {days.map((day: any, i: number) => {
        const key = `fw-${i}`;
        return (
        <SectionCard
          key={key}
          title={day.title || `Day ${i + 1}`}
          icon="sunny-outline"
          iconColor="#E65100"
          theme={theme}
          completed={completedSections.has(key)}
          onToggleComplete={() => toggleSection(key)}
          isExpanded={isSectionExpanded(key)}
          onToggleExpand={() => toggleExpand(key)}
          stepLabel={getSectionStepLabel(key)}
          previewText={typeof day.reading === "string" ? day.reading : day.reading?.reference || day.activity?.description || ""}
          isCurrent={firstIncompleteKey === key}
        >
          {day.reading && (
            <View style={sStyles.subSection}>
              <Text style={[sStyles.subLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Reading
              </Text>
              {typeof day.reading === "string" ? (
                <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {day.reading}
                </Text>
              ) : (
                <>
                  <Text style={[sStyles.bodyText, { color: "#C9933A", fontFamily: "Lora_600SemiBold" }]}>
                    {day.reading.reference}
                  </Text>
                  {day.reading.summary && (
                    <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", marginTop: 4 }]}>
                      {day.reading.summary}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
          {day.activity && (
            <View style={sStyles.subSection}>
              <Text style={[sStyles.subLabel, { color: "#2E7D32", fontFamily: "Inter_600SemiBold" }]}>
                Activity
              </Text>
              {typeof day.activity === "string" ? (
                <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {day.activity}
                </Text>
              ) : (
                <>
                  <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {day.activity.description}
                  </Text>
                  {day.activity.materials?.length > 0 && (
                    <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, opacity: 0.7 }]}>
                      Materials: {day.activity.materials.join(", ")}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
          {day.questions && (() => {
            let qList: string[] = [];
            if (Array.isArray(day.questions)) {
              qList = day.questions.map((q: any) => typeof q === "string" ? q : String(q));
            } else if (typeof day.questions === "object") {
              const collect = (v: any) => {
                if (Array.isArray(v)) return v.map((q: any) => typeof q === "string" ? q : String(q));
                if (typeof v === "string") return [v];
                return [];
              };
              qList = [...collect(day.questions.children), ...collect(day.questions.teen), ...collect(day.questions.adult)];
            }
            return qList.length > 0 ? (
              <View style={sStyles.subSection}>
                <Text style={[sStyles.subLabel, { color: "#8B5CF6", fontFamily: "Inter_600SemiBold" }]}>
                  Discussion
                </Text>
                {qList.map((q: string, qi: number) => (
                  <View key={qi} style={sStyles.listItem}>
                    <Text style={[sStyles.listNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {qi + 1}.
                    </Text>
                    <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular", flex: 1 }]}>
                      {q}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null;
          })()}
          {day.songSuggestion && (
            <View style={sStyles.subSection}>
              <Text style={[sStyles.subLabel, { color: "#1565C0", fontFamily: "Inter_600SemiBold" }]}>
                Song Suggestion
              </Text>
              <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {typeof day.songSuggestion === "string"
                  ? day.songSuggestion
                  : `${day.songSuggestion.title}${day.songSuggestion.hymnalNumber ? ` (Hymnal #${day.songSuggestion.hymnalNumber})` : ""}`}
              </Text>
            </View>
          )}
          {day.prayerFocus && (
            <View style={sStyles.subSection}>
              <Text style={[sStyles.subLabel, { color: "#6A1B9A", fontFamily: "Inter_600SemiBold" }]}>
                Prayer Focus
              </Text>
              <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {day.prayerFocus}
              </Text>
            </View>
          )}
        </SectionCard>
        );
      })}

      {content.closingThought && (
        <SectionCard
          title="Closing Thought"
          icon="sparkles-outline"
          iconColor="#6A1B9A"
          theme={theme}
          completed={completedSections.has("fw-closing")}
          onToggleComplete={() => toggleSection("fw-closing")}
          isExpanded={isSectionExpanded("fw-closing")}
          onToggleExpand={() => toggleExpand("fw-closing")}
          stepLabel={getSectionStepLabel("fw-closing")}
          previewText={content.closingThought}
          isCurrent={firstIncompleteKey === "fw-closing"}
        >
          <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Lora_400Regular" }]}>
            {content.closingThought}
          </Text>
        </SectionCard>
      )}
    </>
  );
}

function GenericContent({ content, theme, completedSections, toggleSection, isSectionExpanded, toggleExpand, getSectionStepLabel, firstIncompleteKey }: {
  content: any;
  theme: any;
  completedSections: Set<string>;
  toggleSection: (key: string) => void;
  isSectionExpanded: (key: string) => boolean;
  toggleExpand: (key: string) => void;
  getSectionStepLabel: (key: string) => string | undefined;
  firstIncompleteKey: string | undefined;
}) {
  if (!content || typeof content !== "object") return null;

  const entries = Object.entries(content).filter(
    ([, v]) => v && typeof v === "string"
  );

  return (
    <>
      {entries.map(([key, value], i) => (
        <SectionCard
          key={key}
          title={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
          icon="document-text-outline"
          iconColor="#C9933A"
          theme={theme}
          completed={completedSections.has(key)}
          onToggleComplete={() => toggleSection(key)}
          isExpanded={isSectionExpanded(key)}
          onToggleExpand={() => toggleExpand(key)}
          stepLabel={getSectionStepLabel(key)}
          previewText={value as string}
          isCurrent={firstIncompleteKey === key}
        >
          <Text style={[sStyles.bodyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {value as string}
          </Text>
        </SectionCard>
      ))}
    </>
  );
}

function getSectionKeys(resource: ResourceDetail | undefined | null): string[] {
  if (!resource?.contentJson) return [];
  const c = resource.contentJson;
  const keys: string[] = [];

  if (resource.resourceType === "sabbath-school-companion") {
    if (c.overview) keys.push("overview");
    if (c.dailyStudyPrompts) c.dailyStudyPrompts.forEach((_: any, i: number) => keys.push(`day-${i}`));
    if (c.discussionQuestions?.length) keys.push("discussion");
    if (c.memoryVerseMeditation || c.memoryVerseGuide) keys.push("memoryVerse");
    if (c.familyWorshipAdaptation) keys.push("familyWorship");
    if (c.egwConnections?.length) keys.push("egw");
  } else if (resource.resourceType === "topical-study") {
    if (c.introduction) keys.push("intro");
    if (c.scriptureFoundation) keys.push("scripture");
    if (c.historicalContext) keys.push("history");
    if (c.applicationQuestions?.length) keys.push("application");
    if (c.prayerPrompts?.length) keys.push("prayer");
    if (c.sdaContext) keys.push("sdaContext");
    if (c.furtherStudy?.length) keys.push("furtherStudy");
  } else if (resource.resourceType === "family-worship") {
    if (c.introduction) keys.push("fw-intro");
    if (c.days) c.days.forEach((_: any, i: number) => keys.push(`fw-${i}`));
    if (c.closingThought) keys.push("fw-closing");
  } else {
    Object.entries(c).filter(([, v]) => v && typeof v === "string").forEach(([key]) => keys.push(key));
  }
  return keys;
}

export default function ResourceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: resource, isLoading } = useQuery<ResourceDetail>({
    queryKey: [`/api/resources/${slug}`],
    enabled: !!slug,
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!resource) return;
      await apiRequest("POST", `/api/resources/${resource.id}/bookmark`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/resources/${slug}`] });
      qc.invalidateQueries({ queryKey: ["/api/resources/bookmarks"] });
    },
  });

  const progressMutation = useMutation({
    mutationFn: async (data: { progressPercent: number; completed: boolean }) => {
      if (!resource) return;
      await apiRequest("POST", `/api/resources/${resource.id}/progress`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/resources/${slug}`] });
    },
  });

  const sectionKeys = React.useMemo(() => getSectionKeys(resource), [resource]);
  const firstIncompleteKey = sectionKeys.find((k) => !completedSections.has(k));

  const isSectionExpanded = useCallback((key: string) => {
    if (expandedOverrides[key] !== undefined) return expandedOverrides[key];
    return key === firstIncompleteKey || (firstIncompleteKey === undefined && key === sectionKeys[sectionKeys.length - 1]);
  }, [expandedOverrides, firstIncompleteKey, sectionKeys]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedOverrides((prev) => ({ ...prev, [key]: !isSectionExpanded(key) }));
  }, [isSectionExpanded]);

  const getSectionStepLabel = useCallback((key: string) => {
    const idx = sectionKeys.indexOf(key);
    if (idx < 0) return undefined;
    return `${idx + 1}/${sectionKeys.length}`;
  }, [sectionKeys]);

  const toggleSection = useCallback(
    (key: string) => {
      setCompletedSections((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        const totalSections = getTotalSections(resource);
        if (totalSections > 0) {
          const pct = Math.round((next.size / totalSections) * 100);
          progressMutation.mutate({
            progressPercent: pct,
            completed: pct >= 100,
          });
        }

        return next;
      });
      setExpandedOverrides((prev) => ({ ...prev, [key]: false }));
    },
    [resource]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Resource" testID="resource-detail-header" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9933A" />
        </View>
      </View>
    );
  }

  if (!resource) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Resource" testID="resource-detail-header" />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Resource not found.
          </Text>
        </View>
      </View>
    );
  }

  const content = resource.contentJson;
  const bookmarkIcon = resource.isBookmarked ? "bookmark" : "bookmark-outline";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={resource.title}
        testID="resource-detail-header"
        rightAction={
          <Pressable
            onPress={() => bookmarkMutation.mutate()}
            hitSlop={12}
            disabled={bookmarkMutation.isPending}
            testID="resource-bookmark-btn"
          >
            <Ionicons
              name={bookmarkIcon as any}
              size={24}
              color={resource.isBookmarked ? "#C9933A" : theme.text}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>
            {resource.title}
          </Text>
          {resource.description && (
            <Text style={[styles.heroDesc, { fontFamily: "Inter_400Regular" }]}>
              {resource.description}
            </Text>
          )}
          <View style={styles.heroMeta}>
            {resource.estimatedMinutes && (
              <View style={styles.heroMetaItem}>
                <Ionicons name="time-outline" size={14} color="rgba(237,229,213,0.65)" />
                <Text style={[styles.heroMetaText, { fontFamily: "Inter_400Regular" }]}>
                  {resource.estimatedMinutes} min
                </Text>
              </View>
            )}
          </View>
        </View>

        {completedSections.size > 0 && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: "rgba(201,147,58,0.15)" }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: "#C9933A",
                    width: `${Math.round((completedSections.size / Math.max(getTotalSections(resource), 1)) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {completedSections.size} of {getTotalSections(resource)} sections complete
            </Text>
          </View>
        )}

        {resource.resourceType === "sabbath-school-companion" && (
          <SabbathSchoolContent
            content={content}
            theme={theme}
            completedSections={completedSections}
            toggleSection={toggleSection}
            isSectionExpanded={isSectionExpanded}
            toggleExpand={toggleExpand}
            getSectionStepLabel={getSectionStepLabel}
            firstIncompleteKey={firstIncompleteKey}
          />
        )}

        {resource.resourceType === "topical-study" && (
          <TopicalStudyContent
            content={content}
            theme={theme}
            completedSections={completedSections}
            toggleSection={toggleSection}
            isSectionExpanded={isSectionExpanded}
            toggleExpand={toggleExpand}
            getSectionStepLabel={getSectionStepLabel}
            firstIncompleteKey={firstIncompleteKey}
          />
        )}

        {resource.resourceType === "family-worship" && (
          <FamilyWorshipContent
            content={content}
            theme={theme}
            completedSections={completedSections}
            toggleSection={toggleSection}
            isSectionExpanded={isSectionExpanded}
            toggleExpand={toggleExpand}
            getSectionStepLabel={getSectionStepLabel}
            firstIncompleteKey={firstIncompleteKey}
          />
        )}

        {!["sabbath-school-companion", "topical-study", "family-worship"].includes(resource.resourceType) && (
          <GenericContent
            content={content}
            theme={theme}
            completedSections={completedSections}
            toggleSection={toggleSection}
            isSectionExpanded={isSectionExpanded}
            toggleExpand={toggleExpand}
            getSectionStepLabel={getSectionStepLabel}
            firstIncompleteKey={firstIncompleteKey}
          />
        )}
      </ScrollView>
    </View>
  );
}

function getTotalSections(resource: ResourceDetail | undefined | null): number {
  if (!resource?.contentJson) return 1;
  const c = resource.contentJson;

  if (resource.resourceType === "sabbath-school-companion") {
    let count = 0;
    if (c.overview) count++;
    if (c.dailyStudyPrompts) count += c.dailyStudyPrompts.length;
    if (c.discussionQuestions?.length) count++;
    if (c.memoryVerseMeditation || c.memoryVerseGuide) count++;
    if (c.familyWorshipAdaptation) count++;
    if (c.egwConnections?.length) count++;
    return Math.max(count, 1);
  }

  if (resource.resourceType === "topical-study") {
    let count = 0;
    if (c.introduction) count++;
    if (c.scriptureFoundation) count++;
    if (c.historicalContext) count++;
    if (c.applicationQuestions?.length) count++;
    if (c.prayerPrompts?.length) count++;
    if (c.sdaContext) count++;
    if (c.furtherStudy?.length) count++;
    return Math.max(count, 1);
  }

  if (resource.resourceType === "family-worship") {
    let count = c.days?.length || 0;
    if (c.introduction) count++;
    if (c.closingThought) count++;
    return Math.max(count, 1);
  }

  const entries = Object.entries(c).filter(([, v]) => v && typeof v === "string");
  return Math.max(entries.length, 1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 14 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  heroCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  heroTitle: {
    color: "#EDE5D5",
    fontSize: 20,
    textAlign: "center",
    lineHeight: 28,
  },
  heroDesc: {
    color: "rgba(237,229,213,0.65)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  heroMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroMetaText: {
    color: "rgba(237,229,213,0.65)",
    fontSize: 12,
  },
  progressSection: { gap: 6 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
  },
});

const sStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginLeft: 4,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 6,
  },
  completeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  promptText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
  },
  listItem: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  listNum: {
    fontSize: 14,
    width: 20,
    textAlign: "right",
  },
  bulletItem: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  subSection: {
    gap: 4,
  },
  subLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
