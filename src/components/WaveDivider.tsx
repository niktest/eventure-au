export function WaveDivider({ fill = "#ffffff" }: { fill?: string }) {
  return (
    <div className="w-full overflow-hidden leading-[0]" aria-hidden="true">
      <svg
        className="relative block w-full"
        style={{ height: "clamp(40px, 5vw, 80px)" }}
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
      >
        <path
          fill={fill}
          d="M0,30 C360,60 720,0 1080,30 C1260,45 1350,40 1440,30 L1440,60 L0,60 Z"
        />
      </svg>
    </div>
  );
}
