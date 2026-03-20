"use client";

import { ContentCard } from "@/components/content-pipeline/ContentCard";

type RefinedTopic = {
  _id: string;
  platform: string;
  dayNumber: number;
  topicTitle: string;
  topicAngle: string;
};

type GeneratedItem = {
  _id: string;
  refinedTopicId: string;
  platform: string;
  dayNumber: number;
  contentType: string;
  content: string;
  imageUrl?: string;
  status: "draft" | "approved" | "exported" | "error";
};

type Props = {
  refinedTopics: RefinedTopic[];
  generatedContent: GeneratedItem[];
  platformFilter: string;
  dayFilter: number | "all";
  onApprove: (contentId: string) => void;
  onRegenerate: (topic: RefinedTopic) => void;
};

const days = [1, 2, 3, 4, 5, 6, 7];

export function ContentCalendar({
  refinedTopics,
  generatedContent,
  platformFilter,
  dayFilter,
  onApprove,
  onRegenerate,
}: Props) {
  const topicById = new Map(refinedTopics.map((topic) => [topic._id, topic]));

  const visibleItems = generatedContent.filter((item) => {
    if (platformFilter !== "all" && item.platform !== platformFilter) return false;
    if (dayFilter !== "all" && item.dayNumber !== dayFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {days
        .filter((day) => dayFilter === "all" || dayFilter === day)
        .map((day) => {
          const dayItems = visibleItems.filter((item) => item.dayNumber === day);
          return (
            <section key={day} className="space-y-3">
              <h3 className="text-lg font-semibold">Day {day}</h3>
              {dayItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No generated content for this day and filter combination.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {dayItems.map((item) => {
                    const topic = topicById.get(item.refinedTopicId);
                    if (!topic) return null;
                    return (
                      <ContentCard
                        key={item._id}
                        platform={item.platform}
                        dayNumber={item.dayNumber}
                        topicTitle={topic.topicTitle}
                        topicAngle={topic.topicAngle}
                        contentType={item.contentType}
                        content={item.content}
                        imageUrl={item.imageUrl}
                        status={item.status}
                        onApprove={() => onApprove(item._id)}
                        onRegenerate={() => onRegenerate(topic)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
    </div>
  );
}
