import { useRef, useState } from "react";
import { Check, CheckCircle2, Copy } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CONTACT_EMAIL } from "../data/contact";
import { Arrow } from "../components/Arrow";
import { Star } from "../components/Star";
import "../../styles/studio-pages.css";

const EASE = [0.22, 1, 0.36, 1] as const;

// Each subject comes with one line of guidance shown under the choices.
const subjects = [
  {
    label: "Custom digital model",
    hint: "Describe the object, its size and how you’d like to use it.",
  },
  {
    label: "Model question",
    hint: "Name the model and tell us what you’d like to know.",
  },
  {
    label: "Order help",
    hint: "Include your order reference so it can be found quickly.",
  },
  {
    label: "Other question",
    hint: "Anything else, we read every message.",
  },
];

/**
 * Contact page, in two clear parts: who to reach (title, one line, the
 * email address) and a three-step form (subject, details, message).
 */
export function CustomOrder() {
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(subjects[0].label);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hint = subjects.find((s) => s.label === subject)?.hint ?? "";

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE, delay: 0.05 + i * 0.07 },
        };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (!r.ok)
        throw new Error(result.error ?? "Unable to submit your enquiry.");
      setReference(result.reference);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard blocked: the mailto link still works. */
    }
  }

  return (
    <div className="studio-page contact">
      {/* 1. Who to reach */}
      <header className="contact-intro">
        <motion.p className="studio-kicker" {...rise(0)}>
          Contact
        </motion.p>
        <motion.h1 {...rise(1)}>
          Say hello.
          <br />
          <span className="ab-title-soft">We reply by email.</span>
          <span className="ab-star" aria-hidden="true">
            <Star variant={3} />
          </span>
        </motion.h1>
        <motion.p className="contact-lead" {...rise(2)}>
          A question, an idea or help with an order: fill in the form and the
          studio replies by email.
        </motion.p>
        <motion.div className="contact-email" {...rise(3)}>
          <span className="contact-email-label">Or write directly</span>
          <div className="contact-email-row">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <button
              type="button"
              className="contact-copy"
              onClick={copyEmail}
              aria-label={copied ? "Email address copied" : "Copy email address"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? "done" : "copy"}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </motion.div>
      </header>

      {/* 2. The form, in three numbered steps */}
      <AnimatePresence mode="wait">
        {reference ? (
          <motion.div
            key="done"
            className="contact-card contact-success"
            role="status"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <motion.span
              initial={reduce ? false : { scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.15 }}
            >
              <CheckCircle2 size={40} />
            </motion.span>
            <h2>Your enquiry has been saved.</h2>
            <p>
              The studio can review your message and reply to the email address
              provided.
            </p>
            <p className="contact-reference">Reference · {reference}</p>
            <button
              className="button secondary"
              onClick={() => setReference("")}
            >
              Send another enquiry
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            ref={formRef}
            onSubmit={submit}
            className="contact-card contact-form"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          >
            <fieldset className="contact-step contact-subjects-step">
              <legend>
                <span className="step-number">01</span> What is it about?
              </legend>
              <div className="contact-subjects">
                {subjects.map(({ label }) => (
                  <label key={label}>
                    <input
                      type="radio"
                      name="subject"
                      value={label}
                      checked={subject === label}
                      onChange={() => setSubject(label)}
                    />
                    <span>
                      {subject === label && (
                        <motion.i
                          className="subject-pill"
                          layoutId="subject-pill"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          aria-hidden="true"
                        />
                      )}
                      <b>{label}</b>
                    </span>
                  </label>
                ))}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={hint}
                  className="contact-hint"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {hint}
                </motion.p>
              </AnimatePresence>
            </fieldset>

            <fieldset className="contact-step">
              <legend>
                <span className="step-number">02</span> Your details
              </legend>
              <div className="contact-row">
                <label>
                  Your name
                  <input name="name" autoComplete="name" required maxLength={120} />
                </label>
                <label>
                  Your email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="contact-step">
              <legend>
                <span className="step-number">03</span> Your message
              </legend>
              <textarea
                name="message"
                aria-label="Your message"
                rows={6}
                minLength={15}
                maxLength={5000}
                required
                placeholder="How can we help?"
              />
            </fieldset>

            <div className="honeypot" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p
                  className="error-message"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="contact-submit">
              <p>Your details are only used to reply to you.</p>
              <button className="button" disabled={busy}>
                {busy ? "Sending…" : "Send enquiry"}
                <Arrow />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
