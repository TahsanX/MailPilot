import { useInView } from "../../hooks/useInView";

function Word({ children }) {
  const [ref, seen] = useInView({ threshold: 1, rootMargin: "0px 0px -35% 0px" });
  return (
    <span ref={ref} className={`reveal-word ${seen ? "reveal-word--on" : ""}`}>
      {children}{" "}
    </span>
  );
}

const LINES = [
  "Less time sorting email.",
  "More time doing meaningful work.",
];

/** Large benefit statement. Words reach full opacity in reading order as they scroll into view. */
export default function TaglineReveal() {
  return (
    <section className="tagline" aria-label="What MailPilot is for">
      <h2 className="tagline__text t-h3">
        {LINES.map((line) => (
          <span key={line} className="tagline__line">
            {line.split(" ").map((w, i) => (
              <Word key={`${w}-${i}`}>{w}</Word>
            ))}
          </span>
        ))}
      </h2>
    </section>
  );
}
