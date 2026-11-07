import { Link, useLocation } from "react-router";
export function Information() {
  const privacy = useLocation().pathname === "/privacy";
  return (
    <section className="container page narrow information-page">
      <p className="eyebrow">{privacy ? "Your data" : "Your files"}</p>
      <h1>{privacy ? "Privacy." : "Downloads."}</h1>
      {privacy ? (
        <div className="legal-copy">
          <p className="notice">
            Draft information: seller identity, retention periods and privacy
            review must be completed before launch.
          </p>
          <section>
            <h2>What is saved</h2>
            <p>
              Contact messages include your name, email and enquiry. Orders
              contain purchase details, your email and the terms accepted at
              checkout. Admin access uses a session cookie; the shopping bag is
              saved in your browser.
            </p>
          </section>
          <section>
            <h2>Payments & emails</h2>
            <p>
              Payments are handled by Stripe. This site does not collect your
              card number. Delivery and recovery emails use Resend when email
              sending is enabled.
            </p>
          </section>
          <section>
            <h2>Questions about your data</h2>
            <p>
              Use the{" "}
              <Link className="text-link" to="/contact">
                contact form
              </Link>{" "}
              for a request about your personal data. The final privacy policy
              and seller contact details are pending.
            </p>
          </section>
        </div>
      ) : (
        <div className="legal-copy">
          <section>
            <h2>After payment</h2>
            <p>
              Once payment is confirmed, open your order page and download your
              STL. Save a copy on your device. No physical item is shipped.
            </p>
          </section>
          <section>
            <h2>Expired link?</h2>
            <p>
              Individual download links last five minutes. Use “Refresh download
              links” on your order page. Private order access lasts 24 hours;
              use “Recover download access” with the purchase email on that page
              to request a new access email.
            </p>
          </section>
          <section>
            <h2>Need help?</h2>
            <p>
              Check the{" "}
              <Link className="text-link" to="/faq">
                FAQ
              </Link>{" "}
              or{" "}
              <Link className="text-link" to="/contact">
                contact the studio
              </Link>{" "}
              with your order reference. Refunded orders no longer grant access
              to downloads.
            </p>
          </section>
        </div>
      )}
    </section>
  );
}
