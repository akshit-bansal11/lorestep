"use client";

import OptionSelect from "@/components/canon/OptionSelect";
import { DEVICES } from "@/constants/canon/devices";
import { PLATFORM_FILTERS, STATUS_FILTER_OPTIONS } from "@/constants/canon/filters";
import { STOREFRONTS } from "@/constants/canon/storefronts";
import { TIER_OPTIONS } from "@/constants/canon/tiers";
import { CONTROL_CLASS } from "@/constants/canon/ui";
import type { FilterState } from "@/types/canon/table";
import { cn } from "@/utils/cn";

interface FilterControlsProps {
  filter: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}

export default function FilterControls({ filter, onChange }: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        aria-label="Search games"
        className={cn(CONTROL_CLASS, "w-40 placeholder:text-faint")}
        onChange={(event) => onChange({ query: event.target.value })}
        placeholder="Search"
        type="search"
        value={filter.query}
      />

      <OptionSelect
        className="w-30"
        label="Filter by status"
        onChange={(status) => onChange({ status })}
        options={STATUS_FILTER_OPTIONS}
        placeholder="Status"
        value={filter.status}
      />

      <OptionSelect
        className="w-28"
        label="Filter by skip tier"
        onChange={(tier) => onChange({ tier })}
        options={TIER_OPTIONS}
        placeholder="Skip?"
        value={filter.tier}
      />

      <OptionSelect
        className="w-30"
        label="Filter by platform"
        onChange={(platform) => onChange({ platform })}
        options={PLATFORM_FILTERS}
        placeholder="Runs on"
        value={filter.platform}
      />

      <OptionSelect
        className="w-30"
        label="Filter by your device"
        onChange={(device) => onChange({ device })}
        options={DEVICES}
        placeholder="Device"
        value={filter.device}
      />

      <OptionSelect
        className="w-34"
        label="Filter by your store"
        onChange={(storefront) => onChange({ storefront })}
        options={STOREFRONTS}
        placeholder="Store"
        value={filter.storefront}
      />
    </div>
  );
}
