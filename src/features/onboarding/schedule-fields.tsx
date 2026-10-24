"use client";

import { Building2, Clock, House, Shuffle, Timer, Trees, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ChoiceCard } from "@/components/ui/choice";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { checkTrainingDays, suggestTrainingDays, TRAINING_DAYS_MESSAGES, type DaysPerWeek, type IsoWeekday, type SessionMinutes, type TrainingEnvironment } from "@/domain";
import { ENVIRONMENT_OPTIONS, FREQUENCY_OPTIONS, SESSION_OPTIONS } from "./answers";

const WEEKDAYS: { day: IsoWeekday; short: string; long: string }[] = [
  { day: 1, short: "M", long: "Monday" },
  { day: 2, short: "T", long: "Tuesday" },
  { day: 3, short: "W", long: "Wednesday" },
  { day: 4, short: "T", long: "Thursday" },
  { day: 5, short: "F", long: "Friday" },
  { day: 6, short: "S", long: "Saturday" },
  { day: 7, short: "S", long: "Sunday" },
];

const ENV_ICONS = { home: House, gym: Building2, park: Trees, mixed: Shuffle } as const;
const SESSION_ICONS = { 15: Zap, 25: Clock, 40: Timer } as const;

function todayWeekday(): IsoWeekday {
  const d = new Date().getDay();
  return (d === 0 ? 7 : d) as IsoWeekday;
}

interface ScheduleFieldsProps {
  initial: {
    daysPerWeek?: DaysPerWeek;
    trainingDays?: number[];
    sessionMinutes?: SessionMinutes;
    environment?: TrainingEnvironment;
  };
}

export function ScheduleFields({ initial }: ScheduleFieldsProps) {
  const [days, setDays] = useState<DaysPerWeek>(initial.daysPerWeek ?? 3);
  const [picked, setPicked] = useState<number[]>(initial.trainingDays ?? []);
  const [minutes, setMinutes] = useState<SessionMinutes>(initial.sessionMinutes ?? 25);
  const [timeZone, setTimeZone] = useState("Australia/Sydney");

  useEffect(() => {
    // Browser-only values: the user's time zone and today's weekday.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney");
    if (!initial.trainingDays?.length) setPicked(suggestTrainingDays(initial.daysPerWeek ?? 3, todayWeekday()));
  }, [initial.daysPerWeek, initial.trainingDays]);

  const chooseFrequency = (next: DaysPerWeek) => {
    setDays(next);
    setPicked(suggestTrainingDays(next, todayWeekday()));
  };
  const toggleDay = (day: number) => {
    setPicked((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b)));
  };
  const problem = picked.length ? checkTrainingDays(days, picked) : null;

  return (
    <>
      <input type="hidden" name="timeZone" value={timeZone} />
      <fieldset className="space-y-3">
        <legend className="flex w-full items-center justify-between pb-2">
          <span className="eyebrow text-text-secondary">Sessions per week</span>
        </legend>
        {FREQUENCY_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.days}
            type="radio"
            name="daysPerWeek"
            value={String(option.days)}
            title={option.title}
            body={option.body}
            checked={days === option.days}
            onChange={(checked) => checked && chooseFrequency(option.days)}
            badge={option.days === 3 ? <Pill tone="accent">Common starting point</Pill> : undefined}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-3 rounded-card bg-surface-secondary p-4" aria-describedby="days-help">
        <legend className="contents">
          <span className="flex items-center justify-between gap-2 pb-1">
            <span className="eyebrow text-text-secondary">Your training days</span>
            <span className="text-caption font-semibold text-accent-strong">
              {picked.length} of {days} picked
            </span>
          </span>
        </legend>
        <p id="days-help" className="text-caption text-text-secondary">
          {days === 4 ? "Two days in a row is fine. Avoid three." : "Leave at least one rest day between sessions."}
          {initial.trainingDays?.length ? "" : " We've suggested days starting today."}
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map(({ day, short, long }) => {
            const on = picked.includes(day);
            return (
              <label
                key={day}
                className={cn(
                  "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-small border text-caption font-bold transition-colors",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-primary",
                  on ? "border-accent-primary bg-success-container text-accent-primary" : "border-transparent bg-surface-elevated text-text-secondary",
                )}
              >
                <input type="checkbox" name="trainingDays" value={day} checked={on} onChange={() => toggleDay(day)} className="sr-only" />
                <span aria-hidden>{short}</span>
                <span className="sr-only">{long}</span>
                <span aria-hidden className={cn("text-[0.625rem] uppercase", on ? "text-accent-primary" : "text-state-disabled")}>
                  {on ? "Train" : "Rest"}
                </span>
              </label>
            );
          })}
        </div>
        {problem && (
          <p role="alert" className="text-body font-semibold text-state-error">
            {TRAINING_DAYS_MESSAGES[problem]}
          </p>
        )}
      </fieldset>

      <div className="flex items-center justify-between gap-3 rounded-card bg-surface-secondary p-4">
        <span className="font-display text-title font-bold text-accent-primary tabular-nums">{days * 12}</span>
        <p className="flex-1 text-body text-text-secondary">
          sessions over 12 weeks, {days} a week at about {minutes} minutes each.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="flex w-full items-center justify-between pb-2">
          <span className="eyebrow text-text-secondary">Session length</span>
          <span className="text-caption font-semibold text-accent-strong">Warm-up included</span>
        </legend>
        {SESSION_OPTIONS.map((option) => {
          const Icon = SESSION_ICONS[option.minutes];
          return (
            <ChoiceCard
              key={option.minutes}
              type="radio"
              name="sessionMinutes"
              value={String(option.minutes)}
              title={option.title}
              body={option.body}
              icon={<Icon className="size-5" />}
              checked={minutes === option.minutes}
              onChange={(checked) => checked && setMinutes(option.minutes)}
            />
          );
        })}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="flex w-full items-center justify-between pb-2">
          <span className="eyebrow text-text-secondary">Where will you train?</span>
        </legend>
        {ENVIRONMENT_OPTIONS.map((option) => {
          const Icon = ENV_ICONS[option.id];
          return (
            <ChoiceCard
              key={option.id}
              type="radio"
              name="environment"
              value={option.id}
              title={option.title}
              body={option.body}
              icon={<Icon className="size-5" />}
              defaultChecked={(initial.environment ?? "home") === option.id}
            />
          );
        })}
      </fieldset>
    </>
  );
}
