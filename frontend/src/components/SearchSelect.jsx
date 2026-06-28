import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Search and select",
  required = false,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = normalizedQuery
      ? options.filter((option) => {
          const text = `${option.label} ${option.description || ""}`.toLowerCase();
          return text.includes(normalizedQuery);
        })
      : options;

    return source.slice(0, 8);
  }, [options, query]);

  useEffect(() => {
    setQuery(selectedOption?.label || "");
  }, [selectedOption]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.setCustomValidity(required && !value ? "Select an option from the list." : "");
  }, [required, value]);

  const selectOption = (option) => {
    onChange(String(option.value));
    setQuery(option.label);
    setIsOpen(false);
  };

  const updateMenuPosition = () => {
    if (!inputRef.current || typeof window === "undefined") return;

    const rect = inputRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const horizontalPadding = 12;
    const verticalGap = 8;
    const desiredHeight = Math.min(filteredOptions.length * 54 + 8, 256);
    const spaceBelow = viewportHeight - rect.bottom - verticalGap;
    const spaceAbove = rect.top - verticalGap;
    const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(256, openAbove ? spaceAbove : spaceBelow));
    const width = rect.width;
    const left = Math.min(Math.max(horizontalPadding, rect.left), viewportWidth - width - horizontalPadding);
    const top = openAbove
      ? Math.max(verticalGap, rect.top - Math.min(desiredHeight, maxHeight) - verticalGap)
      : rect.bottom + verticalGap;

    setMenuStyle({
      position: "fixed",
      left,
      top,
      width,
      maxHeight,
      zIndex: 9999,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen || disabled) return undefined;

    updateMenuPosition();

    const handleReposition = () => {
      updateMenuPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [disabled, filteredOptions.length, isOpen, query, value]);

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
    }
  }, [isOpen]);

  return (
    <div className="relative grid gap-1.5">
      <label>
        {label}
        <input
          ref={inputRef}
          required={required}
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange("");
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
      </label>

      {isOpen &&
        !disabled &&
        menuStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            style={{ ...menuStyle, textAlign: "left" }}
          >
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full flex-col items-start justify-start border-0 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  style={{ textAlign: "left" }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectOption(option);
                  }}
                >
                  <span className="block w-full text-left font-semibold leading-tight">{option.label}</span>
                  {option.description && (
                    <span className="block w-full text-left text-xs font-normal leading-tight text-slate-500">
                      {option.description}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">No matches found.</p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default SearchSelect;
