import { Sprout } from 'lucide-react'

export const Footer = () => {
  return (
    <footer>
      <div className="footer-inner">
        <a href="#" className="nav-logo" style={{textDecoration:'none'}}>
          <div className="nav-logo-icon">
            <Sprout size={20} color="var(--accent)" strokeWidth={1.75} fill="var(--accent)" fillOpacity={0.2} />
          </div>
          <span className="nav-logo-text">Farm<span>Quest</span></span>
        </a>
        <ul className="footer-links">
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
        <p className="footer-copy">© 2025 FarmQuest. Grow something real.</p>
      </div>
    </footer>
  )
}
