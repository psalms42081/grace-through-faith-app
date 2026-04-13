export interface EllenWhiteStep {
  id: string;
  order: number;
  title: string;
  text: string;
  spotlightTarget: string;
  videoUrl?: string;
  audioUrl?: string;
}

export const ONBOARDING_STEPS: EllenWhiteStep[] = [
  {
    id: "welcome-verse",
    order: 1,
    title: "Welcome",
    text: "A fresh word from the Lord every morning. Let this anchor your day.",
    spotlightTarget: "verse-of-day",
  },
  {
    id: "continue-study",
    order: 2,
    title: "Your Study",
    text: "Pick up right where you left off. Your journey continues here.",
    spotlightTarget: "continue-study",
  },
  {
    id: "study-tab",
    order: 3,
    title: "Study",
    text: "Lessons, prophecy, and deep dives into the Word. All here.",
    spotlightTarget: "tab-study",
  },
  {
    id: "connect-tab",
    order: 4,
    title: "Community",
    text: "Your church family is here. Find your congregation and connect.",
    spotlightTarget: "tab-connect",
  },
  {
    id: "profile-growth",
    order: 5,
    title: "Your Growth",
    text: "Track your spiritual journey. Every day of faithfulness counts.",
    spotlightTarget: "tab-profile",
  },
];

export const SABBATH_SCHOOL_GUIDE: EllenWhiteStep[] = [
  {
    id: "ss-welcome",
    order: 1,
    title: "Sabbath School",
    text: "Welcome to Sabbath School. Here you will find the current quarterly lesson, prepared by our church for believers around the world to study together.",
    spotlightTarget: "ss-lesson-card",
  },
  {
    id: "ss-discussion",
    order: 2,
    title: "Discussion",
    text: "Each lesson includes discussion questions designed for your small group or family worship. These are not mere academic exercises \u2014 they are invitations to apply the Word to your daily walk.",
    spotlightTarget: "ss-discussion-section",
  },
  {
    id: "ss-settings-hint",
    order: 3,
    title: "A Note",
    text: "You may dismiss me at any time, but should you ever wish my guidance again, you will find the option in your Settings. I am always here to help you understand.",
    spotlightTarget: "ss-content",
  },
];

export const STUDY_GUIDE_STEPS: EllenWhiteStep[] = [
  {
    id: "sg-welcome",
    order: 1,
    title: "Guided Study",
    text: "This is your Inductive Bible Study guide. Here you will learn to observe the text carefully, interpret its meaning, and apply its truths to your life \u2014 the method by which the Spirit teaches.",
    spotlightTarget: "study-guide-content",
  },
  {
    id: "sg-persona",
    order: 2,
    title: "Choose Your Guide",
    text: "You may choose your study companion. The Scholarly guide focuses on the original languages. The Pastoral guide speaks to your heart. And if you choose my name, I shall draw from the writings the Lord has given me to illuminate each passage.",
    spotlightTarget: "persona-selector",
  },
  {
    id: "sg-phases",
    order: 3,
    title: "Three Phases",
    text: "The study moves through three phases: Observe what the text says, Interpret what it means, and Apply how it transforms your life. Do not rush \u2014 let each phase do its work in your soul.",
    spotlightTarget: "phase-indicators",
  },
  {
    id: "sg-settings-hint",
    order: 4,
    title: "A Note",
    text: "You may dismiss me at any time, but should you ever wish my guidance again, you will find the option in your Settings. I am always here to help you understand.",
    spotlightTarget: "study-guide-content",
  },
];

export const FEATURE_GUIDES: Record<string, EllenWhiteStep[]> = {
  "sabbath-school": SABBATH_SCHOOL_GUIDE,
  "study-guide": STUDY_GUIDE_STEPS,
  heatmap: [
    {
      id: "heatmap-overview",
      order: 1,
      title: "Engagement Heatmap",
      text: "Welcome to your heatmap. Here you can see when your members are most active in their studies. The brighter the cell, the deeper the engagement. Use this to plan your outreach at the moments your flock is most receptive.",
      spotlightTarget: "heatmap-grid",
    },
  ],
  "leader-analytics": [
    {
      id: "analytics-overview",
      order: 1,
      title: "Member Analytics",
      text: "This is your shepherd\u2019s view. See how many souls are growing in the Word, which studies draw the most hearts, and where your pastoral attention may be most needed.",
      spotlightTarget: "analytics-overview",
    },
  ],
  "prophecy-timeline": [
    {
      id: "timeline-overview",
      order: 1,
      title: "Prophecy Timeline",
      text: "The great controversy between Christ and Satan is laid out before you here. Each point on this timeline connects Scripture to history, revealing God\u2019s hand through the ages.",
      spotlightTarget: "timeline-view",
    },
  ],
  "bible-reader": [
    {
      id: "reader-overview",
      order: 1,
      title: "Bible Reader",
      text: "Here you may read the sacred Word. Compare translations, highlight verses that speak to your soul, and listen as the Scriptures are read aloud to you.",
      spotlightTarget: "reader-view",
    },
  ],
};
