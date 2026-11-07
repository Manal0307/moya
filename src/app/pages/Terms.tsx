import terms from "../data/commerce-terms.json";
export function Terms() {
  return (
    <div className="container page narrow">
      <div className="page-heading">
        <p className="eyebrow">Practical information</p>
        <h1>
          Terms &<br />
          <em>privacy.</em>
        </h1>
      </div>
      <div className="legal-copy">
        <p className="notice">
          Draft terms: seller details and legal review are pending.
        </p>
        {terms.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
