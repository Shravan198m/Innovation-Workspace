const nainLinks = [
  { label: "About NAIN", href: "/nain" },
  { label: "Programs", href: "/project-details#features" },
  { label: "Mentorship", href: "/project-details#workflows" },
  { label: "Projects", href: "/projects" },
];

const socialLinks = [
  { label: "Facebook", short: "FB", href: "https://www.facebook.com" },
  { label: "Instagram", short: "IG", href: "https://www.instagram.com" },
  { label: "LinkedIn", short: "IN", href: "https://www.linkedin.com" },
  { label: "YouTube", short: "YT", href: "https://www.youtube.com" },
];

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 bg-[linear-gradient(135deg,#0B1F3A,#113766,#1d4e89)] text-white">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <section>
          <h3 className="mb-4 border-l-4 border-cyan-300 pl-3 text-lg font-semibold">Connect with Us</h3>
          <div className="mb-5 flex flex-wrap gap-2">
            {socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                aria-label={item.label}
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold transition hover:bg-white/20"
              >
                {item.short}
              </a>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/8 p-1 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
            <iframe
              title="Mangalore Institute of Technology and Engineering Map"
              src="https://maps.google.com/maps?q=Mangalore%20Institute%20of%20Technology%20and%20Engineering&t=&z=13&ie=UTF8&iwloc=&output=embed"
              className="h-44 w-full rounded-[14px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 border-l-4 border-cyan-300 pl-3 text-lg font-semibold">NAIN Links</h3>
          <ul className="space-y-2 text-sm text-slate-100/90">
            {nainLinks.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="transition hover:text-white hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-4 border-l-4 border-cyan-300 pl-3 text-lg font-semibold">Contact Info</h3>
          <div className="space-y-3 text-sm leading-6 text-slate-100/90">
            <p>
              NAIN - Mangalore Institute of Technology and Engineering
              <br />
              Moodabidre, DK District,
              <br />
              Karnataka - 574225
            </p>
            <p>Phone: +91 97417 31309</p>
            <p>Phone: +91 8258 262695</p>
            <p>
              Email: <a href="mailto:info@mite.ac.in" className="underline">info@mite.ac.in</a>
            </p>
            <p>
              Website: {" "}
              <a href="https://mite.ac.in/nain/" target="_blank" rel="noreferrer" className="underline">
                https://mite.ac.in/nain/
              </a>
            </p>
          </div>
        </section>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-sm text-slate-100/90 sm:px-6 lg:px-8">
        Copyright 2026 Shiktra Technologies. All rights reserved.
      </div>
    </footer>
  );
}

export function MinimalFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
        Copyright 2026 Shiktra Technologies. All rights reserved.
    </footer>
  );
}