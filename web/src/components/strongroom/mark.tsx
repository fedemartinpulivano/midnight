/** The Strongroom mark: a riveted square plate, a bevelled crown, a cross
 *  handle and a single accent pin at the hub. Two finishes — `face` sits on
 *  the lit steel of the safe door, `ui` on the dark chrome of a header. */
export function Mark({
  size = 24,
  variant = "ui",
}: {
  size?: number;
  variant?: "face" | "ui";
}) {
  const face = variant === "face";
  const plate = face ? "#767d92" : "#6a7186";
  const bright = face ? "#dfe3ee" : "#c9cede";
  const hub = face ? "#12141a" : "#0e1015";
  const weight = face ? 1.2 : 1.3;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="2.6"
        y="2.6"
        width="18.8"
        height="18.8"
        fill="none"
        stroke={plate}
        strokeWidth={weight}
      />
      <circle
        cx="12"
        cy="12"
        r="6.2"
        fill="none"
        stroke={bright}
        strokeWidth={weight}
      />
      <g stroke={bright} strokeWidth={weight} strokeLinecap="round">
        <path d="M12 4.4 V19.6" />
        <path d="M4.4 12 H19.6" />
      </g>
      <circle
        cx="12"
        cy="12"
        r="2.1"
        fill={hub}
        stroke={bright}
        strokeWidth={weight}
      />
      <circle cx="12" cy="12" r="0.9" fill="#9184d9" />
    </svg>
  );
}
