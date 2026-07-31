export function SovereignMark({
  size = 42,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      className="sovereign-mark"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <path d="M24 23C21 13 14 8 5 8" />
      <path d="M24 23C27 13 34 8 43 8" />
      <path d="M4 44C4 31 12 23 24 23C36 23 44 31 44 44" />
      <circle
        className={inverted ? "mark-node inverted" : "mark-node"}
        cx="24"
        cy="23"
        r="3.5"
      />
    </svg>
  );
}
