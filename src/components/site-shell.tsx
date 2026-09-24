import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const links = [["Services", "/services"], ["Gallery", "/gallery"], ["About", "/about"], ["FAQs", "/#faqs"], ["Contact", "/contact"]] as const;

export function Brand() { return <Link to="/" className="font-display text-xl text-foreground"><span className="font-semibold">TopSmiles</span><span className="text-primary">Nova</span></Link>; }
export function SiteShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = pathname.startsWith("/admin");
  if (admin) return <>{children}</>;
  return <div className="min-h-screen bg-background text-foreground">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          {links.map(([label, to]) => to.includes("#") ? <a key={label} href={to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</a> : <Link key={label} to={to} className="text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{label}</Link>)}
        </nav>
        <div className="hidden lg:block"><Button asChild size="lg"><Link to="/book">Book a consultation</Link></Button></div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
      </div>
      {open && <nav className="border-t border-border bg-background px-5 py-5 lg:hidden">{links.map(([label, to]) => to.includes("#") ? <a key={label} href={to} onClick={() => setOpen(false)} className="block border-b border-border py-3 text-sm">{label}</a> : <Link key={label} to={to} onClick={() => setOpen(false)} className="block border-b border-border py-3 text-sm">{label}</Link>)}<Button asChild className="mt-5 w-full" size="lg"><Link to="/book" onClick={() => setOpen(false)}>Book a consultation</Link></Button></nav>}
    </header>
    <main className="pt-20">{children}</main>
    <footer className="border-t border-border bg-surface px-5 py-12 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3"><div><Brand /><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Thoughtful smile consultations, designed around clear next steps and considered care.</p></div><div><p className="eyebrow">Explore</p><div className="mt-4 grid gap-2 text-sm"><Link to="/services">Services</Link><Link to="/gallery">Gallery</Link><Link to="/booking-policies">Booking policies</Link></div></div><div><p className="eyebrow">Contact</p><p className="mt-4 text-sm text-muted-foreground">Clinic address, phone, and hours are editable placeholders in this demo.</p></div></div><div className="mx-auto mt-10 flex max-w-7xl justify-between border-t border-border pt-6 text-xs text-muted-foreground"><span>© 2026 TopSmilesNova</span><Link to="/admin">Admin demo</Link></div></footer>
    <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden"><Button asChild size="lg" className="w-full shadow-2xl"><Link to="/book">Book a consultation</Link></Button></div>
  </div>;
}
