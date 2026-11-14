type VerdictProps = {
  text: string;
  highlight?: string | null;
  className?: string;
};

const Verdict = ({ text, highlight, className }: VerdictProps) => {
  const term = highlight && text.includes(highlight) ? highlight : null;

  if (!term) return <p className={className}>{text}</p>;

  const [before, after] = text.split(term, 2);

  return (
    <p className={className}>
      {before}
      <span className="verdict-hl">{term}</span>
      {after}
    </p>
  );
};

export default Verdict;
