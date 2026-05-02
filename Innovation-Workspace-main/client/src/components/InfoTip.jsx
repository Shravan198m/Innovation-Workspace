import * as Tooltip from "@radix-ui/react-tooltip";

export default function InfoTip({ text, side = "top" }) {
  return (
    <Tooltip.Provider delayDuration={180}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200/75 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-300/80"
            aria-label="More information"
          >
            i
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={8}
            className="z-[80] max-w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-5 text-white shadow-[0_16px_32px_rgba(15,23,42,0.35)]"
          >
            {text}
            <Tooltip.Arrow className="fill-slate-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
