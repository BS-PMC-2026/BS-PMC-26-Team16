import Link from "next/link";

export default function Home() {
  return (
    <main className="opening-screen">
      <div className="opening-pattern" aria-hidden="true">
        <span className="opening-shape opening-shape-one" />
        <span className="opening-shape opening-shape-two" />
        <span className="opening-shape opening-shape-three" />
        <span className="opening-shape opening-shape-four" />
        <span className="opening-shape opening-shape-five" />
        <span className="opening-shape opening-shape-six" />
        <span className="opening-shape opening-shape-seven" />
      </div>

      <section className="opening-content" aria-labelledby="opening-title">
        <h1 id="opening-title" className="opening-title">
          <span>Find A Charger</span>
          <strong>Anywhere</strong>
        </h1>

        <div className="opening-actions">
          <Link href="/login" className="opening-login-button">
            Login
          </Link>

          <div className="opening-divider">
            <span />
            <p>Dont have a account?</p>
            <span />
          </div>

          <Link href="/register" className="opening-create-button">
            Create a Account
          </Link>
        </div>
      </section>
    </main>
  );
}
