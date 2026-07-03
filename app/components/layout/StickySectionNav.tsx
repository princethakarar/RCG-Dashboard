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
    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // If at the absolute bottom of the page, activate the last section
      if (Math.ceil(scrollPosition + windowHeight) >= documentHeight - 50) {
        setActiveId(sections[sections.length - 1]?.id);
        return;
      }

      // Find the section that is currently passed the middle of the viewport
      let currentActive = sections[0]?.id;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the element's top is above the middle of the viewport
          if (rect.top <= windowHeight / 2) {
            currentActive = section.id;
          }
        }
      }
      
      if (currentActive) {
        setActiveId(currentActive);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Trigger once on mount to set initial state
    setTimeout(handleScroll, 100);

    return () => window.removeEventListener('scroll', handleScroll);
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
