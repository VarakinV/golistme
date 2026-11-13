"use client";

import type { Permission } from "@prisma/client";
import { PERMISSION_LABELS, PERMISSION_ORDER } from "@/lib/config/credits";

export function PermissionCheckboxes({
  value,
  onChange,
  disabled,
}: {
  value: Permission[];
  onChange: (next: Permission[]) => void;
  disabled?: boolean;
}) {
  function toggle(permission: Permission, checked: boolean) {
    if (checked) {
      onChange([...new Set([...value, permission])]);
    } else {
      onChange(value.filter((p) => p !== permission));
    }
  }

  return (
    <div className="space-y-2.5">
      {PERMISSION_ORDER.map((permission) => {
        const meta = PERMISSION_LABELS[permission];
        return (
          <label
            key={permission}
            className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={value.includes(permission)}
              onChange={(event) => toggle(permission, event.target.checked)}
              disabled={disabled}
            />
            <span>
              <span className="font-medium">{meta.label}</span>
              <span className="block text-xs text-muted-foreground">
                {meta.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}