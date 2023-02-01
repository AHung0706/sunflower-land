import { InventoryItemName } from "features/game/types/game";
import { assign, createMachine, Interpreter, State } from "xstate";

export interface SandPlotContext {
  id: number;
  discovered?: InventoryItemName | null;
  dugAt?: number;
}

export type SandPlotState = {
  value:
    | "loading"
    | "idle"
    | "digging"
    | "drilling"
    | "noShovel"
    | "treasureFound"
    | "treasureNotFound"
    | "finishing"
    | "acknowledged"
    | "dug";
  context: SandPlotContext;
};

type FinishDiggingEvent = {
  type: "FINISH_DIGGING";
  discovered: InventoryItemName | null;
  dugAt: number;
};

type SandPlotEvent =
  | FinishDiggingEvent
  | { type: "NO_SHOVEL" }
  | { type: "DIG" }
  | { type: "DRILL" }
  | { type: "ACKNOWLEDGE" };

export type MachineState = State<SandPlotContext, SandPlotEvent, SandPlotState>;

export type MachineInterpreter = Interpreter<
  SandPlotContext,
  any,
  SandPlotEvent,
  SandPlotState
>;

export const canDig = (dugAt?: number) => {
  if (!dugAt) return true;

  const today = new Date().getUTCDay();

  return new Date(dugAt).getUTCDay() !== today;
};

/**
 * Machine to handle sand plot (UI only)
 */
export const sandPlotMachine = createMachine<
  SandPlotContext,
  SandPlotEvent,
  SandPlotState
>({
  initial: "loading",
  states: {
    loading: {
      always: [
        {
          target: "dug",
          cond: (context) => !canDig(context.dugAt),
        },
        { target: "idle" },
      ],
    },
    idle: {
      on: {
        DIG: { target: "digging" },
        DRILL: { target: "drilling" },
        NO_SHOVEL: { target: "noShovel" },
      },
    },
    noShovel: {
      after: {
        1000: {
          target: "idle",
        },
      },
    },
    digging: {
      on: {
        FINISH_DIGGING: [
          {
            target: "treasureFound",
            cond: (_: SandPlotContext, event: FinishDiggingEvent) => {
              return !!event.discovered;
            },
            actions: assign<SandPlotContext, FinishDiggingEvent>({
              discovered: (_, event) => event.discovered,
              dugAt: (_, event) => event.dugAt,
            }),
          },
          {
            target: "treasureNotFound",
            actions: assign<SandPlotContext, FinishDiggingEvent>({
              discovered: (_, event) => event.discovered,
              dugAt: (_, event) => event.dugAt,
            }),
          },
        ],
      },
    },
    drilling: {
      on: {
        FINISH_DIGGING: [
          {
            target: "treasureFound",
            cond: (_: SandPlotContext, event: FinishDiggingEvent) => {
              return !!event.discovered;
            },
            actions: assign<SandPlotContext, FinishDiggingEvent>({
              discovered: (_, event) => event.discovered,
              dugAt: (_, event) => event.dugAt,
            }),
          },
          {
            target: "treasureNotFound",
            actions: assign<SandPlotContext, FinishDiggingEvent>({
              discovered: (_, event) => event.discovered,
              dugAt: (_, event) => event.dugAt,
            }),
          },
        ],
      },
    },
    treasureFound: {
      on: {
        ACKNOWLEDGE: { target: "finishing" },
      },
    },
    treasureNotFound: {
      on: {
        ACKNOWLEDGE: { target: "finishing" },
      },
    },
    finishing: {
      after: {
        150: { target: "dug" },
      },
    },
    dug: {
      after: {
        1000: [
          {
            target: "idle",
            cond: (context) => canDig(context.dugAt),
          },
          {
            target: "dug",
          },
        ],
      },
    },
  },
});