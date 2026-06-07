"use client";

import { useState, useTransition } from "react";
import { submitContactMessage } from "@/app/contact/actions";

type MorePanel = "contact" | "about" | "privacy";
type HoloIconName =
  | "battery"
  | "navigation"
  | "star"
  | "home"
  | "network"
  | "plug"
  | "id"
  | "location"
  | "database"
  | "shield"
  | "eye"
  | "user";

const panelContent: Record<
  Exclude<MorePanel, "contact">,
  {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  }
> = {
  about: {
    eyebrow: "About Us",
    title: "Powering Every EV Journey",
    body:
      "We are a group of engineering students who created software capable of helping EV drivers find charging stations quickly and confidently. Our platform also gives charger owners a way to provide a useful service and earn by allowing others to use their charging points.",
    points: [
      "Find nearby charging stations.",
      "Smart navigation to available chargers.",
      "Community ratings and reviews.",
      "Share your own charging station.",
      "A growing EV community.",
      "Our vision is to make EV charging simple, reliable, and accessible everywhere.",
    ],
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Your Privacy Powers Our Platform.",
    body:
      "At Find A Charger, we are committed to protecting your personal information and providing a safe experience for every driver. We collect only the information necessary to help you find charging stations, navigate efficiently, leave reviews, and share charging locations with the community. Your personal data is never sold to third parties, and location information is used only to improve your charging experience.",
    points: [
      "Secure account and login information.",
      "Responsible use of location data.",
      "Safe and transparent reviews.",
      "Protected charger-sharing features.",
      "Security-first platform design.",
      "We believe privacy should be simple, transparent, and trustworthy. Our goal is to create a secure community where EV drivers can connect, share charging stations, and travel with confidence.",
    ],
  },
};

const menuOptions: {
  id: MorePanel;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    id: "contact",
    icon: "@",
    title: "Contact Us",
    description: "Reach the team behind the charging experience.",
  },
  {
    id: "about",
    icon: "EV",
    title: "About Us",
    description: "Discover what drives Find A Charger Anywhere.",
  },
  {
    id: "privacy",
    icon: "SEC",
    title: "Privacy",
    description: "See how trust and data protection shape the platform.",
  },
];

const aboutCards = [
  {
    title: "Find nearby",
    detail: "charging stations",
    icon: "battery",
  },
  {
    title: "Smart navigation",
    detail: "to available chargers",
    icon: "navigation",
  },
  {
    title: "Community ratings",
    detail: "and reviews",
    icon: "star",
  },
  {
    title: "Share your station",
    detail: "with other drivers",
    icon: "home",
  },
  {
    title: "A growing EV",
    detail: "community",
    icon: "network",
  },
  {
    title: "Our vision",
    detail: "simple charging everywhere",
    icon: "plug",
  },
] satisfies { title: string; detail: string; icon: HoloIconName }[];

function HoloIcon({ name }: { name: HoloIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === "battery" && (
        <>
          <rect x="3" y="7" width="16" height="10" rx="2" {...common} />
          <path d="M21 11v3" {...common} />
          <path d="M7 12h5" {...common} />
        </>
      )}
      {name === "navigation" && (
        <>
          <path d="M12 3l7 18-7-4-7 4 7-18z" {...common} />
          <path d="M12 3v14" {...common} />
        </>
      )}
      {name === "star" && (
        <path
          d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3z"
          {...common}
        />
      )}
      {name === "home" && (
        <>
          <path d="M4 11l8-7 8 7" {...common} />
          <path d="M6 10v10h12V10" {...common} />
          <path d="M10 20v-6h4v6" {...common} />
        </>
      )}
      {name === "network" && (
        <>
          <circle cx="6" cy="7" r="2.5" {...common} />
          <circle cx="18" cy="7" r="2.5" {...common} />
          <circle cx="12" cy="18" r="2.5" {...common} />
          <path d="M8.2 8.7l3.1 5.8" {...common} />
          <path d="M15.8 8.7l-3.1 5.8" {...common} />
        </>
      )}
      {name === "plug" && (
        <>
          <path d="M9 3v6" {...common} />
          <path d="M15 3v6" {...common} />
          <path d="M7 9h10v4a5 5 0 0 1-10 0V9z" {...common} />
          <path d="M12 18v3" {...common} />
        </>
      )}
      {name === "id" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
          <circle cx="9" cy="11" r="2" {...common} />
          <path d="M7 16c.7-1.4 3.3-1.4 4 0" {...common} />
          <path d="M14 10h3" {...common} />
          <path d="M14 14h3" {...common} />
        </>
      )}
      {name === "location" && (
        <>
          <path d="M12 21s7-5.1 7-12a7 7 0 0 0-14 0c0 6.9 7 12 7 12z" {...common} />
          <circle cx="12" cy="9" r="2.5" {...common} />
        </>
      )}
      {name === "database" && (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="3" {...common} />
          <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" {...common} />
          <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" {...common} />
        </>
      )}
      {name === "shield" && (
        <>
          <path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z" {...common} />
          <path d="M9 12l2 2 4-5" {...common} />
        </>
      )}
      {name === "eye" && (
        <>
          <path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6z" {...common} />
          <circle cx="12" cy="12" r="2.5" {...common} />
        </>
      )}
      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" {...common} />
          <path d="M5 21c1.5-4 12.5-4 14 0" {...common} />
        </>
      )}
    </svg>
  );
}

