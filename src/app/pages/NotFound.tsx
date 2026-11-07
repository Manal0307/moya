import { Link } from "react-router";
export function NotFound() {
  return (
    <div className="container page empty-state">
      <p className="eyebrow">Error 404</p>
      <h1>
        This page has
        <br />
        <em>wandered off.</em>
      </h1>
      <p>The link may have changed. The collection is still here.</p>
      <Link to="/shop" className="button">
        Back to the collection
      </Link>
    </div>
  );
}
