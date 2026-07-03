"use client";

import React, { useState, useEffect, useRef } from 'react';

export interface SectionNavItem {
  id: string;
  label: string;
}

const DEFAULT_SECTIONS: SectionNavItem[] = [
  { id: 'section-kpi', label: 'KPIs' },
  { id: 'section-performance', label: 'Performance' },
  { id: 'section-daily', label: 'Daily Returns' },
  { id: 'section-stats', label: 'Stats' },
  { id: 'section-distribution', label: 'Distribution' },
  { id: 'section-swing', label: 'Swing' },
];

interface StickySectionNavProps {
  sections?: SectionNavItem[];
}

export const StickySectionNav: React.FC<StickySectionNavProps> = ({ sections = DEFAULT_SECTIONS }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const sectionElements = sections.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const intersectingMap = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        // If a user click-initiated smooth scroll is happening, ignore intermediate intersection events
        if (isScrollingRef.current) return;

        entries.forEach((entry) => {
          intersectingMap.set(entry.target.id, entry.isIntersecting);
        });

        // Determine active section: the first intersecting section in sections order
        const active = sections.find((s) => intersectingMap.get(s.id))?.id;
        if (active) {
          setActiveId(active);
        }
      },
      {
        root: null, // viewport
        rootMargin: '-20% 0px -50% 0px', // check when elements enter the middle of the viewport
        threshold: 0,
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      setActiveId(id);
      isScrollingRef.current = true;

      el.scrollIntoView({ behavior: 'smooth' });

      // Reset isScrollingRef flag after smooth scroll completes
      // A standard scroll duration is typically less than 800ms
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  };

  return (
    <nav className="floating-nav-wrapper no-print" aria-label="Section navigation">
      <div className="floating-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollTo(section.id)}
            className={`nav-item font-sans ${activeId === section.id ? 'active' : ''}`}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default StickySectionNav;