export default function MoreMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<MorePanel | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactFeedback, setContactFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const [isContactPending, startContactTransition] = useTransition();
  const content =
    activePanel && activePanel !== "contact" ? panelContent[activePanel] : null;
  const shouldShowBackdrop = isOpen || Boolean(activePanel);

  function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactFeedback(null);
    startContactTransition(async () => {
      const result = await submitContactMessage({
        name: contactName,
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage,
      });

      if (result.error) {
        setContactFeedback({ message: result.error, ok: false });
        return;
      }

      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
      setContactFeedback({ message: "Message sent. The admin team can review it now.", ok: true });
    });
  }

  return (
    <div className={`more-dock${isOpen ? " is-open" : ""}`}>
      {!activePanel && (
        <button
          type="button"
          className="more-trigger"
          aria-expanded={isOpen}
          aria-controls="more-panel"
          onClick={() => {
            setIsOpen((current) => !current);
            setActivePanel(null);
          }}
        >
          <span>More</span>
          <span className="more-dock-icon" aria-hidden="true">
            +
          </span>
        </button>
      )}

      {shouldShowBackdrop && (
        <div
          className={`more-backdrop${content ? " is-soft" : ""}`}
          aria-hidden="true"
        />
      )}

      {isOpen && !content && (
        <>
          <section id="more-panel" className="more-panel" aria-label="More options">
            <p className="more-panel-label">Explore</p>
            <h2>More ways to connect</h2>
            <div className="more-options">
              {menuOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="more-option"
                  onClick={() => {
                    setIsOpen(false);
                    setActivePanel(option.id);
                  }}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  <div>
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {activePanel === "contact" && (
        <section
          className="more-modal contact-modal about-holo-modal"
          aria-label="Contact Us"
        >
          <button
            type="button"
            className="more-modal-close"
            aria-label="Back to more options"
            onClick={() => {
              setActivePanel(null);
              setIsOpen(true);
            }}
          >
            <span className="more-back-mark" aria-hidden="true">
              &lsaquo;
            </span>
          </button>
          <p className="more-modal-label">Contact Us</p>
          <h2>Tell us what you need.</h2>
          <p>
            Send a support request, station report, or question to the admin team.
          </p>

          <form className="contact-form" onSubmit={handleContactSubmit}>
            <div className="contact-form-row">
              <label>
                <span>Name</span>
                <input
                  type="text"
                  placeholder="Your name"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  maxLength={255}
                  required
                />
              </label>
            </div>

            <label>
              <span>Subject</span>
              <input
                type="text"
                placeholder="What is this about?"
                value={contactSubject}
                onChange={(event) => setContactSubject(event.target.value)}
                maxLength={160}
                required
              />
            </label>

            <label>
              <span>Message</span>
              <textarea
                placeholder="Write your message here..."
                rows={5}
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                maxLength={3000}
                required
              />
            </label>

            <div className="contact-form-footer">
              <p className={contactFeedback ? (contactFeedback.ok ? "contact-feedback-ok" : "contact-feedback-error") : ""}>
                {contactFeedback?.message ?? `${contactMessage.length}/3000`}
              </p>
              <button type="submit" disabled={isContactPending}>
                {isContactPending ? "Sending..." : "Submit Request"}
              </button>
            </div>
          </form>
        </section>
      )}

      {content && (
        <section
          className={`more-modal info-modal${
            activePanel === "about" || activePanel === "privacy"
              ? " about-holo-modal"
              : ""
          }`}
          aria-label={content.eyebrow}
        >
          <button
            type="button"
            className="more-modal-close"
            aria-label="Back to more options"
            onClick={() => {
              setActivePanel(null);
              setIsOpen(true);
            }}
          >
            <span className="more-back-mark" aria-hidden="true">
              &lsaquo;
            </span>
          </button>
          <p className="more-modal-label">{content.eyebrow}</p>
          <h2>{content.title}</h2>
          <p>{content.body}</p>
          {activePanel === "about" ? (
            <div className="about-holo-grid">
              {aboutCards.map((card) => (
                <article key={card.title} className="about-holo-card">
                  <span className="about-holo-dot" aria-hidden="true" />
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.detail}</p>
                  </div>
                  <span className="about-holo-icon" aria-hidden="true">
                    <HoloIcon name={card.icon} />
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="privacy-copy">
              <h3>What We Protect</h3>
              <ul className="privacy-word-list">
                {content.points.slice(0, 5).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <h3>Our Commitment</h3>
              <p>{content.points[5]}</p>
            </div>
          )}
          {activePanel !== "about" && activePanel !== "privacy" && (
            <ul className="info-modal-list">
              {content.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
