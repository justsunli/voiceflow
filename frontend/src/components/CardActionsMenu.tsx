import { useEffect, useId, useRef } from "react";

type MenuAction = {
  key: string;
  label: string;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
};

type CardActionsMenuProps = {
  open: boolean;
  triggerLabel: string;
  actions: MenuAction[];
  onToggle: () => void;
  onClose: () => void;
};

export function CardActionsMenu({
  open,
  triggerLabel,
  actions,
  onToggle,
  onClose,
}: CardActionsMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleDocumentMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return (
    <div className="card-menu-root" ref={rootRef}>
      <button
        className="card-menu-trigger"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={onToggle}
      >
        ⋮
      </button>
      {open ? (
        <div id={menuId} className="card-menu-popover" role="menu">
          {actions.map((action) => {
            const className = action.danger ? "card-menu-item danger" : "card-menu-item";
            if (action.href) {
              return (
                <a
                  key={action.key}
                  className={className}
                  role="menuitem"
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                >
                  {action.label}
                </a>
              );
            }
            return (
              <button
                key={action.key}
                className={className}
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  action.onSelect?.();
                  onClose();
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
