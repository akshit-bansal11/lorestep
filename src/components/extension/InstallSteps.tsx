import { CODE_CLASS } from "@/constants/canon/ui";
import { REPO_URL } from "@/constants/site";
import type { InstallStepsProps } from "@/types/extension/install-steps";
import { cn } from "@/utils/cn";

const FIELD_LINK_CLASS = "font-semibold underline underline-offset-2";
const FIELD_CODE_CLASS = cn(CODE_CLASS, "text-[14px] text-field-ink");

export default function InstallSteps({ className }: InstallStepsProps) {
  return (
    <ol className={cn("m-0 grid max-w-prose list-decimal gap-4 pl-6 text-[17px]", className)}>
      <li>
        Download the repository, or clone it. The extension is the{" "}
        <a className={FIELD_LINK_CLASS} href={`${REPO_URL}/tree/main/extension`}>
          extension folder on GitHub
        </a>
        .
      </li>
      <li>
        In Chrome, open <code className={FIELD_CODE_CLASS}>chrome://extensions</code>.
      </li>
      <li>Turn on Developer mode.</li>
      <li>
        Choose <strong>Load unpacked</strong>.
      </li>
      <li>
        Pick the <code className={FIELD_CODE_CLASS}>extension/</code> folder.
      </li>
    </ol>
  );
}
