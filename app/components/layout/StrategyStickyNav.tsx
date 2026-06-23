"use client";

import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_SECTIONS = [
  { id: 'section-stats', label: 'Stats' },
  { id: 'section-performance', label: 'Performance' },
];

interface StrategyStickyNavProps {
  sections?: { id: string; label: string }[];
}

export const StrategyStickyNav: React.FC<StrategyStickyNavProps> = ({ sections = DEFAULT_SECTIONS }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id || '');
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const sectionElements = sections.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const intersectingMap = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;

        entries.forEach((entry) => {
          intersectingMap.set(entry.target.id, entry.isIntersecting);
        });

        const active = sections.find((s) => intersectingMap.get(s.id))?.id;
        if (active) {
          setActiveId(active);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -50% 0px',
        threshold: 0,
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      setActiveId(id);
      isScrollingRef.current = true;

      el.scrollIntoView({ behavior: 'smooth' });

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  };

  return (
    <nav className="floating-nav-wrapper no-print" aria-label="Strategy navigation">
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

export default StrategyStickyNav;
